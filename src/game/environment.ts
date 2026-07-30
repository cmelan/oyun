/* ENVIRONMENT — draws a biome's SceneryProfile.

   Replaces the three-stop gradient and two rows of ellipses that stood in for
   nine of the ten biomes. Everything here is screen-space: the background layer
   has scrollFactor 0, so world position is derived as `screenX + camera * parallax`.
   That is what lets a distant ridge crawl while the foreground fringe overtakes
   the player.

   Nothing drawn here is ever collidable. Decoration must not change game rules. */
import type { Graphics } from './engine';
import { hexToNum } from './engine';
import type { BiomePalette } from '../core/biomes';
import type { CloudBand, Fringe, RidgeLayer, SceneryProfile, SurfaceKind, CoverKind } from '../core/scenery';
import { hash01, ridgeHeight } from '../core/scenery';

/* A silhouette every 9px reads as a smooth line at 960 wide while keeping the
   point count — and so the per-frame allocation — modest. */
const RIDGE_STEP = 9;

/* Reused across frames so a horizon costs one array, not one per frame. Safe
   because ops are recorded and replayed within a single frame, and each ridge
   index owns its own buffer. */
const ridgeBuffers: number[][] = [];
function bufferFor(index: number): number[] {
  let b = ridgeBuffers[index];
  if (!b) { b = []; ridgeBuffers[index] = b; }
  b.length = 0;
  return b;
}

/* ---------------- sky ---------------- */

export function drawSky(
  g: Graphics, profile: SceneryProfile, palette: BiomePalette,
  cameraX: number, W: number, H: number, time: number,
): void {
  g.fillGradientStyle(hexToNum(palette.skyTop), hexToNum(palette.skyTop), hexToNum(palette.skyMid), hexToNum(palette.skyBot), 1);
  g.fillRect(0, 0, W, H);

  const c = profile.celestial;
  if (c.kind !== 'none') {
    /* Three nested falloffs, not a disc. A hard-edged opaque circle reads as a
       UI dot pasted on the sky; a sun is mostly bloom. */
    const breathe = 1 + Math.sin(time * .5) * .03;
    g.fillStyle(hexToNum(c.halo), 1);
    g.fillRadial(c.x, c.y, c.haloR * breathe, [[0, .34], [.35, .15], [1, 0]]);
    if (c.r > 0) {
      g.fillStyle(hexToNum(c.core), 1);
      g.fillRadial(c.x, c.y, c.r * 2.6, [[0, .55], [.4, .28], [1, 0]]);
      g.fillRadial(c.x, c.y, c.r * 1.05, [[0, .92], [.72, .78], [1, 0]]);
    }
  }

  for (const band of profile.clouds) drawCloudBand(g, band, cameraX, W, time);
}

/** Atmospheric band, drawn BETWEEN ridge layers rather than over all of them.
 *  Painted on top of everything it hazed the whole horizon flat; between the
 *  far and mid ranks it does its actual job — pushing distance back while the
 *  near silhouette stays crisp. */
function drawHaze(g: Graphics, profile: SceneryProfile, W: number): void {
  if (!profile.haze) return;
  const { y, color, alpha } = profile.haze;
  const col = hexToNum(color);
  /* Two stacked bands approximate a vertical falloff without a gradient op. */
  g.fillStyle(col, alpha * .55);
  g.fillRect(0, y - 74, W, 52);
  g.fillStyle(col, alpha);
  g.fillRect(0, y - 22, W, 74);
}

