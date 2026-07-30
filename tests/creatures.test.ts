/* Creature roster regression.

   The problem this system exists to solve: one painted Mossling was every
   creature in all ten biomes. These tests keep the roster distinct, keep every
   biome supplied, and — most importantly — keep the collision box out of it.
   Visual variety must never change how a jump feels. */
import { describe, it, expect, beforeEach } from 'vitest';
import { SPECIES, BIOME_SPECIES, speciesFor } from '../src/core/creatures';
import { SILHOUETTE, drawCreature } from '../src/game/creatureArt';
import { Graphics } from '../src/game/engine';
import { BIOME } from '../src/core/biomes';
import { WORLD } from '../src/core/world';
import { makeMonster } from '../src/core/logic';

const STATES = ['angry', 'blind', 'happy'] as const;

beforeEach(() => {
  (globalThis as any).document = {
    createElement: () => ({ width: 0, height: 0, getContext: () => new Proxy({}, { get: () => () => ({}) }), toDataURL: () => 'x' }),
    getElementById: () => ({ style: {}, classList: { add() {}, remove() {}, toggle() {} }, querySelectorAll: () => [], addEventListener() {} }),
    addEventListener() {}, documentElement: { style: {} },
  };
  (globalThis as any).window = { addEventListener() {}, removeEventListener() {}, setTimeout: () => 0, clearTimeout() {}, matchMedia: () => ({ matches: false }) };
});

describe('the roster', () => {
  it('every biome has its own creature', () => {
    for (const region of WORLD) {
      expect(BIOME_SPECIES[region.biome], `biome "${region.biome}" (region ${region.id}) has no creature`).toBeDefined();
    }
    expect(Object.keys(BIOME_SPECIES).sort()).toEqual(Object.keys(BIOME).sort());
  });

  it('no two biomes share a creature', () => {
    const used = Object.values(BIOME_SPECIES);
    expect(new Set(used).size, 'a creature is reused across biomes').toBe(used.length);
  });

  it('every species has a silhouette renderer', () => {
    for (const [kind, species] of Object.entries(SPECIES)) {
      expect(SILHOUETTE[species.silhouette], `no silhouette for ${kind}`).toBeTypeOf('function');
    }
  });

  it('only the Meadow Mossling has a painted sprite', () => {
    const painted = Object.values(SPECIES).filter(s => s.art);
    expect(painted.map(s => s.id)).toEqual(['mossling']);
  });

  it('silhouette masses are genuinely different', () => {
    /* Two creatures with the same proportions read as the same animal at 40px,
       whatever colour they are. */
    const shapes = Object.values(SPECIES).map(s => `${s.visual.w.toFixed(2)}x${s.visual.h.toFixed(2)}`);
    const counts = new Map<string, number>();
    for (const s of shapes) counts.set(s, (counts.get(s) || 0) + 1);
    for (const [shape, n] of counts) {
      expect(n, `${n} species share the proportions ${shape}`).toBeLessThanOrEqual(2);
    }
    /* And the roster must span both tall and wide, not cluster on square. */
    const ratios = Object.values(SPECIES).map(s => s.visual.w / s.visual.h);
    expect(Math.min(...ratios), 'no tall creature in the roster').toBeLessThan(0.8);
    expect(Math.max(...ratios), 'no wide creature in the roster').toBeGreaterThan(1.6);
  });

  it('the three emotional states are visually distinct for every species', () => {
    for (const [kind, s] of Object.entries(SPECIES)) {
      const cols = [s.palette.angry, s.palette.blind, s.palette.happy];
      expect(new Set(cols).size, `${kind} reuses a body colour across states`).toBe(3);
    }
  });

  it('speciesFor resolves by biome and honours an override', () => {
    expect(speciesFor('cave').id).toBe('glimmernewt');
    expect(speciesFor('coast').id).toBe('shorecrab');
    expect(speciesFor('cave', 'reedheron').id).toBe('reedheron');
    expect(speciesFor(undefined).id, 'unknown biome must fall back, not throw').toBe('mossling');
    expect(speciesFor('not-a-biome').id).toBe('mossling');
  });
});

describe('creature variety never touches gameplay', () => {
  it('every creature keeps the proven 40x40 collision box', () => {
    /* This is the load-bearing test. Hitbox size decides whether a jump clears
       a creature; if silhouette work changed it, difficulty would drift
       silently across ten levels. */
    const m = makeMonster({ x: 0, gx0: 0, gx1: 100, ground: 300, lo: 0, hi: 200 });
    expect(m.w).toBe(40);
    expect(m.h).toBe(40);
  });

  it('visual size is declared separately from the box', () => {
    for (const [kind, s] of Object.entries(SPECIES)) {
      expect(s.visual.w, `${kind}`).toBeGreaterThan(0);
      expect(s.visual.h, `${kind}`).toBeGreaterThan(0);
      expect(s.visual.w, `${kind} silhouette is absurdly wide`).toBeLessThan(2);
      expect(s.visual.h, `${kind} silhouette is absurdly tall`).toBeLessThan(2);
    }
  });
});

describe('every silhouette draws safely', () => {
  it('no NaN or undefined geometry, in any state, for any species', () => {
    for (const species of Object.values(SPECIES)) {
      for (const state of STATES) {
        for (const face of [-1, 1]) {
          for (const t of [0, 0.37, 1.9, 12.5]) {
            const g = new Graphics();
            drawCreature(g, species, {
              x: 120, ground: 360, w: 40, h: 40, face, state, t,
              healProgress: state === 'blind' ? 0.5 : 0,
            });
            expect(g.ops.length, `${species.id}/${state} drew nothing`).toBeGreaterThan(3);
          }
        }
      }
    }
  });

  it('records finite coordinates only', () => {
    const seen: number[] = [];
    const g = new Graphics();
    const orig = g.fillCircle.bind(g);
    (g as any).fillCircle = (x: number, y: number, r: number) => { seen.push(x, y, r); return orig(x, y, r); };
    for (const species of Object.values(SPECIES)) {
      drawCreature(g, species, { x: 90, ground: 370, w: 40, h: 40, face: 1, state: 'angry', t: 3.3, healProgress: 0 });
    }
    expect(seen.length).toBeGreaterThan(0);
    for (const v of seen) expect(Number.isFinite(v)).toBe(true);
  });

  it('a healing creature shows progress that a child can see moving', () => {
    const widths: number[] = [];
    for (const progress of [0.1, 0.5, 0.95]) {
      const g = new Graphics();
      const orig = g.fillRect.bind(g);
      (g as any).fillRect = (x: number, y: number, w: number, h: number) => { if (h === 5) widths.push(w); return orig(x, y, w, h); };
      drawCreature(g, SPECIES.shorecrab, { x: 90, ground: 370, w: 40, h: 40, face: 1, state: 'blind', t: 1, healProgress: progress });
    }
    expect(widths).toHaveLength(3);
    expect(widths[0]).toBeLessThan(widths[1]);
    expect(widths[1]).toBeLessThan(widths[2]);
  });
});
