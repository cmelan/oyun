/* SCENERY — per-biome environment identity, as data.

   Sits next to BIOME (src/core/biomes.ts): palettes say what colour a biome is,
   profiles say what it is SHAPED like. Before this existed, nine of ten biomes
   rendered the same three-stop sky over the same two rows of ellipses, so a
   Mediterranean coast and a highland plateau differed only in hue.

   Everything here is pure data with no engine dependency, so it is testable
   headless and a biome can be re-art-directed without touching a renderer.

   Coordinates are screen-space on the 960x540 design canvas: `baseY` is where a
   ridge's foot sits, `amp` is how far its peaks rise above that foot. */

/** How a ridge's horizon is shaped. The renderer turns these into deterministic
 *  value-noise silhouettes — never ellipses, which read as bubbles, not land. */
export type RidgeShape = 'rolling' | 'peaks' | 'cliffs' | 'dunes' | 'canopy' | 'spires';

export interface RidgeLayer {
  parallax: number;   /* 0 = painted on the sky, 1 = moves with gameplay */
  color: string;
  alpha: number;
  baseY: number;
  amp: number;
  wavelength: number; /* world px per feature */
  shape: RidgeShape;
  seed: number;
}

export interface CloudBand {
  y: number; parallax: number; scale: number; gap: number;
  alpha: number; color: string; shape: 'puff' | 'streak' | 'wisp'; seed: number;
}

export interface Celestial {
  kind: 'sun' | 'moon' | 'glow' | 'none';
  x: number; y: number; r: number;
  core: string; halo: string; haloR: number;
}

/** The vertical face of a platform. */
export type SurfaceKind = 'soil' | 'rock' | 'strata' | 'sand' | 'peat' | 'crystal';
/** The dressing along a platform's collision top. */
export type CoverKind = 'grass' | 'snow' | 'sand' | 'pebble' | 'moss' | 'reed' | 'crystal' | 'blossom';
/** Silhouettes in front of gameplay, at parallax > 1. */
export type FringeKind = 'grass' | 'fern' | 'reed' | 'palm' | 'crystal' | 'branch';

export interface Fringe {
  kind: FringeKind; color: string; alpha: number;
  parallax: number; stride: number; height: number; seed: number;
}

export interface SceneryProfile {
  celestial: Celestial;
  /** Atmospheric band that lifts distant ridges off the sky. */
  haze: { y: number; color: string; alpha: number } | null;
  clouds: CloudBand[];
  ridges: RidgeLayer[];
  surface: SurfaceKind;
  cover: CoverKind;
  fringe: Fringe | null;
  /** Ambient motes. Shape and colour come from the biome palette's long-unused
   *  ambientA / ambientB / ambientShape fields. */
  ambient: { count: number; drift: number; rise: number };
  /** Direction the key light comes from: rim highlights face this way. */
  lightDir: -1 | 1;
  rim: string;
}

const NIGHT_GLOW: Celestial = { kind: 'glow', x: 300, y: 120, r: 0, core: '#8fd8ff', halo: '#5f7ad8', haloR: 300 };

