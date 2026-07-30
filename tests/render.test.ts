/* Rendering regression: record every geometry draw call the scene issues and
   assert none carry NaN/undefined coordinates (that's the exact failure mode of
   the missing monster w/h — monsters drew at ground-undefined = NaN and vanished),
   and that monsters + player are actually drawn on representative levels. */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Graphics } from '../src/game/engine';
import { LevelScene } from '../src/game/LevelScene';

const REC = { calls: [] as { m: string; args: any[]; layer: unknown }[] };
/* every geometry method whose coordinates must stay finite */
const GEOM = ['fillRoundedRect', 'strokeRoundedRect', 'fillRect', 'strokeRect', 'fillCircle', 'strokeCircle', 'fillRadial', 'fillTriangle', 'fillEllipse', 'moveTo', 'lineTo', 'arc', 'translateCanvas', 'rotateCanvas'];

const canvasStub = () => ({ width: 0, height: 0, getContext: () => new Proxy({}, { get: () => () => ({}) }), toDataURL: () => 'data:image/png;base64,STUB' });
beforeEach(() => {
  REC.calls = [];
  (globalThis as any).document = {
    createElement: () => canvasStub(),
    getElementById: () => ({ style: {}, classList: { add() {}, remove() {}, toggle() {} }, querySelectorAll: () => [], addEventListener() {}, set innerHTML(_v: string) {}, set textContent(_v: string) {} }),
    addEventListener() {}, documentElement: { style: {} },
  };
  (globalThis as any).window = { addEventListener() {}, removeEventListener() {}, setTimeout: () => 0, clearTimeout() {} };
  /* spy on the real vanilla Graphics: record args, then run the actual method */
  for (const m of GEOM) {
    const orig = (Graphics.prototype as any)[m];
    vi.spyOn(Graphics.prototype as any, m).mockImplementation(function (this: any, ...args: any[]) {
      REC.calls.push({ m, args, layer: this });
      return orig.apply(this, args);
    });
  }
});
afterEach(() => vi.restoreAllMocks());

function run(idx: number, frames: number) {
  const scene = new LevelScene();
  const learned: string[] = [];
  scene.init({ idx, hooks: { ui: new Proxy({}, { get: () => () => {} }) as any, journal: () => learned, onTreeLearned: (id: string) => learned.push(id), onLevelComplete() {}, onGameOver() {} } });
  scene.create();
  scene.press('right');
  for (let f = 0; f < frames; f++) scene.update(f * 16.7, 16.7);
  return scene;
}

describe('render regression', () => {
  for (const idx of [0, 1, 2, 5]) {
    it(`level ${idx + 1}: no NaN/undefined draw coordinates over 200 frames`, () => {
      run(idx, 200);
      /* the monster bug produced undefined w/h and NaN y; a rounded-rect radius may
         legitimately be an object ({tl,tr,bl,br}) so only flag undefined + NaN numbers */
      const bad = REC.calls.filter(c => c.args.some(a => a === undefined || (typeof a === 'number' && Number.isNaN(a))));
      expect(bad.slice(0, 5), `bad draw calls: ${JSON.stringify(bad.slice(0, 5))}`).toHaveLength(0);
      expect(REC.calls.length).toBeGreaterThan(100);
    });
  }

  /* Every monster must put ink near its own hitbox. This replaces an assertion
     that looked for an exact 40x40 rounded rect — a proxy that only held while
     every creature in the game was the same Mossling. The bug it guards is the
     original one: monsters drawing at NaN and vanishing. */
  function drawsAroundMonsters(scene: any): number[] {
    const world = scene.gfx;
    return scene.monsters.map((m: any) => {
      const cx = m.x + m.w / 2, cy = m.ground;
      return REC.calls.filter(c => {
        if (c.layer !== world) return false;
        const [ax, ay] = c.args;
        if (typeof ax !== 'number' || typeof ay !== 'number') return false;
        if (!Number.isFinite(ax) || !Number.isFinite(ay)) return false;
        return Math.abs(ax - cx) < 110 && ay > cy - 150 && ay < cy + 40;
      }).length;
    });
  }

  for (const [idx, label] of [[0, 'B1 meadow'], [1, 'B2 peaks'], [4, 'B5 toros'], [8, 'B9 lakeside']] as const) {
    it(`${label}: every monster is actually drawn near its own hitbox`, () => {
      const scene: any = run(idx, 3);
      const counts = drawsAroundMonsters(scene);
      expect(counts.length, 'level has no monsters to check').toBeGreaterThan(0);
      counts.forEach((n, i) => {
        expect(n, `monster ${i} on ${label} drew ${n} ops near itself`).toBeGreaterThan(3);
      });
    });
  }

  it('B3 (cave): player drawn AND soft light punch present with finite geometry', () => {
    /* the Section-3 white-dot bug: darkness ERASE must not swallow the player.
       Player body must be drawn, and the darkness layer must punch a soft
       radial hole (feathered edge) around a screen-space player position. */
    const scene = run(2, 3);
    const playerish = REC.calls.filter(c => c.m === 'fillRoundedRect' && c.args[2] > 20 && c.args[2] < 80 && c.args[3] > 15 && c.args[3] < 70);
    expect(playerish.length, 'player body missing on B3').toBeGreaterThan(0);
    /* Only the darkness layer's punches: the sky layer also draws radial
       gradients now (the biome's celestial halo), and those are ordinary
       fills, not holes cut through the dark. */
    const darkLayer = (scene as any).darkGfx;
    const punches = REC.calls.filter(c => c.m === 'fillRadial' && c.layer === darkLayer);
    expect(punches.length, 'darkness light punch missing on B3').toBeGreaterThan(0);
    for (const p of punches) {
      expect(Number.isFinite(p.args[0]) && Number.isFinite(p.args[1]) && p.args[2] > 0).toBe(true);
      const stops = p.args[3] as [number, number][];
      expect(stops[0][1], 'punch must be fully transparent-making at centre').toBe(1);
      expect(stops[stops.length - 1][1], 'punch edge must feather to 0').toBe(0);
    }
  });

  it('B2 (peaks): the player body is drawn with a valid box', () => {
    run(1, 3);
    const playerish = REC.calls.filter(c => c.m === 'fillRoundedRect' && c.args[2] > 20 && c.args[2] < 80 && c.args[3] > 15 && c.args[3] < 70);
    expect(playerish.length).toBeGreaterThan(0);
  });
});
