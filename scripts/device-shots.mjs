/* Device-size screenshot matrix — repeatable mobile smoke check.
   Prereqs: dev server running (npx vite --port 5199) and Playwright available
   (npm i -D playwright, or a preinstalled Chromium via PW_CHROMIUM env).

     node scripts/device-shots.mjs
     → scripts/device-shots/<device>-<screen>.png

   Covers: smallest common phone (iPhone SE), current phones, tablet — each in
   landscape (menu, journey map, gameplay) plus one portrait shot that must
   show the rotate-device overlay. */
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, 'device-shots');
const BASE = process.env.GAME_URL || 'http://localhost:5199';

let chromium;
try { ({ chromium } = await import('playwright')); }
catch { console.error('Playwright missing: npm i -D playwright'); process.exit(1); }

/* landscape logical viewports (CSS px) + deviceScaleFactor */
const DEVICES = {
  'iphone-se': { w: 667, h: 375, dpr: 2 },
  'iphone-15': { w: 852, h: 393, dpr: 3 },
  'pixel-7': { w: 915, h: 412, dpr: 2.6 },
  'ipad': { w: 1180, h: 820, dpr: 2 },
};

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch(
  process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});

for (const [name, d] of Object.entries(DEVICES)) {
  const page = await browser.newPage({
    viewport: { width: d.w, height: d.h }, deviceScaleFactor: d.dpr,
    hasTouch: true, isMobile: true,
  });
  await page.addInitScript(() => {
    /* Submission QA must exercise the authored Meadow vertical slice, not a
       later generated level left unlocked by a developer save. */
    localStorage.setItem('ckk2_save_v2', JSON.stringify({ furthest: 0, journal: [], lang: 'tr' }));
  });
  await page.goto(BASE);
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/${name}-menu.png` });
  await page.click('#mMap');
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/${name}-map.png` });
  await page.click('.mNode.next');
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/${name}-game.png` });
  await page.close();
  console.log(`✓ ${name} (${d.w}×${d.h})`);
}

/* portrait: the rotate overlay must be covering everything */
const p = await browser.newPage({ viewport: { width: 393, height: 852 }, hasTouch: true, isMobile: true });
await p.goto(BASE);
await p.waitForTimeout(600);
const overlayShown = await p.$eval('#rotateHint', el => getComputedStyle(el).display !== 'none');
await p.screenshot({ path: `${OUT}/portrait-rotate-hint.png` });
console.log(`✓ portrait rotate overlay: ${overlayShown ? 'SHOWN' : 'MISSING — FIX'}`);
await browser.close();
if (!overlayShown) process.exit(1);