function drawCloudBand(g: Graphics, band: CloudBand, cameraX: number, W: number, time: number): void {
  const drift = time * 5 * band.parallax;
  const offset = -(((cameraX * band.parallax) + drift) % band.gap);
  g.fillStyle(hexToNum(band.color), band.alpha);
  for (let x = offset - band.gap; x < W + band.gap; x += band.gap) {
    const i = Math.round((x - offset) / band.gap);
    const jitter = hash01(i + band.seed) * 46 - 23;
    const cx = x + jitter, cy = band.y + hash01(i * 3.1 + band.seed) * 18 - 9;
    const s = band.scale * (.78 + hash01(i * 7.7 + band.seed) * .5);
    if (band.shape === 'puff') {
      g.fillEllipse(cx, cy, 150 * s, 52 * s);
      g.fillEllipse(cx - 46 * s, cy + 8 * s, 96 * s, 40 * s);
      g.fillEllipse(cx + 52 * s, cy + 6 * s, 108 * s, 44 * s);
      g.fillEllipse(cx + 6 * s, cy - 18 * s, 86 * s, 44 * s);
    } else if (band.shape === 'streak') {
      g.fillEllipse(cx, cy, 300 * s, 22 * s);
      g.fillEllipse(cx + 70 * s, cy + 9 * s, 180 * s, 14 * s);
    } else {
      g.fillEllipse(cx, cy, 380 * s, 13 * s);
    }
  }
}

/* ---------------- ridges ---------------- */

export function drawRidges(g: Graphics, profile: SceneryProfile, cameraX: number, W: number, H: number): void {
  profile.ridges.forEach((layer, i) => {
    drawRidge(g, layer, i, cameraX, W, H);
    /* Haze sits immediately behind the nearest rank: distance recedes, the
       silhouette the child actually reads stays sharp. */
    if (i === profile.ridges.length - 2) drawHaze(g, profile, W);
  });
  if (profile.ridges.length < 2) drawHaze(g, profile, W);
}

function drawRidge(g: Graphics, layer: RidgeLayer, index: number, cameraX: number, W: number, H: number): void {
  const offset = cameraX * layer.parallax;
  const pts = bufferFor(index);
  pts.push(-RIDGE_STEP, H + 10);
  for (let sx = -RIDGE_STEP; sx <= W + RIDGE_STEP; sx += RIDGE_STEP) {
    const wx = (sx + offset) / layer.wavelength;
    pts.push(sx, layer.baseY - ridgeHeight(layer.shape, wx, layer.seed) * layer.amp);
  }
  pts.push(W + RIDGE_STEP, H + 10);
  g.fillStyle(hexToNum(layer.color), layer.alpha);
  g.fillPolygon(pts);
}

/* ---------------- platform surface + collision-top cover ---------------- */

export function drawPlatformSurface(
  g: Graphics, kind: SurfaceKind, palette: BiomePalette,
  x: number, y: number, w: number, h: number,
): void {
  const soil = hexToNum(palette.soil), dark = hexToNum(palette.soilDark);
  g.fillStyle(soil, 1);
  g.fillRoundedRect(x, y, w, h, 8);

  switch (kind) {
    case 'rock': {
      /* Blocky courses with a darker joint — reads as cut stone, not a slab. */
      g.fillStyle(dark, .55);
      for (let row = 0, yy = y + 22; yy < y + h; yy += 34, row++) {
        for (let xx = x + 6 + (row % 2 ? 30 : 0); xx < x + w - 10; xx += 62) {
          g.fillRoundedRect(xx, yy, Math.min(52, x + w - 10 - xx), 26, 5);
        }
      }
      break;
    }
    case 'strata': {
      g.fillStyle(dark, .38);
      for (let i = 0, yy = y + 26; yy < y + h; yy += 18, i++) {
        g.fillRect(x + 3, yy, w - 6, i % 2 ? 9 : 5);
      }
      break;
    }
    case 'sand': {
      g.fillStyle(dark, .22);
      for (let yy = y + 28; yy < y + h; yy += 22) g.fillRect(x + 4, yy, w - 8, 7);
      g.fillStyle(hexToNum(palette.grassLight), .16);
      for (let yy = y + 36; yy < y + h; yy += 22) g.fillRect(x + 10, yy, w - 20, 3);
      break;
    }
    case 'peat': {
      g.fillStyle(dark, .5);
      g.fillRect(x + 4, y + 24, w - 8, Math.max(0, h - 28));
      g.fillStyle(soil, .5);
      for (let xx = x + 12; xx < x + w - 8; xx += 17) {
        const len = 22 + hash01(xx) * 40;
        g.fillRect(xx, y + 30, 3, len);
      }
      break;
    }
    case 'crystal': {
      g.fillStyle(dark, .6);
      for (let xx = x + 4; xx < x + w - 8; xx += 46) {
        const t = 20 + hash01(xx * .7) * 26;
        g.fillTriangle(xx, y + 20, xx + 44, y + 20, xx + 22, y + 20 + t);
      }
      g.fillStyle(hexToNum(palette.grassLight), .14);
      for (let xx = x + 16; xx < x + w - 12; xx += 92) g.fillRect(xx, y + 26, 4, Math.max(0, h - 40));
      break;
    }
    case 'soil':
    default: {
      g.fillStyle(dark, 1);
      g.fillRect(x + 4, y + 22, w - 8, Math.max(0, h - 26));
      g.fillStyle(soil, .45);
      for (let xx = x + 14; xx < x + w - 10; xx += 39) {
        g.fillEllipse(xx, y + 44 + (hash01(xx) * 30), 16, 9);
      }
    }
  }
}

