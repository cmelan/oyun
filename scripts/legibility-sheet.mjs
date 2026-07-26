/* Legibility contact sheet — the project-mandated check that card art stays
   readable at real in-game sizes. Renders every photo in public/photos plus
   every species' vector fallback note into one HTML page at the two sizes the
   game actually uses (58px choice card, 120px clue badge).

     node scripts/legibility-sheet.mjs
     → open scripts/legibility-sheet.html in a browser

   Verify: similarly-shaped species (e.g. kayın/kestane leaves, çam/ladin
   needles) must be distinguishable at 58px BEFORE committing new photos. */
import { readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PHOTOS = path.join(__dirname, '..', 'public', 'photos');
const OUT = path.join(__dirname, 'legibility-sheet.html');

const files = (await readdir(PHOTOS)).filter(f => f.endsWith('.webp')).sort();
const bySpecies = {};
for (const f of files) {
  const m = f.match(/^(.+)_(leaf|bark|tree)\.webp$/);
  if (!m) continue;
  (bySpecies[m[1]] = bySpecies[m[1]] || {})[m[2]] = f;
}

const cell = (sp, kind, size) => {
  const f = bySpecies[sp][kind];
  return f
    ? `<img src="../public/photos/${f}" style="width:${size}px;height:${size}px;object-fit:cover;border-radius:${size / 4}px" title="${sp} ${kind}">`
    : `<span class="miss" style="width:${size}px;height:${size}px">vektör</span>`;
};

const rows = Object.keys(bySpecies).sort().map(sp => `
  <tr><th>${sp}</th>
    ${['leaf', 'bark', 'tree'].map(k => `<td>${cell(sp, k, 58)}</td>`).join('')}
    ${['leaf', 'bark', 'tree'].map(k => `<td>${cell(sp, k, 120)}</td>`).join('')}
  </tr>`).join('');

await writeFile(OUT, `<!doctype html><meta charset="utf-8">
<title>Kart okunabilirlik — 58px / 120px</title>
<style>
  body{font-family:system-ui;background:#fff7ec;color:#1f4d4a;padding:20px}
  table{border-collapse:collapse} th,td{padding:6px 10px;text-align:center;border-bottom:1px solid #e0d5c0}
  th{text-align:right} .miss{display:inline-flex;align-items:center;justify-content:center;background:#eee;border-radius:10px;font-size:10px;color:#999}
  caption{font-weight:bold;padding:8px}
</style>
<table>
  <caption>seçim kartı (58px) · ipucu rozeti (120px) — benzer türler bir bakışta ayırt edilebilmeli</caption>
  <tr><th></th><th>🍃58</th><th>🪵58</th><th>🌳58</th><th>🍃120</th><th>🪵120</th><th>🌳120</th></tr>
  ${rows}
</table>`);
console.log(`Wrote ${OUT} — open it in a browser and check every row at 58px.`);
