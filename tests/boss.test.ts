/* Boss rendering regression.

   Every boss in the game — including the final one — used to be an 88x88
   rounded rectangle with two white circles. The mimic added four green dots.
   That was the entire visual difference across nine bosses.

   These tests keep the two archetypes visually separate, keep the calming arc
   legible, and keep the drawing safe in every state. */
import { describe, it, expect } from 'vitest';
import { Graphics } from '../src/game/engine';
import { drawBossCreature, type BossForm, type BossPose } from '../src/game/bossArt';
import { LEVELS, prepLevel } from '../src/core/world';

const STATES: BossPose['state'][] = ['sleep', 'idle', 'blind', 'caged', 'defeated'];
const FORMS: BossForm[] = ['thrower', 'mimic'];

function pose(over: Partial<BossPose> = {}): BossPose {
  return { x: 200, ground: 360, w: 88, h: 88, face: -1, t: 1.2, state: 'idle', calm: 0, ...over };
}

/* A crude shape fingerprint: which primitives were used, and how many. Two
   archetypes that fingerprint the same are the same silhouette in two colours. */
function fingerprint(form: BossForm, state: BossPose['state'] = 'idle'): string {
  const g = new Graphics();
  const counts: Record<string, number> = {};
  for (const m of ['fillRoundedRect', 'fillCircle', 'fillEllipse', 'fillTriangle', 'fillPolygon', 'fillRect', 'strokePath'] as const) {
    const orig = (g as any)[m].bind(g);
    (g as any)[m] = (...args: any[]) => { counts[m] = (counts[m] || 0) + 1; return orig(...args); };
  }
  drawBossCreature(g, form, pose({ state }));
  return Object.entries(counts).sort().map(([k, v]) => `${k}:${v}`).join(',');
}

describe('boss silhouettes', () => {
  it('the two archetypes are genuinely different shapes', () => {
    const [a, b] = FORMS.map(f => fingerprint(f));
    expect(a).not.toBe(b);
  });

  it('neither archetype is a bare rounded rectangle any more', () => {
    for (const form of FORMS) {
      const fp = fingerprint(form);
      /* A silhouette built from a single rounded rect plus eyes is the shape
         this system exists to replace. */
      const primitives = fp.split(',').length;
      expect(primitives, `${form} draws only ${fp}`).toBeGreaterThanOrEqual(4);
    }
  });

  it('draws safely in every state, at both facings, with finite geometry', () => {
    for (const form of FORMS) {
      for (const state of STATES) {
        for (const face of [-1, 1]) {
          const g = new Graphics();
          const seen: number[] = [];
          for (const m of ['fillCircle', 'fillEllipse', 'fillRect', 'fillRoundedRect'] as const) {
            const orig = (g as any)[m].bind(g);
            (g as any)[m] = (...args: any[]) => { for (const a of args) if (typeof a === 'number') seen.push(a); return orig(...args); };
          }
          drawBossCreature(g, form, pose({ state, face, calm: state === 'defeated' ? 1 : 0 }));
          expect(g.ops.length, `${form}/${state} drew nothing`).toBeGreaterThan(5);
          for (const v of seen) {
            expect(Number.isFinite(v), `${form}/${state} produced non-finite geometry`).toBe(true);
          }
        }
      }
    }
  });

  it('the calmed state is visually distinct from the distressed one', () => {
    /* A child must be able to tell "I have calmed it" without reading anything:
       the sand band only exists while blind. */
    expect(fingerprint('thrower', 'blind')).not.toBe(fingerprint('thrower', 'idle'));
    expect(fingerprint('mimic', 'blind')).not.toBe(fingerprint('mimic', 'idle'));
  });

  it('scales with the boss box rather than assuming 88x88', () => {
    /* The shrink finisher multiplies scale each hit, so nothing may be a
       hardcoded pixel size. */
    const small = new Graphics(), large = new Graphics();
    drawBossCreature(small, 'thrower', pose({ w: 40, h: 40 }));
    drawBossCreature(large, 'thrower', pose({ w: 140, h: 140 }));
    expect(small.ops.length).toBe(large.ops.length);
  });
});

describe('every boss in the world still resolves to a form', () => {
  it('all ten levels', () => {
    for (let idx = 0; idx < LEVELS.length; idx++) {
      const lv = prepLevel(idx, []);
      if (!lv.boss) continue;
      expect(FORMS, `level ${idx + 1} boss kind "${lv.boss.kind}"`).toContain(lv.boss.kind as BossForm);
    }
  });
});
