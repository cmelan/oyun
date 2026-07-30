/* Traversal safety.

   src/core/generator.ts claims: "SECTION_RHYTHM + fixed GAP are the PROVEN B1
   platform/gap values: generated levels never produce an unfair jump."

   That claim was never tested. These tests drive the REAL scene physics — the
   same update() a player runs — and check that every gap in every level can be
   crossed by a perfectly-timed run-and-jump. If a gap fails here, no child can
   ever cross it. */
import { describe, it, expect, beforeEach } from 'vitest';
import { LevelScene } from '../src/game/LevelScene';
import { LEVELS, prepLevel } from '../src/core/world';
import { LANDING_ZONE } from '../src/core/generator';
import { CONFIG } from '../src/core/config';

const canvasStub = () => ({
  width: 0, height: 0,
  getContext: () => new Proxy({}, { get: () => () => ({}) }),
  toDataURL: () => 'data:image/png;base64,STUB',
});
beforeEach(() => {
  (globalThis as any).document = {
    createElement: () => canvasStub(),
    getElementById: () => ({ style: {}, classList: { add() {}, remove() {}, toggle() {} }, querySelectorAll: () => [], addEventListener() {}, set innerHTML(_v: string) {}, set textContent(_v: string) {} }),
    addEventListener() {}, documentElement: { style: {} },
  };
  (globalThis as any).window = { addEventListener() {}, removeEventListener() {}, setTimeout: () => 0, clearTimeout() {}, matchMedia: () => ({ matches: false }) };
});

function boot(idx: number): any {
  const scene: any = new LevelScene();
  scene.init({
    idx,
    hooks: {
      ui: new Proxy({}, { get: () => () => {} }) as any,
      journal: () => [], onTreeLearned() {}, onLevelComplete() {}, onGameOver() {},
    },
  });
  scene.create();
  return scene;
}

const DT = 1 / 60;
const step = (s: any, n: number) => { for (let i = 0; i < n; i++) s.update(i * 16.7, 16.7 * 1000 * DT / 16.7 * 16.7 / 16.7); };

/** Run right along a platform, jump at the lip, and report where we land. */
function attemptGap(scene: any, from: { x: number; y: number; w: number }, to: { x: number; y: number }): {
  crossed: boolean; landedY: number; landedX: number;
} {
  const p = scene.player;
  /* Start far enough back to reach full speed (MOVE / ACCEL ~ 0.1s ≈ 28px),
     but never inside a solid — bounce pads and leaf platforms sit on these
     run-ups and would measure their physics instead of the gap's. */
  const clear = (x: number) => !scene.solids().some((s: any) =>
    x < s.x + s.w && x + p.w > s.x && from.y - p.h < s.y + s.h && from.y > s.y);
  let startX = Math.max(from.x, from.x + from.w - 150);
  while (startX > from.x && !clear(startX)) startX -= 10;
  if (!clear(startX)) return { crossed: true, landedY: 0, landedX: 0 }; /* no clear run-up: not a gap test */
  p.x = startX;
  p.y = from.y - p.h;
  p.vx = 0; p.vy = 0; p.grounded = true;
  scene.releaseAll();
  scene.press('right');

  let jumped = false, lastX = p.x, stalled = 0;
  for (let f = 0; f < 240; f++) {
    /* Jump at the last moment the lip still supports us — the optimal input. */
    if (!jumped && p.grounded && p.x + p.w >= from.x + from.w - 4) {
      scene.press('jump');
      jumped = true;
    }
    /* A mushroom pad sitting proud of the platform blocks horizontal movement
       outright; the route is over it. Hop when progress stops, as a child does. */
    if (Math.abs(p.x - lastX) < 0.5) stalled++; else stalled = 0;
    lastX = p.x;
    if (stalled > 6 && p.grounded) { scene.press('jump'); stalled = 0; }
    scene.update(f * 16.7, 16.7);
    /* Crossed = over the far platform and not below its surface. Requiring
       `grounded` was wrong: mushroom pads bounce, so a successful crossing that
       lands on one never grounds and read as a failure. */
    if (jumped && p.x > to.x && p.y + p.h < to.y + 40) {
      scene.release('right');
      return { crossed: true, landedY: p.y, landedX: p.x };
    }
    if (p.y > scene.L.deathY - 60) break;
  }
  scene.release('right');
  return { crossed: false, landedY: p.y, landedX: p.x };
}

describe('the physics can actually clear a jump', () => {
  it('a jump carries further than the generator\'s fixed gap', () => {
    const { JUMP_V, GRAV, MOVE } = CONFIG.physics;
    const airtime = (2 * JUMP_V) / GRAV;
    const reach = MOVE * airtime;
    /* Documented for whoever tunes these next: the margin is what keeps a
       five-year-old's imperfect timing survivable. */
    expect(reach, `a full-speed jump travels ${reach.toFixed(0)}px`).toBeGreaterThan(180);
  });
});

