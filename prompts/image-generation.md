# Note tecniche — generazione immagine

## Pipeline attuale

- Motore: `openai/gpt-image-2` via Replicate (cambiato da PuLID Flux il 2026-09-16,
  non ancora validato con un confronto lato-a-lato)
- Formato output: 1:1, webp, compressione 85
- Reference image: `img/ref-face-front.jpg`, caricata su Replicate Files API al
  primo utilizzo e passata come `input_images`
- Codice: `kiara-mcp-server.js` (tool MCP per Claude Desktop), `creator-server.js` /
  `kiara-imagegen-workflow.json` (n8n, pipeline parallela con PuLID/Flux — non
  ancora allineata al nuovo motore)

## Gap risolti (2026-09-16)

1. ~~`kiara-mcp-server.js` descriveva una persona diversa dalla ref image~~ —
   `IDENTITY` ora è allineato al blocco verificato in
   [system-prompt.md](system-prompt.md) (biondo caldo corto, pelle chiara,
   lentiggini).
2. ~~Solo `ref-face-front.jpg` veniva passata al modello~~ — `ref-body-sheet.png`
   ora viene caricata e passata insieme alla ref volto in `input_images` per ogni
   generazione non-texture.

## Gap noti (non ancora risolti)

1. Nessun confronto salvato tra le pipeline provate (PuLID Flux vs gpt-image-2) su
   scene identiche — ogni switch di motore è deciso "a naso".

## Uso del system prompt

Ogni generazione persona = blocco SYSTEM (sempre) + blocco FORMAT (uno dei sei) +
scena specifica. Per shot senza persona (`pillar: texture`, formati Voce/Muse) il
blocco SYSTEM identità va omesso — solo stile e palette restano.
