/* Level audit harness — the before/after evidence tool.

   Drives the real build through every level via the `?test` hook, screenshots
   each level at four camera positions, dumps a machine-readable structural
   report, records console errors, and measures the rAF frame rate.

   Prereqs: a dev server (npm run dev, or `npx vite --port 5199`) and Playwright
   browsers (`npx playwright install chromium`).

     GAME_URL=http://127.0.0.1:5199 node scripts/level-audit.mjs
     OUT=docs/evidence/after node scripts/level-audit.mjs

   Output: <OUT>/L01-0.png … L10-3.png, 00-menu.png, 00-map.png,
           <OUT>/level-report.json  (structure + console errors + fps)

   This never mutates gameplay state that persists: it teleports the camera and
   the player for framing only, and each level is (re)started fresh first. */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.GAME_URL || 'http://127.0.0.1:5199';
const OUT = path.resolve(process.env.OUT || path.join(__dirname, '..', 'docs', 'evidence', 'current'));
const CAMERA_STOPS = [0, 0.33, 0.66, 0.98];

let chromium;
try { ({ chromium } = await import('playwright')); }
catch { console.error('Playwright missing: npm i -D playwright && npx playwright install chromium'); process.exit(1); }

await mkdir(OUT, { recursive: true });

const browser = await chromium.launch(
  process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
const page = await browser.newPage({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 1 });

const consoleErrors = [];
page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', e => consoleErrors.push(`pageerror: ${e.message}`));

/* A fully unlocked, fully learned save so every level and every clue tier is
   reachable — the audit must see the real content, not the locked shell. */
await page.addInitScript(() => localStorage.setItem('ckk2_save_v2', JSON.stringify({
  furthest: 10, lang: 'en',
  journal: ['meşe', 'çınar', 'ıhlamur', 'çam', 'servi', 'huş', 'akçaağaç',
    'söğüt', 'ginkgo', 'zeytin', 'kestane', 'kayın', 'kavak'],
})));
await page.goto(`${BASE}/?test`, { waitUntil: 'networkidle' });
await page.waitForTimeout(700);
await page.screenshot({ path: path.join(OUT, '00-menu.png') });
await page.evaluate(() => window.__ckk.ui.showMap());
await page.waitForTimeout(700);
await page.screenshot({ path: path.join(OUT, '00-map.png') });

const levels = [];
const levelCount = await page.evaluate(() => window.__ckk.levelCount?.() ?? 10);

for (let idx = 0; idx < levelCount; idx++) {
  await page.evaluate(i => window.__ckk.startLevel(i), idx);
  await page.waitForTimeout(500);

  levels.push({
    idx,
    ...await page.evaluate(() => {
      const s = window.__ckk.getScene(), L = s.L;
      return {
        name: L.name, w: L.w, biome: L.biome, dark: !!L.dark,
        platforms: L.platforms.length,
        interact: L.interact.map(i => i.type),
        monsters: L.monsters.map(m => ({ type: m.type || 'walker', spd: m.spd, aggro: m.aggro })),
        boss: L.boss ? { kind: L.boss.kind, finisher: L.boss.finisher, hp: L.boss.hp, cageEye: L.boss.cageEye } : null,
        trees: L.trees.map(t => t.id),
        checkpoints: L.checkpoints.length,
        intros: L.intros.length,
        sandMax: s.sandMax,
        objective: document.getElementById('objectiveBar')?.textContent.trim() ?? '',
      };
    }),
  });

  for (let k = 0; k < CAMERA_STOPS.length; k++) {
    await page.evaluate(({ frac }) => {
      const s = window.__ckk.getScene();
      const maxCam = Math.max(0, s.L.w - 960);
      s.cam = maxCam * frac;
      s.player.x = Math.min(s.L.w - 60, s.cam + 460);
      const under = s.L.platforms.find(p => s.player.x + 20 > p.x && s.player.x < p.x + p.w);
      s.player.y = (under ? under.y : 360) - s.player.h;
      s.player.vx = 0; s.player.vy = 0;
      s.cameras.main.setScroll(s.cam, 0);
      /* Frame the boss on the final stop so the audit sees it at all. */
      if (s.L.boss && frac > 0.9) { s.bossActive = true; s.L.boss.state = 'idle'; }
      s.draw();
    }, { frac: CAMERA_STOPS[k] });
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(OUT, `L${String(idx + 1).padStart(2, '0')}-${k}.png`) });
  }
}

/* Frame rate on the widest level — a floor, not a device measurement. */
await page.evaluate(n => window.__ckk.startLevel(n), levelCount - 1);
await page.waitForTimeout(400);
const fps = await page.evaluate(() => new Promise(resolve => {
  let frames = 0; const t0 = performance.now();
  const tick = () => {
    frames++;
    if (performance.now() - t0 < 3000) requestAnimationFrame(tick);
    else resolve(frames / ((performance.now() - t0) / 1000));
  };
  requestAnimationFrame(tick);
}));

const report = { generatedFrom: BASE, viewport: '960x540', fps: Number(fps.toFixed(1)), consoleErrors, levels };
await writeFile(path.join(OUT, 'level-report.json'), JSON.stringify(report, null, 2));

const uniqueObjectives = new Set(levels.map(l => l.objective));
console.log(`✓ ${levelCount} levels captured → ${OUT}`);
console.log(`  fps ${report.fps} · console errors ${consoleErrors.length} · distinct objective bars ${uniqueObjectives.size}/${levelCount}`);
if (consoleErrors.length) { console.error('✗ console errors:', consoleErrors); }

await browser.close();
if (consoleErrors.length) process.exit(1);
