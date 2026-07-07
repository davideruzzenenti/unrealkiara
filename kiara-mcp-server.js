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

// ── IDENTITÀ FISSA DI KIARA (preposta a ogni prompt) ────────────────────
const IDENTITY = [
  'Kiara',
  'young Italian woman virtual fashion influencer',
  'warm olive skin, dark chestnut hair flowing naturally',
  'delicate feminine features, natural minimal makeup',
  'slim elegant build, relaxed confident presence'
].join(', ');

const STYLE = [
  'minimalist Italian fashion editorial',
  'warm tones palette: ivory, peach, champagne, sand, cacao, coral',
  'soft natural light, photorealistic',
  'intimate diary mood, 1:1 square format'
].join(', ');

// ── IMMAGINE DI RIFERIMENTO ─────────────────────────────────────────────
let refImageBase64 = null;
try {
  const buf  = fs.readFileSync(REF_IMAGE_PATH);
  refImageBase64 = `data:image/jpeg;base64,${buf.toString('base64')}`;
  console.error('[Kiara MCP] Ref image loaded.');
} catch(e) {
  console.error('[Kiara MCP] Ref image not found — text-only mode:', e.message);
}

// ── REPLICATE: genera immagine ──────────────────────────────────────────
async function generateImage(scene, isTexture = false) {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) throw new Error('REPLICATE_API_TOKEN non configurato nel file claude_desktop_config.json');

  const prompt = isTexture
    ? `${scene}, ${STYLE}`
    : `${IDENTITY}, ${scene}, ${STYLE}`;

  console.error(`[Kiara MCP] → Replicate: "${scene.substring(0,60)}..."`);

  let url, input, res;

  if (!isTexture && refImageBase64) {
    // PuLID Flux — preserva identità del viso dalla reference image
    url = 'https://api.replicate.com/v1/models/zsxkib/pulid-flux/predictions';
    input = {
      prompt,
      main_face_image: refImageBase64,
      num_steps:       20,
      start_step:      0,
      guidance_scale:  4.0,
      true_cfg:        1.0,
      id_weight:       1.0,   // aumenta (max 3.0) per più fedeltà al viso
      width:           1024,
      height:          1024,
      output_format:   'webp',
      output_quality:  90
    };
  } else {
    // Texture/sfondi — Flux Schnell senza reference
    url = 'https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions';
    input = {
      prompt,
      aspect_ratio:   '1:1',
      output_format:  'webp',
      output_quality: 90,
      num_outputs:    1
    };
  }

  res = await fetch(url, {
      method:  'POST',
      headers: {
        'Authorization': `Token ${token}`,
        'Content-Type':  'application/json',
        'Prefer':        'wait'
      },
      body: JSON.stringify({ input })
    });

  const result = await res.json();
  if (result.status !== 'succeeded' || !result.output?.[0]) {
    throw new Error(`Replicate ${result.status}: ${JSON.stringify(result.error || 'no output')}`);
  }

  console.error(`[Kiara MCP] ✓ ${result.output[0]}`);
  return result.output[0];
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
