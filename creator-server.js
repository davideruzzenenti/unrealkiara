#!/usr/bin/env node
/**
 * Kiara Creator API
 * Renders Instagram posts to PNG via Puppeteer.
 *
 * POST /render        { format, fields, imageBase64? }  → { png: base64 }
 * POST /render-batch  { slides: [{format,fields,imageBase64?}] }  → { pngs: [base64] }
 * GET  /health        → { ok: true }
 *
 * Run: node creator-server.js
 * Requires: npm install express puppeteer
 */

const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
app.use(express.json({ limit: '100mb' }));

// ── UTILS ──────────────────────────────────────────────────────────────
function esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function br(s){ return esc(s).replace(/\n/g,'<br>'); }
function markCoral(text, word){
  if(!word||!word.trim()) return esc(text);
  const w = esc(word.trim()).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  return esc(text).replace(new RegExp('('+w+')','gi'),'<span style="color:#E97962">$1</span>');
}

// ── TEMPLATES (identical logic to creator.html) ────────────────────────
function getTemplate(format, f, img){
  f = f || {};
  const imgBg = img ? `background-image:url(${img});background-size:cover;background-position:center` : '';
  const grd   = 'background:linear-gradient(150deg,#F5B895,#F2A878)';

  switch(String(format).toLowerCase()){

    case 'voce': {
      const quote = f.quote || 'Sono fatta di pixel. Il caldo sulla pelle no — quello è tuo.';
      const coral = f.coral || '';
      const sig   = f.sig   || 'Kiara';
      const dark  = f.bg === 'dark' || f.bg === '1' || f.bg === 1;
      const bg    = dark ? '#5D463B' : '#FFF8EE';
      const fg    = dark ? '#FFF8EE' : '#5D463B';
      const sub   = dark ? 'rgba(255,248,238,.32)' : 'rgba(93,70,59,.30)';
      const tag   = dark ? 'rgba(255,248,238,.18)' : 'rgba(93,70,59,.15)';
      return `<div style="width:1080px;height:1080px;background:${bg};display:flex;flex-direction:column;justify-content:center;align-items:center;padding:120px;position:relative">
        <div style="position:absolute;top:64px;left:72px;font-size:20px;letter-spacing:.22em;text-transform:uppercase;font-weight:700;font-family:'Manrope',sans-serif;color:${tag}">Voce</div>
        <div style="font-family:'Fraunces',serif;font-style:italic;font-size:62px;line-height:1.25;color:${fg};text-align:center;margin-bottom:56px">${markCoral(quote,coral)}</div>
        <div style="font-size:24px;font-weight:500;font-family:'Manrope',sans-serif;color:${sub};letter-spacing:.08em">— ${esc(sig)}</div>
      </div>`;
    }

    case 'muse': {
      const title  = f.title  || 'Sera.';
      const vol    = f.vol    || 'Vol. 01';
      const season = f.season || 'Stagione · Estate';
      const idx    = f.idx    || '01 / 06';
      return `<div style="width:1080px;height:1080px;background:#5D463B;display:flex;flex-direction:column;justify-content:space-between;padding:72px;font-family:'Manrope',sans-serif">
        <div style="font-size:20px;letter-spacing:.22em;text-transform:uppercase;font-weight:700;color:rgba(255,248,238,.18)">Muse</div>
        <div>
          <div style="font-family:'Fraunces',serif;font-weight:500;font-size:130px;line-height:.92;color:#F5B895">${esc(title)}</div>
          <div style="font-family:'Fraunces',serif;font-style:italic;font-size:34px;color:#D8B88A;margin-top:26px">${esc(vol)}</div>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:flex-end">
          <div style="font-size:19px;letter-spacing:.16em;text-transform:uppercase;font-weight:600;color:rgba(255,248,238,.18)">${esc(season)}</div>
          <div style="font-size:19px;font-weight:700;color:rgba(255,248,238,.18)">${esc(idx)}</div>
        </div>
      </div>`;
    }

    case 'world': {
      const caption = f.caption || '';
      const place   = f.place   || '';
      const bg = img ? imgBg : 'background:#D8B88A';
      return `<div style="width:1080px;height:1080px;position:relative;overflow:hidden;font-family:'Manrope',sans-serif">
        <div style="position:absolute;inset:0;${bg}"></div>
        <div style="position:absolute;top:0;left:0;right:0;height:280px;background:linear-gradient(to bottom,rgba(93,70,59,.52),transparent)"></div>
        <div style="position:absolute;bottom:0;left:0;right:0;height:440px;background:linear-gradient(to top,rgba(93,70,59,.82),transparent)"></div>
        <div style="position:absolute;top:64px;left:72px;font-size:20px;letter-spacing:.22em;text-transform:uppercase;font-weight:700;color:rgba(255,248,238,.55)">World</div>
        <div style="position:absolute;bottom:92px;left:72px;right:72px;font-family:'Fraunces',serif;font-style:italic;font-size:56px;line-height:1.25;color:#FFF8EE">${br(caption)}</div>
        <div style="position:absolute;bottom:50px;left:72px;font-size:20px;color:rgba(255,248,238,.48);font-weight:600;letter-spacing:.08em">${esc(place)}</div>
      </div>`;
    }

    case 'drop': {
      const release = f.release || '';
      const price   = f.price   || '';
      const cta     = f.cta     || 'SHOP';
      const bg = img ? imgBg : grd;
      return `<div style="width:1080px;height:1080px;position:relative;overflow:hidden;font-family:'Manrope',sans-serif">
        <div style="position:absolute;inset:0;${bg}"></div>
        <div style="position:absolute;top:0;left:0;right:0;height:290px;background:linear-gradient(to bottom,rgba(93,70,59,.44),transparent)"></div>
        <div style="position:absolute;bottom:0;left:0;right:0;height:330px;background:linear-gradient(to top,rgba(93,70,59,.88),transparent)"></div>
        <div style="position:absolute;top:64px;left:72px;font-size:20px;letter-spacing:.22em;text-transform:uppercase;font-weight:700;color:rgba(255,248,238,.55)">Drop</div>
        <div style="position:absolute;top:64px;right:72px;font-family:'Fraunces',serif;font-style:italic;font-size:28px;color:rgba(255,248,238,.65)">${esc(release)}</div>
        <div style="position:absolute;bottom:64px;left:72px;right:72px;display:flex;align-items:center;justify-content:space-between">
          <div style="font-family:'Fraunces',serif;font-weight:600;font-size:78px;color:#FFF8EE">${esc(price)}</div>
          <div style="background:#E97962;color:#fff;font-weight:800;font-size:28px;padding:20px 44px;border-radius:60px;letter-spacing:.04em">commenta ${esc(cta)} →</div>
        </div>
      </div>`;
    }

    case 'ritual': {
      const time  = f.time  || '07:22';
      const diary = f.diary || '';
      const day   = f.day   || '001';
      const hasImg = !!img;
      const bg = hasImg ? imgBg : 'background:#F7F0E6';
      const ov = hasImg ? 'rgba(93,70,59,.30)' : 'rgba(93,70,59,.05)';
      const tc = hasImg ? 'rgba(255,248,238,.88)' : '#5D463B';
      const fc = hasImg ? 'rgba(255,248,238,.42)' : 'rgba(93,70,59,.38)';
      return `<div style="width:1080px;height:1080px;position:relative;overflow:hidden;font-family:'Manrope',sans-serif">
        <div style="position:absolute;inset:0;${bg}"></div>
        <div style="position:absolute;inset:0;background:${ov}"></div>
        <div style="position:absolute;top:68px;left:72px;font-size:30px;font-weight:800;color:#E97962;letter-spacing:.1em">${esc(time)}</div>
        <div style="position:absolute;bottom:96px;left:72px;right:72px;font-family:'Fraunces',serif;font-style:italic;font-size:44px;color:${tc};line-height:1.35">${br(diary)}</div>
        <div style="position:absolute;bottom:52px;left:72px;font-size:22px;color:${fc};font-weight:600;letter-spacing:.1em">— diario · giorno ${esc(day)}</div>
      </div>`;
    }

    case 'duet': {
      const caption = f.caption || '';
      const brand   = f.brand   || '';
      const bg = img ? imgBg : grd;
      return `<div style="width:1080px;height:1080px;position:relative;overflow:hidden;font-family:'Manrope',sans-serif">
        <div style="position:absolute;inset:0;${bg}"></div>
        <div style="position:absolute;bottom:0;left:0;right:0;height:480px;background:linear-gradient(to top,rgba(93,70,59,.82),transparent)"></div>
        <div style="position:absolute;top:64px;left:72px;font-size:20px;letter-spacing:.22em;text-transform:uppercase;font-weight:700;color:rgba(255,248,238,.55)">Duet</div>
        <div style="position:absolute;bottom:128px;left:72px;right:72px;font-family:'Fraunces',serif;font-style:italic;font-size:52px;color:#FFF8EE;line-height:1.25">${br(caption)}</div>
        <div style="position:absolute;bottom:64px;left:72px;display:inline-block;border:1.5px solid rgba(255,248,238,.28);border-radius:40px;padding:10px 26px;font-size:20px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,248,238,.50)">in collaboration with ${esc(brand)}</div>
      </div>`;
    }

    default:
      return `<div style="width:1080px;height:1080px;background:#F7F0E6;display:flex;align-items:center;justify-content:center;font-size:32px;color:#9A8171;font-family:sans-serif">Unknown format: ${esc(format)}</div>`;
  }
}