export const SCENERY: Record<string, SceneryProfile> = {
  /* --- Meadow: authored raster art covers sky and ridges, so its profile only
     needs the layers the plates do not provide. Kept complete so the biome
     still reads correctly if an image fails to decode. --- */
  meadow: {
    celestial: { kind: 'sun', x: 742, y: 96, r: 30, core: '#fff6d8', halo: '#ffe6a4', haloR: 190 },
    haze: { y: 330, color: '#cfeee2', alpha: .30 },
    clouds: [
      { y: 92, parallax: .05, scale: 1.25, gap: 430, alpha: .50, color: '#ffffff', shape: 'puff', seed: 3 },
      { y: 156, parallax: .11, scale: .85, gap: 330, alpha: .38, color: '#ffffff', shape: 'puff', seed: 8 },
    ],
    ridges: [
      { parallax: .10, color: '#c8e9dc', alpha: .85, baseY: 396, amp: 84, wavelength: 620, shape: 'rolling', seed: 11 },
      { parallax: .22, color: '#47916f', alpha: .90, baseY: 432, amp: 66, wavelength: 400, shape: 'canopy', seed: 5 },
    ],
    surface: 'soil', cover: 'grass',
    fringe: { kind: 'grass', color: '#3f7d52', alpha: .85, parallax: 1.10, stride: 700, height: 96, seed: 2 },
    ambient: { count: 16, drift: 12, rise: 16 },
    lightDir: 1, rim: '#ffe9b0',
  },

  /* --- Emerald Peaks: high, sharp, thin air. Sky is the subject. --- */
  peaks: {
    celestial: { kind: 'sun', x: 200, y: 74, r: 26, core: '#ffffff', halo: '#dff4ef', haloR: 210 },
    haze: { y: 300, color: '#dff2ee', alpha: .42 },
    clouds: [
      { y: 118, parallax: .04, scale: 1.4, gap: 520, alpha: .42, color: '#ffffff', shape: 'wisp', seed: 21 },
      { y: 214, parallax: .09, scale: 1.0, gap: 300, alpha: .34, color: '#f2fbfa', shape: 'streak', seed: 14 },
    ],
    ridges: [
      { parallax: .07, color: '#a8d8d2', alpha: .80, baseY: 372, amp: 168, wavelength: 700, shape: 'peaks', seed: 31 },
      { parallax: .16, color: '#9acac3', alpha: .88, baseY: 414, amp: 124, wavelength: 460, shape: 'peaks', seed: 7 },
      { parallax: .30, color: '#4e8d84', alpha: .92, baseY: 452, amp: 74, wavelength: 320, shape: 'rolling', seed: 19 },
    ],
    surface: 'rock', cover: 'snow',
    fringe: { kind: 'branch', color: '#2f5f58', alpha: .78, parallax: 1.12, stride: 820, height: 108, seed: 6 },
    ambient: { count: 20, drift: 26, rise: 8 },
    lightDir: -1, rim: '#eaf7ff',
  },

  /* --- Crystal Caves: no sky. Depth comes from stalactite ranks and glow. --- */
  cave: {
    celestial: NIGHT_GLOW,
    haze: { y: 260, color: '#2a2246', alpha: .50 },
    clouds: [],
    ridges: [
      { parallax: .08, color: '#322b4b', alpha: .95, baseY: 470, amp: 210, wavelength: 380, shape: 'spires', seed: 44 },
      { parallax: .20, color: '#443f56', alpha: .95, baseY: 500, amp: 150, wavelength: 260, shape: 'spires', seed: 12 },
    ],
    surface: 'crystal', cover: 'crystal',
    fringe: { kind: 'crystal', color: '#120d24', alpha: .90, parallax: 1.14, stride: 620, height: 128, seed: 27 },
    ambient: { count: 22, drift: 6, rise: 22 },
    lightDir: 1, rim: '#8fd8ff',
  },

  /* --- Chestnut Grove: late autumn light through a heavy canopy. --- */
  forest: {
    celestial: { kind: 'sun', x: 660, y: 130, r: 34, core: '#fff0cc', halo: '#f0b463', haloR: 250 },
    haze: { y: 320, color: '#f2cf9c', alpha: .38 },
    clouds: [{ y: 104, parallax: .05, scale: 1.1, gap: 470, alpha: .34, color: '#fff2d8', shape: 'streak', seed: 9 }],
    ridges: [
      { parallax: .09, color: '#e8bd8d', alpha: .82, baseY: 388, amp: 92, wavelength: 540, shape: 'rolling', seed: 15 },
      { parallax: .20, color: '#a5672e', alpha: .90, baseY: 430, amp: 108, wavelength: 300, shape: 'canopy', seed: 33 },
      { parallax: .34, color: '#7c4a22', alpha: .92, baseY: 468, amp: 72, wavelength: 210, shape: 'canopy', seed: 4 },
    ],
    surface: 'soil', cover: 'moss',
    fringe: { kind: 'fern', color: '#5c3618', alpha: .82, parallax: 1.10, stride: 660, height: 116, seed: 18 },
    ambient: { count: 18, drift: 20, rise: 4 },
    lightDir: -1, rim: '#ffd79a',
  },

  /* --- Toros Highlands: wide, wind-scoured, bright. --- */
  toros: {
    celestial: { kind: 'sun', x: 780, y: 86, r: 28, core: '#ffffff', halo: '#e6f6fb', haloR: 200 },
    haze: { y: 316, color: '#dcecf0', alpha: .44 },
    clouds: [
      { y: 96, parallax: .04, scale: 1.5, gap: 560, alpha: .46, color: '#ffffff', shape: 'streak', seed: 25 },
      { y: 178, parallax: .10, scale: 1.1, gap: 380, alpha: .30, color: '#ffffff', shape: 'wisp', seed: 37 },
    ],
    ridges: [
      { parallax: .07, color: '#c4dde2', alpha: .84, baseY: 366, amp: 146, wavelength: 780, shape: 'peaks', seed: 52 },
      { parallax: .17, color: '#77958e', alpha: .88, baseY: 418, amp: 96, wavelength: 500, shape: 'cliffs', seed: 22 },
      { parallax: .32, color: '#5c7f68', alpha: .90, baseY: 458, amp: 58, wavelength: 300, shape: 'rolling', seed: 41 },
    ],
    surface: 'strata', cover: 'pebble',
    fringe: { kind: 'grass', color: '#3f5c46', alpha: .76, parallax: 1.08, stride: 740, height: 88, seed: 13 },
    ambient: { count: 24, drift: 42, rise: 6 },
    lightDir: 1, rim: '#ffffff',
  },

  /* --- Orchard: blossom light, warm and close. --- */
  orchard: {
    celestial: { kind: 'sun', x: 236, y: 100, r: 32, core: '#fff8e8', halo: '#ffd2a2', haloR: 230 },
    haze: { y: 330, color: '#ffe0c4', alpha: .34 },
    clouds: [{ y: 110, parallax: .05, scale: 1.2, gap: 440, alpha: .42, color: '#fff6ec', shape: 'puff', seed: 6 }],
    ridges: [
      { parallax: .10, color: '#f5d1a4', alpha: .80, baseY: 392, amp: 76, wavelength: 580, shape: 'rolling', seed: 28 },
      { parallax: .23, color: '#af8656', alpha: .86, baseY: 434, amp: 88, wavelength: 270, shape: 'canopy', seed: 16 },
    ],
    surface: 'soil', cover: 'blossom',
    fringe: { kind: 'branch', color: '#7c5334', alpha: .80, parallax: 1.12, stride: 690, height: 104, seed: 35 },
    ambient: { count: 22, drift: 16, rise: 10 },
    lightDir: -1, rim: '#ffe2ee',
  },

  /* --- Mediterranean Coast: flat sea horizon, dunes, hard light. --- */
  coast: {
    celestial: { kind: 'sun', x: 700, y: 78, r: 30, core: '#ffffff', halo: '#d8f6ff', haloR: 220 },
    haze: { y: 300, color: '#cdeef7', alpha: .40 },
    clouds: [{ y: 92, parallax: .04, scale: 1.35, gap: 600, alpha: .40, color: '#ffffff', shape: 'streak', seed: 43 }],
    ridges: [
      { parallax: .06, color: '#7fc9d8', alpha: .70, baseY: 336, amp: 26, wavelength: 900, shape: 'rolling', seed: 2 },
      { parallax: .14, color: '#4899af', alpha: .78, baseY: 392, amp: 40, wavelength: 460, shape: 'rolling', seed: 24 },
      { parallax: .28, color: '#e6d5ba', alpha: .88, baseY: 448, amp: 70, wavelength: 380, shape: 'dunes', seed: 38 },
    ],
    surface: 'sand', cover: 'sand',
    fringe: { kind: 'palm', color: '#2f7a5c', alpha: .80, parallax: 1.10, stride: 780, height: 132, seed: 30 },
    ambient: { count: 14, drift: 30, rise: 4 },
    lightDir: 1, rim: '#ffffff',
  },

  /* --- Black Sea Forest: humid, layered, fog between the ranks. --- */
  rainforest: {
    celestial: { kind: 'glow', x: 420, y: 110, r: 0, core: '#e8f5ec', halo: '#b8d8c2', haloR: 280 },
    haze: { y: 286, color: '#dcefe3', alpha: .52 },
    clouds: [
      { y: 168, parallax: .06, scale: 1.6, gap: 340, alpha: .40, color: '#eef7f1', shape: 'wisp', seed: 47 },
      { y: 246, parallax: .13, scale: 1.2, gap: 260, alpha: .30, color: '#e4f1e8', shape: 'wisp', seed: 29 },
    ],
    ridges: [
      { parallax: .08, color: '#9dc0a8', alpha: .78, baseY: 372, amp: 110, wavelength: 420, shape: 'canopy', seed: 51 },
      { parallax: .19, color: '#7da38a', alpha: .86, baseY: 424, amp: 96, wavelength: 280, shape: 'canopy', seed: 17 },
      { parallax: .33, color: '#3f6a4c', alpha: .92, baseY: 466, amp: 74, wavelength: 190, shape: 'canopy', seed: 36 },
    ],
    surface: 'peat', cover: 'moss',
    fringe: { kind: 'fern', color: '#274a34', alpha: .86, parallax: 1.13, stride: 580, height: 124, seed: 20 },
    ambient: { count: 20, drift: 8, rise: 12 },
    lightDir: -1, rim: '#dff0e4',
  },

  /* --- Lakeside: a still mirror. The far bank sits low and quiet. --- */
  lakeside: {
    celestial: { kind: 'sun', x: 320, y: 92, r: 28, core: '#fffaf0', halo: '#cfe6f6', haloR: 210 },
    haze: { y: 312, color: '#d6e9f5', alpha: .44 },
    clouds: [
      { y: 100, parallax: .04, scale: 1.3, gap: 500, alpha: .44, color: '#ffffff', shape: 'puff', seed: 10 },
      { y: 186, parallax: .10, scale: .9, gap: 340, alpha: .28, color: '#f2f9ff', shape: 'wisp', seed: 45 },
    ],
    ridges: [
      { parallax: .08, color: '#b3d2e6', alpha: .80, baseY: 368, amp: 66, wavelength: 660, shape: 'rolling', seed: 26 },
      { parallax: .18, color: '#4f7fa0', alpha: .86, baseY: 412, amp: 80, wavelength: 340, shape: 'canopy', seed: 39 },
      { parallax: .30, color: '#5f8a68', alpha: .88, baseY: 456, amp: 46, wavelength: 240, shape: 'rolling', seed: 8 },
    ],
    surface: 'peat', cover: 'reed',
    fringe: { kind: 'reed', color: '#3c6a48', alpha: .84, parallax: 1.11, stride: 520, height: 118, seed: 34 },
    ambient: { count: 18, drift: 10, rise: 14 },
    lightDir: 1, rim: '#e6f4ff',
  },

  /* --- Master Gardener: golden hour containing every biome restored. --- */
  mastery: {
    celestial: { kind: 'sun', x: 480, y: 118, r: 40, core: '#fffdf2', halo: '#ffd591', haloR: 300 },
    haze: { y: 322, color: '#ffe6b8', alpha: .40 },
    clouds: [
      { y: 88, parallax: .04, scale: 1.35, gap: 520, alpha: .44, color: '#fff8e6', shape: 'puff', seed: 55 },
      { y: 172, parallax: .10, scale: 1.0, gap: 360, alpha: .32, color: '#fff2d4', shape: 'streak', seed: 32 },
    ],
    ridges: [
      { parallax: .07, color: '#f2d49c', alpha: .80, baseY: 378, amp: 108, wavelength: 700, shape: 'peaks', seed: 48 },
      { parallax: .18, color: '#b9955b', alpha: .86, baseY: 424, amp: 84, wavelength: 380, shape: 'rolling', seed: 23 },
      { parallax: .32, color: '#869654', alpha: .90, baseY: 462, amp: 78, wavelength: 230, shape: 'canopy', seed: 40 },
    ],
    /* A walled, terraced garden — dry stone under cultivated turf. Deliberately
       not the Meadow's bare soil: this is the same world, tended. */
    surface: 'rock', cover: 'grass',
    fringe: { kind: 'grass', color: '#5c6b34', alpha: .82, parallax: 1.10, stride: 700, height: 100, seed: 46 },
    ambient: { count: 24, drift: 14, rise: 12 },
    lightDir: 1, rim: '#ffeec2',
  },
};

