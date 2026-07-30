/* Scenery system regression.

   Guards the properties that make ten biomes read as ten places:
   - every biome has a profile, and no two share a horizon signature
   - ridge silhouettes are a pure function of world position (they must not
     shimmer or swim as the camera moves)
   - every distant layer clears the sky it sits against. The audit measured the
     old ellipse hills at 1.03–1.11:1 against their own sky, which is why nine
     of ten horizons were invisible. */
import { describe, it, expect } from 'vitest';
import {
  SCENERY, sceneryFor, ridgeHeight, fbm, valueNoise, hash01,
  skyColorAt, ridgePeakY, HORIZON_CEILING,
} from '../src/core/scenery';
import { BIOME } from '../src/core/biomes';
import { WORLD } from '../src/core/world';

const SHAPES = ['rolling', 'peaks', 'cliffs', 'dunes', 'canopy', 'spires'] as const;

/* WCAG relative luminance + contrast ratio. */
function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const lin = (c: number) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); };
  return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
}
function contrast(a: string, b: string): number {
  const la = luminance(a), lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

describe('scenery data', () => {
  it('every biome in the world has a scenery profile', () => {
    for (const region of WORLD) {
      expect(SCENERY[region.biome], `no profile for biome "${region.biome}" (region ${region.id})`).toBeDefined();
    }
  });

  it('every biome palette has a profile and vice versa', () => {
    expect(Object.keys(SCENERY).sort()).toEqual(Object.keys(BIOME).sort());
  });

  it('an unknown biome falls back rather than throwing', () => {
    expect(sceneryFor(undefined)).toBeDefined();
    expect(sceneryFor('not-a-biome')).toBeDefined();
  });

  it('no two biomes share a horizon signature', () => {
    /* The failure this prevents: nine biomes rendering the same two rows of
       ellipses in different colours. */
    const signatures = Object.entries(SCENERY).map(([id, p]) => [
      id,
      p.ridges.map(r => `${r.shape}@${r.parallax}/${r.wavelength}`).join('|'),
    ] as const);
    const seen = new Map<string, string>();
    for (const [id, sig] of signatures) {
      const clash = seen.get(sig);
      expect(clash, `${id} has the same horizon as ${clash}`).toBeUndefined();
      seen.set(sig, id);
    }
  });

  it('no two biomes share a surface + ground-cover pairing', () => {
    const pairs = Object.entries(SCENERY).map(([id, p]) => [id, `${p.surface}/${p.cover}`] as const);
    const seen = new Map<string, string>();
    for (const [id, pair] of pairs) {
      const clash = seen.get(pair);
      expect(clash, `${id} has the same ground as ${clash}`).toBeUndefined();
      seen.set(pair, id);
    }
  });

  it('every ridge peaks above the gameplay line', () => {
    /* Platform tops sit between y=342 and y=400. A ridge whose peak is below
       HORIZON_CEILING is drawn entirely behind the level and seen by nobody —
       which is exactly what happened on the first pass. */
    for (const [id, profile] of Object.entries(SCENERY)) {
      profile.ridges.forEach((ridge, i) => {
        expect(ridgePeakY(ridge), `${id} ridge ${i} peaks at y=${ridgePeakY(ridge)}, behind the level`)
          .toBeLessThanOrEqual(HORIZON_CEILING);
      });
    }
  });

  it('every ridge is perceptible against the sky AT ITS OWN HEIGHT', () => {
    /* Checking against skyBot is the trap: a far ridge's peaks sit high, where
       the sky is skyMid or skyTop. Pale ridges passed a skyBot check and then
       vanished against the sky actually behind them.

       Tiered on purpose — atmospheric perspective genuinely fades the farthest
       layer, so one flat ratio would fight physics. But the measured baseline
       was 1.03:1: invisible, not atmospheric. */
    for (const [id, profile] of Object.entries(SCENERY)) {
      profile.ridges.forEach((ridge, i) => {
        const sky = skyColorAt(BIOME[id], ridgePeakY(ridge) + ridge.amp * 0.25);
        const ratio = contrast(ridge.color, sky);
        const nearest = i === profile.ridges.length - 1;
        const floor = nearest ? 1.45 : 1.22;
        expect(ratio, `${id}: ${nearest ? 'nearest' : `ridge ${i}`} ${ridge.color} vs sky ${sky} at its own height is only ${ratio.toFixed(2)}:1`)
          .toBeGreaterThan(floor);
      });
    }
  });

  it('ridges are ordered back to front and never float', () => {
    for (const [id, profile] of Object.entries(SCENERY)) {
      for (let i = 1; i < profile.ridges.length; i++) {
        expect(profile.ridges[i].parallax, `${id}: ridge ${i} must be nearer than ${i - 1}`)
          .toBeGreaterThan(profile.ridges[i - 1].parallax);
      }
      for (const r of profile.ridges) {
        expect(r.parallax, `${id}: a background ridge cannot move with gameplay`).toBeLessThan(1);
        expect(r.parallax).toBeGreaterThan(0);
        expect(r.baseY, `${id}: ridge foot must be on screen`).toBeGreaterThan(0);
        expect(r.wavelength).toBeGreaterThan(0);
        expect(r.amp).toBeGreaterThan(0);
      }
      if (profile.fringe) {
        expect(profile.fringe.parallax, `${id}: the fringe must overtake gameplay`).toBeGreaterThan(1);
      }
    }
  });

  it('ambient motes are specified for every biome and stay within budget', () => {
    for (const [id, profile] of Object.entries(SCENERY)) {
      expect(profile.ambient.count, `${id}`).toBeGreaterThan(0);
      expect(profile.ambient.count, `${id}: too many motes for a phone`).toBeLessThanOrEqual(28);
    }
  });
});

describe('deterministic noise', () => {
  it('hash01 stays in range and is stable', () => {
    for (let i = -50; i < 50; i += 3) {
      const v = hash01(i);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
      expect(hash01(i)).toBe(v);
    }
  });

  it('valueNoise and fbm are continuous and bounded', () => {
    let prev = fbm(0, 7);
    for (let x = 0; x < 40; x += 0.05) {
      const v = fbm(x, 7);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
      expect(Math.abs(v - prev), `fbm jumped at x=${x}`).toBeLessThan(0.25);
      prev = v;
    }
    expect(valueNoise(3.5, 2)).toBe(valueNoise(3.5, 2));
  });

  it('ridgeHeight is a pure function of world position — horizons never swim', () => {
    /* If this regressed, ridges would jitter every frame as the camera moved,
       which is the classic tell of programmer-generated scenery. */
    for (const shape of SHAPES) {
      for (let x = 0; x < 12; x += 0.37) {
        const a = ridgeHeight(shape, x, 5);
        const b = ridgeHeight(shape, x, 5);
        expect(b, `${shape} not deterministic at ${x}`).toBe(a);
        expect(a, `${shape} out of range at ${x}`).toBeGreaterThanOrEqual(0);
        expect(a).toBeLessThanOrEqual(1);
        expect(Number.isFinite(a)).toBe(true);
      }
    }
  });

  it('each ridge shape actually has a different profile', () => {
    const samples = SHAPES.map(s => {
      const xs: number[] = [];
      for (let x = 0; x < 8; x += 0.25) xs.push(Number(ridgeHeight(s, x, 3).toFixed(4)));
      return [s, xs.join(',')] as const;
    });
    const seen = new Map<string, string>();
    for (const [shape, sig] of samples) {
      const clash = seen.get(sig);
      expect(clash, `${shape} is identical to ${clash}`).toBeUndefined();
      seen.set(sig, shape);
    }
  });

  it('peaks are pointier than rolling hills', () => {
    /* A cheap shape assertion: peak terrain should have higher variance. */
    const spread = (shape: typeof SHAPES[number]) => {
      const v: number[] = [];
      for (let x = 0; x < 30; x += 0.1) v.push(ridgeHeight(shape, x, 11));
      const mean = v.reduce((a, b) => a + b, 0) / v.length;
      return Math.sqrt(v.reduce((a, b) => a + (b - mean) ** 2, 0) / v.length);
    };
    expect(spread('peaks')).toBeGreaterThan(spread('rolling'));
    expect(spread('spires')).toBeGreaterThan(spread('rolling'));
  });
});
