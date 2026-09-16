#!/usr/bin/env node
/**
 * Kiara MCP Server
 * Connette Claude Desktop alla generazione immagini Kiara via Replicate.
 *
 * Configura Claude Desktop — file:
 *   C:\Users\arzig\AppData\Roaming\Claude\claude_desktop_config.json
 *
 * {
 *   "mcpServers": {
 *     "kiara": {
 *       "command": "node",
 *       "args": ["C:/Users/arzig/OneDrive/Desktop/unrealkiara/kiara-mcp-server.js"],
 *       "env": { "REPLICATE_API_TOKEN": "r8_xxxxxxxxxxxx" }
 *     }
 *   }
 * }
 *
 * Poi riavvia Claude Desktop. In chat comparirà il tool 🔨 Kiara.
 */

const { Server }             = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
const fs   = require('fs');
const path = require('path');

// ── PERCORSI ────────────────────────────────────────────────────────────
const PROJECT_DIR    = __dirname;
const OUTPUT_DIR     = path.join(PROJECT_DIR, 'img', 'generated');
const REF_IMAGE_PATH = path.join(PROJECT_DIR, 'img', 'ref-face-front.jpg');
const REF_BODY_PATH  = path.join(PROJECT_DIR, 'img', 'ref-body-sheet.png');

// ── IDENTITÀ FISSA DI KIARA (preposta a ogni prompt) ────────────────────
// Verificata contro img/ref-face-front.jpg — vedi brand/identity.md
const IDENTITY = [
  'Kiara',
  'virtual (AI) influencer, female',
  'warm-blonde short textured hair, never perfect',
  'brown eyes, large, slightly off-camera gaze',
  'light skin with faint freckles, natural soft makeup',
  'soft proportionate build, never statuesque',
  'slow unhurried presence, older-sister energy, never a catalogue pose'
].join(', ');

const STYLE = [
  'minimalist Italian fashion editorial',
  'warm tones palette: ivory, peach, champagne, sand, cacao, coral',
  'soft natural light, photorealistic',
  'intimate diary mood, 1:1 square format'
].join(', ');

// ── IMMAGINI DI RIFERIMENTO ──────────────────────────────────────────────
// Caricate su Replicate Files API al primo uso (URL, non base64)
let refImageUrl = null;
let refBodyUrl  = null;

async function uploadRefImage(token, filePath, filename, mimeType) {
  if (!fs.existsSync(filePath)) return null;
  console.error(`[Kiara MCP] Carico ${filename} su Replicate Files...`);

  const buf  = fs.readFileSync(filePath);
  const blob = new Blob([buf], { type: mimeType });
  const form = new FormData();
  form.append('content', blob, filename);

  const res  = await fetch('https://api.replicate.com/v1/files', {
    method:  'POST',
    headers: { 'Authorization': `Token ${token}` },
    body:    form
  });
  const data = await res.json();
  const url  = data.urls?.get || null;
  if (url) console.error(`[Kiara MCP] ${filename} URL: ${url}`);
  else     console.error(`[Kiara MCP] Upload ${filename} fallito:`, JSON.stringify(data));
  return url;
}