export function drawGroundCover(
  g: Graphics, kind: CoverKind, palette: BiomePalette,
  x: number, y: number, w: number, time: number, rim: string,
): void {
  const grass = hexToNum(palette.grass), light = hexToNum(palette.grassLight);
  switch (kind) {
    case 'snow': {
      g.fillStyle(0xffffff, 1);
      g.fillRoundedRect(x, y - 9, w, 21, { tl: 10, tr: 10, bl: 0, br: 0 });
      g.fillStyle(0xdfeef7, .8);
      for (let xx = x + 12; xx < x + w - 10; xx += 54) g.fillEllipse(xx, y + 12, 30, 11);
      break;
    }
    case 'sand': {
      g.fillStyle(light, 1);
      g.fillRoundedRect(x, y, w, 13, { tl: 7, tr: 7, bl: 0, br: 0 });
      g.fillStyle(hexToNum(rim), .3);
      for (let xx = x + 10; xx < x + w - 8; xx += 30) g.fillEllipse(xx, y + 4, 20, 4);
      break;
    }
    case 'pebble': {
      g.fillStyle(grass, 1);
      g.fillRoundedRect(x, y, w, 12, { tl: 6, tr: 6, bl: 0, br: 0 });
      g.fillStyle(light, .9);
      for (let xx = x + 8; xx < x + w - 6; xx += 21) {
        g.fillCircle(xx, y + 3 + hash01(xx) * 3, 2.4 + hash01(xx * 3) * 2.2);
      }
      break;
    }
    case 'moss': {
      g.fillStyle(grass, 1);
      g.fillRoundedRect(x, y - 3, w, 17, { tl: 9, tr: 9, bl: 0, br: 0 });
      g.fillStyle(light, .85);
      for (let xx = x + 7; xx < x + w - 6; xx += 19) {
        g.fillEllipse(xx, y - 2 + hash01(xx) * 4, 15, 8);
      }
      break;
    }
    case 'reed': {
      g.fillStyle(grass, 1);
      g.fillRoundedRect(x, y, w, 14, { tl: 7, tr: 7, bl: 0, br: 0 });
      g.fillStyle(light, .95);
      for (let xx = x + 9; xx < x + w - 8; xx += 23) {
        const sway = Math.sin(time * 1.4 + xx * .05) * 3;
        g.fillTriangle(xx - 2, y + 2, xx + 2, y + 2, xx + sway, y - 21 - hash01(xx) * 12);
      }
      break;
    }
    case 'crystal': {
      g.fillStyle(grass, 1);
      g.fillRoundedRect(x, y, w, 12, { tl: 5, tr: 5, bl: 0, br: 0 });
      g.fillStyle(light, .95);
      for (let xx = x + 11; xx < x + w - 9; xx += 37) {
        const t = 10 + hash01(xx * 1.3) * 14;
        g.fillTriangle(xx - 5, y + 2, xx + 5, y + 2, xx, y - t);
      }
      break;
    }
    case 'blossom': {
      g.fillStyle(grass, 1);
      g.fillRoundedRect(x, y - 2, w, 16, { tl: 8, tr: 8, bl: 0, br: 0 });
      g.fillStyle(light, .9);
      for (let xx = x + 8; xx < x + w - 7; xx += 17) g.fillRect(xx, y - 4, 5, 6);
      g.fillStyle(0xffd7e4, .95);
      for (let xx = x + 15; xx < x + w - 10; xx += 46) g.fillCircle(xx, y - 5 + hash01(xx) * 3, 3);
      break;
    }
    case 'grass':
    default: {
      g.fillStyle(grass, 1);
      g.fillRoundedRect(x, y, w, 15, { tl: 8, tr: 8, bl: 0, br: 0 });
      g.fillStyle(light, 1);
      for (let xx = x + 6; xx < x + w - 6; xx += 15) {
        const blade = 6 + hash01(xx) * 9;
        const sway = Math.sin(time * 1.1 + xx * .04) * 1.6;
        g.fillTriangle(xx, y + 3, xx + 5, y + 3, xx + 2.5 + sway, y - blade);
      }
    }
  }
  /* A one-pixel warm lip along the collision top: the single cheapest cue that
     tells a child exactly where the floor is. */
  g.fillStyle(hexToNum(rim), .34);
  g.fillRect(x, y - 1, w, 2);
}