function buildPage(format, fields, imageBase64){
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,400;1,9..144,500&family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>*{margin:0;padding:0;box-sizing:border-box}html,body{width:1080px;height:1080px;overflow:hidden}</style>
</head>
<body>${getTemplate(format, fields, imageBase64)}</body>
</html>`;
}

// ── PUPPETEER (singleton browser) ──────────────────────────────────────
let _browser = null;
async function getBrowser(){
  if(_browser && _browser.isConnected()) return _browser;
  _browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--font-render-hinting=none',
      '--disable-web-security'
    ]
  });
  return _browser;
}

async function renderHTML(html){
  const browser = await getBrowser();
  const page = await browser.newPage();
  await page.setViewport({ width:1080, height:1080, deviceScaleFactor:1 });
  await page.setContent(html, { waitUntil:'networkidle0' });
  await new Promise(r => setTimeout(r, 700)); // extra time for font render
  const buf = await page.screenshot({ type:'png', clip:{x:0,y:0,width:1080,height:1080} });
  await page.close();
  return buf.toString('base64');
}

// ── ROUTES ─────────────────────────────────────────────────────────────

// Single post
app.post('/render', async (req, res) => {
  try {
    const { format, fields={}, imageBase64=null } = req.body;
    if(!format) return res.status(400).json({error:'format is required'});
    const html = buildPage(format, fields, imageBase64);
    const png  = await renderHTML(html);
    res.json({ png, format });
  } catch(e){
    console.error('[/render]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Batch / carousel: array of slides → array of PNGs in order
app.post('/render-batch', async (req, res) => {
  try {
    const { slides } = req.body;
    if(!Array.isArray(slides) || slides.length === 0)
      return res.status(400).json({error:'slides array is required'});
    const pngs = [];
    for(const slide of slides){
      const { format, fields={}, imageBase64=null } = slide;
      const html = buildPage(format, fields, imageBase64);
      pngs.push(await renderHTML(html));
    }
    res.json({ pngs, count: pngs.length });
  } catch(e){
    console.error('[/render-batch]', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.get('/health', (_,res) => res.json({ ok:true, version:'1.0', port:PORT }));

const PORT = process.env.PORT || 3031;
app.listen(PORT, () => {
  console.log(`\nKiara Creator API`);
  console.log(`Running on http://localhost:${PORT}`);
  console.log(`POST /render        — single post`);
  console.log(`POST /render-batch  — carousel (array of slides)`);
  console.log(`GET  /health        — status\n`);
});
