/* Capture the award slice and build Shipaton's exact 1179×2556 frameless image.
   Run with the dev server active. PW_CHROMIUM may point at an existing binary. */
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'docs', 'submission', 'media');
const base = process.env.GAME_URL || 'http://127.0.0.1:5173';
await mkdir(out, { recursive: true });

const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
const page = await browser.newPage({ viewport: { width: 1179, height: 663 }, deviceScaleFactor: 1 });
await page.addInitScript(() => localStorage.setItem('ckk2_save_v2', JSON.stringify({ furthest: 1, journal: ['meşe'], lang: 'en' })));

async function capture(name, url) {
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  const target = path.join(out, `${name}.png`);
  await page.screenshot({ path: target });
  return target;
}

const menu = await capture('01-entrance', `${base}/?test`);
const dormant = await capture('02-oak-dormant', `${base}/?test&stage=oak-dormant`);
const awake = await capture('03-oak-awake', `${base}/?test&stage=oak-awake`);
await browser.close();

const copy = Buffer.from(`<svg width="1179" height="1230" xmlns="http://www.w3.org/2000/svg">
  <defs><filter id="s"><feDropShadow dx="0" dy="5" stdDeviation="7" flood-opacity=".28"/></filter></defs>
  <rect width="1179" height="1230" fill="#163d3b"/>
  <circle cx="590" cy="245" r="160" fill="#254f47"/>
  <text x="590" y="480" text-anchor="middle" fill="#ffe29a" font-family="Georgia,serif" font-size="68" font-weight="700" filter="url(#s)">Kindness changes the world.</text>
  <text x="590" y="575" text-anchor="middle" fill="#fff9e9" font-family="Arial,sans-serif" font-size="42" font-weight="700">Observe · understand · restore</text>
  <text x="590" y="672" text-anchor="middle" fill="#cbe8d8" font-family="Arial,sans-serif" font-size="31">A non-violent nature adventure for young hearts.</text>
  <rect x="160" y="790" width="859" height="118" rx="59" fill="#f4b566"/>
  <text x="590" y="865" text-anchor="middle" fill="#563415" font-family="Arial,sans-serif" font-size="42" font-weight="800">ÇOK KALPLİ KORUYUCU</text>
  <text x="590" y="1035" text-anchor="middle" fill="#fff9e9" font-family="Arial,sans-serif" font-size="29">Turkish · English · German</text>
  <text x="590" y="1090" text-anchor="middle" fill="#a9d7c3" font-family="Arial,sans-serif" font-size="25">No ads. No violence. One honest family unlock.</text>
</svg>`);

await sharp({ create: { width: 1179, height: 2556, channels: 3, background: '#163d3b' } })
  .composite([
    { input: menu, top: 0, left: 0 },
    { input: awake, top: 663, left: 0 },
    { input: copy, top: 1326, left: 0 },
    { input: path.join(root, 'public', 'icons', 'icon-192.png'), top: 1400, left: 493 },
  ])
  .png({ compressionLevel: 9 })
  .toFile(path.join(out, 'shipaton-1179x2556.png'));

console.log(`Captured ${menu}`);
console.log(`Captured ${dormant}`);
console.log(`Captured ${awake}`);
console.log(`Built ${path.join(out, 'shipaton-1179x2556.png')}`);