/* ---------------- foreground fringe ---------------- */

export function drawFringe(
  g: Graphics, fringe: Fringe | null, cameraX: number, levelW: number,
  W: number, H: number, time: number,
): void {
  if (!fringe) return;
  for (let worldX = -60, i = 0; worldX < levelW + fringe.stride; worldX += fringe.stride, i++) {
    const screenX = worldX - cameraX * fringe.parallax;
    if (screenX < -260 || screenX > W + 260) continue;
    const scale = .8 + hash01(i + fringe.seed) * .5;
    drawFringeCluster(g, fringe, screenX, H, scale, time, i);
  }
}

function drawFringeCluster(
  g: Graphics, fringe: Fringe, x: number, H: number, scale: number, time: number, i: number,
): void {
  const h = fringe.height * scale;
  const sway = Math.sin(time * .7 + i) * 3;
  g.fillStyle(hexToNum(fringe.color), fringe.alpha);
  switch (fringe.kind) {
    case 'fern':
      for (let k = -3; k <= 3; k++) {
        const a = k * .34, len = h * (1 - Math.abs(k) * .11);
        g.fillTriangle(x - 10, H + 6, x + 10, H + 6, x + Math.sin(a) * len * .85 + sway, H + 6 - Math.cos(a) * len);
      }
      break;
    case 'reed':
      for (let k = -4; k <= 4; k++) {
        const len = h * (.6 + hash01(i * 5 + k) * .55);
        g.fillTriangle(x + k * 11 - 3, H + 6, x + k * 11 + 3, H + 6, x + k * 11 + sway * .6, H + 6 - len);
      }
      break;
    case 'palm': {
      /* A palm is a leaning tapered trunk under a crown of fronds that arc up
         and then fall under their own weight. Straight lines and flat wedges
         read as an arrow on a pole, which is what the first two attempts drew. */
      const crownY = H + 8 - h, lean = sway * .8;
      g.fillPolygon([
        x - 8, H + 10,
        x - 4 + lean * .5, crownY + h * .45,
        x - 3.5 + lean, crownY + 4,
        x + 3.5 + lean, crownY + 4,
        x + 4 + lean * .5, crownY + h * .45,
        x + 8, H + 10,
      ]);

      const cx = x + lean, cy = crownY + 2, FRONDS = 7, SEGMENTS = 5;
      for (let f = 0; f < FRONDS; f++) {
        const angle = -Math.PI + (f + .5) * (Math.PI / FRONDS);
        const outward = Math.abs(Math.cos(angle));           /* 1 at the sides, 0 overhead */
        const len = h * (.30 + .26 * outward);
        const droop = h * (.10 + .40 * outward);
        const pts: number[] = [];
        const at = (t: number) => {
          const px = cx + Math.cos(angle) * len * t;
          const py = cy + Math.sin(angle) * len * t * .75 + droop * t * t;
          return [px, py, 6.5 * (1 - t * .85) + 1] as const;
        };
        for (let i = 0; i <= SEGMENTS; i++) { const [px, py, wdt] = at(i / SEGMENTS); pts.push(px, py - wdt); }
        for (let i = SEGMENTS; i >= 0; i--) { const [px, py, wdt] = at(i / SEGMENTS); pts.push(px, py + wdt); }
        g.fillPolygon(pts);
      }
      g.fillCircle(cx, cy, 7);
      break;
    }
    case 'crystal':
      for (let k = -2; k <= 2; k++) {
        const len = h * (.45 + hash01(i * 3 + k) * .7);
        g.fillTriangle(x + k * 25 - 13, H + 6, x + k * 25 + 13, H + 6, x + k * 25, H + 6 - len);
      }
      break;
    case 'branch':
      g.fillRect(x - 4, H - h * .3, 8, h * .3 + 8);
      for (let k = 0; k < 5; k++) {
        const yy = H - h * .3 + k * 6;
        g.fillEllipse(x + (k % 2 ? 1 : -1) * (26 + k * 9) + sway, yy - 22 - k * 5, 62, 24);
      }
      break;
    case 'grass':
    default:
      for (let k = -5; k <= 5; k++) {
        const len = h * (.42 + hash01(i * 7 + k) * .62);
        g.fillTriangle(x + k * 13 - 5, H + 6, x + k * 13 + 5, H + 6, x + k * 13 + sway, H + 6 - len);
      }
  }
}