export const DEFAULT_SCENERY = SCENERY.meadow;
export function sceneryFor(biome: string | undefined): SceneryProfile {
  return (biome && SCENERY[biome]) || DEFAULT_SCENERY;
}

/* ---------- deterministic noise ----------
   Shared by the renderer and the tests. Must be a pure function of world x, or
   ridges shimmer and swim as the camera moves. */

export function hash01(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}
const smoothstep = (t: number): number => t * t * (3 - 2 * t);

export function valueNoise(x: number, seed: number): number {
  const i = Math.floor(x), f = smoothstep(x - i);
  return hash01(i + seed) * (1 - f) + hash01(i + 1 + seed) * f;
}

export function fbm(x: number, seed: number, octaves = 3): number {
  let sum = 0, amp = 1, freq = 1, norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += valueNoise(x * freq, seed + o * 101) * amp;
    norm += amp; amp *= .5; freq *= 2;
  }
  return sum / norm;
}

/** Height of a ridge silhouette at world position `wx` (already divided by the
 *  layer's wavelength), normalised to 0..1. */
export function ridgeHeight(shape: RidgeShape, wx: number, seed: number): number {
  const cell = Math.floor(wx), f = wx - cell;
  const r = hash01(cell * 1.7 + seed);
  let h: number;
  switch (shape) {
    case 'peaks': {
      const tri = 1 - Math.abs(2 * f - 1);
      h = (.30 + .70 * r) * Math.pow(tri, .62) + .16 * fbm(wx * 2.3, seed + 41, 2);
      break;
    }
    case 'cliffs': {
      h = Math.floor(fbm(wx * .7, seed, 2) * 4) / 3.4 + .10 * fbm(wx * 4, seed + 17, 2);
      break;
    }
    case 'dunes': {
      const t = f < .78 ? f / .78 : Math.max(0, 1 - (f - .78) / .22);
      h = (.40 + .60 * r) * smoothstep(t) + .08 * fbm(wx * 2, seed + 9, 2);
      break;
    }
    case 'canopy': {
      const b = Math.sin(Math.PI * f);
      h = (.45 + .55 * r) * b * b * 1.15 + .12 * fbm(wx * 3.1, seed + 23, 2);
      break;
    }
    case 'spires': {
      const c = Math.min(1, Math.abs(f - .5) * 2);
      h = (.30 + .70 * r) * Math.max(0, 1 - Math.pow(c, .35));
      break;
    }
    case 'rolling':
    default:
      h = fbm(wx, seed, 3);
  }
  return Math.max(0, Math.min(1, h));
}