// ── OPENAI GPT-IMAGE-2 via Replicate ───────────────────────────────────
async function generateImage(scene, isTexture = false) {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) throw new Error('REPLICATE_API_TOKEN non configurato nel file claude_desktop_config.json');

  // Upload ref images la prima volta (poi usa URL cachati)
  if (!isTexture && !refImageUrl) {
    try { refImageUrl = await uploadRefImage(token, REF_IMAGE_PATH, 'ref-face-front.jpg', 'image/jpeg'); } catch(e) {
      console.error('[Kiara MCP] Upload ref-face fallito, procedo senza:', e.message);
    }
  }
  if (!isTexture && !refBodyUrl) {
    try { refBodyUrl = await uploadRefImage(token, REF_BODY_PATH, 'ref-body-sheet.png', 'image/png'); } catch(e) {
      console.error('[Kiara MCP] Upload ref-body fallito, procedo senza:', e.message);
    }
  }

  const prompt = isTexture
    ? `${scene}, ${STYLE}`
    : `${IDENTITY}, ${scene}, ${STYLE}`;

  const input = {
    prompt,
    aspect_ratio:       '1:1',
    output_format:      'webp',
    number_of_images:   1,
    quality:            'auto',
    background:         'auto',
    moderation:         'auto',
    output_compression: 85
  };

  if (!isTexture) {
    const refs = [refImageUrl, refBodyUrl].filter(Boolean);
    if (refs.length) input.input_images = refs;
  }

  console.error(`[Kiara MCP] → gpt-image-2: "${scene.substring(0, 60)}..."`);

  // Crea prediction (polling — gpt-image-2 impiega ~40s)
  const createRes = await fetch(
    'https://api.replicate.com/v1/models/openai/gpt-image-2/predictions',
    {
      method:  'POST',
      headers: { 'Authorization': `Token ${token}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ input })
    }
  );

  const prediction = await createRes.json();
  if (!prediction.id) {
    console.error('[Kiara MCP] Create error:', JSON.stringify(prediction, null, 2));
    throw new Error(`Replicate create error: ${JSON.stringify(prediction)}`);
  }
  console.error(`[Kiara MCP] ⏳ Prediction ${prediction.id} — attendo...`);

  // Polling max 3 minuti
  let result;
  for (let i = 0; i < 90; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
      headers: { 'Authorization': `Token ${token}` }
    });
    result = await pollRes.json();
    console.error(`[Kiara MCP] ... ${result.status}`);
    if (['succeeded', 'failed', 'canceled'].includes(result.status)) break;
  }

  if (result.status !== 'succeeded') {
    console.error(`[Kiara MCP] FAIL:`, JSON.stringify(result, null, 2));
    throw new Error(`Replicate ${result.status}: ${JSON.stringify(result.error || 'timeout/failed')}`);
  }

  const outputUrl = Array.isArray(result.output) ? result.output[0] : result.output;
  if (!outputUrl) throw new Error(`Output vuoto: ${JSON.stringify(result)}`);

  console.error(`[Kiara MCP] ✓ ${outputUrl}`);
  return outputUrl;
}

async function downloadImage(url, filepath) {
  const res    = await fetch(url);
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.mkdirSync(path.dirname(filepath), { recursive: true });
  fs.writeFileSync(filepath, buffer);
}

// ── MCP SERVER ──────────────────────────────────────────────────────────
const server = new Server(
  { name: 'kiara', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

// ── LISTA TOOL ──────────────────────────────────────────────────────────
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'genera_immagine_kiara',
      description: 'Genera una singola immagine di Kiara via Replicate Flux. Il blocco identità (chi è Kiara, palette, stile) viene incluso automaticamente — tu passa solo la descrizione della scena.',
      inputSchema: {
        type: 'object',
        properties: {
          scene: {
            type: 'string',
            description: 'Descrizione della scena, outfit o momento. Solo questa parte varia per ogni immagine.'
          },
          pillar: {
            type: 'string',
            enum: ['ritual', 'world', 'outfit', 'muse', 'texture'],
            description: 'Pillar del contenuto. texture = sfondo senza persona.'
          },
          nome_file: {
            type: 'string',
            description: 'Nome del file senza estensione (es. "kiara-ritual-lunedi"). Opzionale.'
          }
        },
        required: ['scene', 'pillar']
      }
    },
    {
      name: 'genera_batch_kiara',
      description: 'Genera più immagini di Kiara in sequenza. Passale come array. Usa questo per generare 10-30 immagini in una volta sola.',
      inputSchema: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            description: 'Array di immagini da generare, ognuna con scene + pillar.',
            items: {
              type: 'object',
              properties: {
                scene:     { type: 'string', description: 'Descrizione scena' },
                pillar:    { type: 'string', enum: ['ritual','world','outfit','muse','texture'] },
                nome_file: { type: 'string', description: 'Nome file (opzionale)' }
              },
              required: ['scene', 'pillar']
            }
          }
        },
        required: ['items']
      }
    },
    {
      name: 'lista_immagini_kiara',
      description: 'Elenca le immagini generate salvate in img/generated/. Filtrabile per pillar.',
      inputSchema: {
        type: 'object',
        properties: {
          pillar: {
            type: 'string',
            description: 'Filtra per pillar (opzionale). Lascia vuoto per vedere tutto.'
          }
        }
      }
    }
  ]
}));

// ── GESTIONE CHIAMATE ───────────────────────────────────────────────────
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  // ── genera_immagine_kiara ──
  if (name === 'genera_immagine_kiara') {
    const { scene, pillar, nome_file } = args;
    const isTexture = pillar === 'texture';
    const slug      = nome_file || `kiara-${pillar}-${Date.now()}`;
    const filepath  = path.join(OUTPUT_DIR, `${slug}.webp`);

    const imageUrl = await generateImage(scene, isTexture);
    await downloadImage(imageUrl, filepath);

    return {
      content: [{
        type: 'text',
        text: [
          `✅ Immagine generata: **${slug}.webp**`,
          `📁 Percorso: ${filepath}`,
          ``,
          `**Prompt usato:**`,
          isTexture
            ? `${scene}\n... + [STYLE]`
            : `[IDENTITY], ${scene}\n... + [STYLE]`
        ].join('\n')
      }]
    };
  }

  // ── genera_batch_kiara ──
  if (name === 'genera_batch_kiara') {
    const { items } = args;
    const results   = [];

    for (let i = 0; i < items.length; i++) {
      const { scene, pillar, nome_file } = items[i];
      const isTexture = pillar === 'texture';
      const slug      = nome_file || `kiara-${pillar}-${String(i + 1).padStart(2, '0')}`;
      const filepath  = path.join(OUTPUT_DIR, `${slug}.webp`);

      console.error(`[Kiara MCP] Batch ${i + 1}/${items.length}: ${slug}`);
      try {
        const url = await generateImage(scene, isTexture);
        await downloadImage(url, filepath);
        results.push({ slug, status: 'ok' });
      } catch(e) {
        console.error(`[Kiara MCP] Error on ${slug}:`, e.message);
        results.push({ slug, status: 'error', error: e.message });
      }
    }

    const ok   = results.filter(r => r.status === 'ok').length;
    const lines = results.map(r =>
      r.status === 'ok' ? `✅ ${r.slug}.webp` : `❌ ${r.slug}: ${r.error}`
    );

    return {
      content: [{
        type: 'text',
        text: [
          `**Batch completato: ${ok}/${items.length} immagini.**`,
          `📁 Cartella: ${OUTPUT_DIR}`,
          ``,
          ...lines
        ].join('\n')
      }]
    };
  }

  // ── lista_immagini_kiara ──
  if (name === 'lista_immagini_kiara') {
    const { pillar } = args || {};

    if (!fs.existsSync(OUTPUT_DIR)) {
      return { content: [{ type: 'text', text: 'Nessuna immagine ancora. Cartella img/generated/ non esiste — generane una prima.' }] };
    }

    const files = fs.readdirSync(OUTPUT_DIR)
      .filter(f => /\.(webp|png|jpg)$/.test(f))
      .filter(f => !pillar || f.includes(pillar))
      .sort();

    return {
      content: [{
        type: 'text',
        text: files.length
          ? `**${files.length} immagini** in img/generated/${pillar ? ` (filtro: ${pillar})` : ''}:\n\n${files.join('\n')}`
          : `Nessuna immagine trovata${pillar ? ` per il pillar "${pillar}"` : ''}.`
      }]
    };
  }

  throw new Error(`Tool sconosciuto: ${name}`);
});

// ── AVVIO ───────────────────────────────────────────────────────────────
const transport = new StdioServerTransport();
server.connect(transport).then(() => {
  console.error('[Kiara MCP Server] Pronto. Strumenti: genera_immagine_kiara | genera_batch_kiara | lista_immagini_kiara');
});