/* ---------------- ambient motes ----------------
   Finally consumes BIOME.ambientA / ambientB / ambientShape, authored when the
   biomes were written and wired to nothing until now. */

export function drawAmbient(
  g: Graphics, profile: SceneryProfile, palette: BiomePalette,
  cameraX: number, W: number, H: number, time: number, reducedMotion: boolean,
): void {
  const count = reducedMotion ? Math.ceil(profile.ambient.count * .3) : profile.ambient.count;
  const colA = hexToNum(palette.ambientA), colB = hexToNum(palette.ambientB);
  for (let i = 0; i < count; i++) {
    const seed = i * 13.7;
    const speed = profile.ambient.drift * (.5 + hash01(seed) * 1.1);
    const span = W + 160;
    const x = ((hash01(seed + 1) * span) + time * speed - cameraX * .35) % span - 80;
    const bobY = Math.sin(time * .6 + i) * 12;
    const y = (hash01(seed + 2) * (H - 90) + 40 + bobY - time * profile.ambient.rise) % (H - 40);
    const yy = y < 0 ? y + (H - 40) : y;
    const r = 1.6 + hash01(seed + 3) * 2.6;
    g.fillStyle(i % 2 ? colA : colB, .28 + hash01(seed + 4) * .34);
    switch (palette.ambientShape) {
      case 'leaf':
        g.fillEllipse(x, yy, r * 3.4, r * 1.7);
        break;
      case 'petal':
        g.fillEllipse(x, yy, r * 2.6, r * 2.0);
        break;
      case 'snow':
      case 'mote':
        g.fillCircle(x, yy, r);
        break;
      case 'wisp':
      default:
        g.fillEllipse(x, yy, r * 6, r * .9);
    }
  }
}
