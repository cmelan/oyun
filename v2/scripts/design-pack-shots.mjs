/* Generate the designer reference screenshot set → docs/design-pack/screens/.
   Prereqs: dev server (npx vite --port 5199) + Playwright (PW_CHROMIUM env or
   npm i -D playwright). JPEG q80 keeps the pack lightweight.

     node scripts/design-pack-shots.mjs */
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '..', '..', 'docs', 'design-pack', 'screens');
const BASE = process.env.GAME_URL || 'http://localhost:5199';

let chromium;
try { ({ chromium } = await import('playwright')); }
catch { console.error('Playwright missing: npm i -D playwright'); process.exit(1); }

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch(
  process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
const page = await browser.newPage({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 2 });
await page.addInitScript(() => {
  localStorage.setItem('ckk2_save_v2', JSON.stringify({ furthest: 9, journal: ['meşe', 'çınar', 'ıhlamur'], lang: 'tr' }));
});
await page.goto(BASE + '/?test');
await page.waitForTimeout(800);
const shot = (name) => page.screenshot({ path: `${OUT}/${name}.jpg`, type: 'jpeg', quality: 80 });

await shot('01-menu');
await page.click('#mMap'); await page.waitForTimeout(600);
await shot('02-journey-map');

/* one gameplay shot per region/biome */
const REGIONS = ['cayir', 'zirveler', 'magara', 'kestane', 'toros', 'meyve', 'akdeniz', 'karadeniz', 'gol', 'usta'];
for (let i = 0; i < 10; i++) {
  await page.evaluate((idx) => window.__ckk.startLevel(idx), i);
  await page.waitForTimeout(300);
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(1100);
  await page.keyboard.up('ArrowRight');
  await page.waitForTimeout(250);
  await shot(`${String(i + 3).padStart(2, '0')}-biome-${REGIONS[i]}`);
}

/* quiz cards: all three clue tiers + wake + journal */
await page.evaluate(() => window.__ckk.ui.showTreeQuestion('meşe', ['meşe', 'çınar', 'ıhlamur'], 'leaf'));
await page.waitForTimeout(400); await shot('13-quiz-leaf');
await page.evaluate(() => window.__ckk.ui.showTreeQuestion('elma', ['elma', 'kiraz', 'ceviz'], 'bark'));
await page.waitForTimeout(400); await shot('14-quiz-bark');
await page.evaluate(() => window.__ckk.ui.showTreeQuestion('ladin', ['ladin', 'fındık', 'kayın'], 'silhouette'));
await page.waitForTimeout(400); await shot('15-quiz-silhouette');
await page.evaluate(() => window.__ckk.ui.showTreeWake('meşe', () => {}));
await page.waitForTimeout(500); await shot('16-tree-wake');
await page.evaluate(() => { window.__ckk.ui.hideOverlay(); window.__ckk.ui.showMenu(); });
await page.waitForTimeout(300);
await page.click('#mJournal'); await page.waitForTimeout(500);
await shot('17-journal');

/* character + node icon close-ups on a neutral board */
await page.evaluate(() => {
  const art = window.__ckk.art;
  document.body.innerHTML = `<div style="display:flex;gap:40px;align-items:center;justify-content:center;height:100vh;background:#fff7ec">
    <img src="${art.guardianBadge(220)}">
    <img src="${art.getTreeIcon('meşe', 160, true)}">
    <img src="${art.getTreeIcon('çam', 160, true)}">
    <img src="${art.getTreeSilhouette('akçaağaç', 160)}">
  </div>`;
});
await page.waitForTimeout(300); await shot('18-character-and-icons');

await browser.close();
console.log(`Wrote screenshots to ${OUT}`);