/** A gap a puzzle is MEANT to fill. Level 1's three nature puzzles are
 *  deliberately un-jumpable — tests/core.test.ts asserts they exceed 200px so
 *  they cannot be skipped. Those are design, not defects. */
function puzzleFilled(lv: any, fromRight: number, toLeft: number): boolean {
  const spans: { x: number; w: number }[] = [];
  for (const it of lv.interact) {
    const a: any = it;
    if (a.ice) spans.push(a.ice);
    if (a.bridge) spans.push(a.bridge);
    if (a.pad) spans.push(a.pad);
    if (a.leaves) spans.push(...a.leaves);
  }
  return spans.some(s => s.x < toLeft + 8 && s.x + s.w > fromRight - 8);
}

describe('every gap in every level is crossable', () => {
  for (let idx = 0; idx < LEVELS.length; idx++) {
    it(`level ${idx + 1}: no impossible gap`, () => {
      const lv = prepLevel(idx, []);
      const scene = boot(idx);
      /* Geometry only. Monsters knock the player mid-jump, which measures
         combat rather than reach; and thorn walls / rock blocks are obstacles
         the player REMOVES, so leaving them standing measures the blocker, not
         the gap. Clearing every puzzle isolates the bare jumps that remain. */
      scene.monsters = [];
      scene.L.boss = null;
      for (const it of scene.L.interact) it.done = true;

      const plats = lv.platforms.slice().sort((a, b) => a.x - b.x);
      const failures: string[] = [];
      for (let i = 0; i < plats.length - 1; i++) {
        const a = plats[i], b = plats[i + 1];
        const gap = b.x - (a.x + a.w);
        if (gap <= 0) continue;                       /* touching or overlapping */
        if (b.y > a.y + 90) continue;                 /* a drop, not a jump */
        if (puzzleFilled(lv, a.x + a.w, b.x)) continue; /* a puzzle bridges this */
        const r = attemptGap(scene, a, b);
        if (!r.crossed) failures.push(`${a.x + a.w}→${b.x} (gap ${gap}px, dy ${b.y - a.y})`);
      }
      expect(failures, `level ${idx + 1} has uncrossable gaps: ${failures.join(', ')}`).toEqual([]);
    });
  }
});

describe('falling is survivable', () => {
  it('every level gives the player somewhere to come back to', () => {
    /* A pit that costs a heart with the checkpoint far behind is how a chapter
       becomes a war of attrition. Each level must have checkpoints spread
       through it, not clustered at the start. */
    for (let idx = 0; idx < LEVELS.length; idx++) {
      const lv = prepLevel(idx, []);
      expect(lv.checkpoints.length, `level ${idx + 1} has too few checkpoints`).toBeGreaterThanOrEqual(3);
      const last = lv.checkpoints[lv.checkpoints.length - 1];
      expect(last.x / lv.w, `level ${idx + 1}'s last checkpoint is only ${((last.x / lv.w) * 100).toFixed(0)}% in`)
        .toBeGreaterThan(0.5);
    }
  });
});

describe('landing zones are safe', () => {
  /* The bug this prevents cost the game nine of its ten chapters: a creature
     whose patrol reached the left edge of a platform stood exactly where an
     incoming jump lands. The child crossed the gap, touched it on touchdown,
     was knocked back into the pit, and lost three hearts in eight seconds.
     Verified by browser playthrough before and after. */
  it('no creature can reach the spot a jump lands on', () => {
    const problems: string[] = [];
    for (let idx = 0; idx < LEVELS.length; idx++) {
      const lv = prepLevel(idx, []);
      const plats = lv.platforms.slice().sort((a, b) => a.x - b.x);
      for (const m of lv.monsters) {
        const home = plats.find(p => m.x >= p.x && m.x <= p.x + p.w);
        if (!home) continue;
        const before = plats[plats.indexOf(home) - 1];
        if (!before) continue;
        if (before.x + before.w >= home.x) continue;         /* no gap to land over */
        /* Only gaps the child must JUMP. Where a puzzle lays ice, leaves or a
           bridge, they walk across and arrive under control. */
        if (puzzleFilled(lv, before.x + before.w, home.x)) continue;
        /* Reachable left extent of this creature, body included. */
        const reach = Math.min(m.lo, m.gx0);
        const landingEnds = home.x + LANDING_ZONE - 24;
        if (reach < landingEnds) {
          problems.push(`L${idx + 1} creature reaches x=${reach}, landing zone ends at ${landingEnds}`);
        }
      }
    }
    expect(problems, problems.join('; ')).toEqual([]);
  });
});
