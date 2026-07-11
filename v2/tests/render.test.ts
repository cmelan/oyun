/* Rendering regression: record every geometry draw call the scene issues and
   assert none carry NaN/undefined coordinates (that's the exact failure mode of
   the missing monster w/h — monsters drew at ground-undefined = NaN and vanished),
   and that monsters + player are actually drawn on representative levels. */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Graphics } from '../src/game/engine';
import { LevelScene } from '../src/game/LevelScene';

const REC = { calls: [] as { m: string; args: any[] }[] };
/* every geometry method whose coordinates must stay finite */
const GEOM = ['fillRoundedRect', 'strokeRoundedRect', 'fillRect', 'strokeRect', 'fillCircle', 'strokeCircle', 'fillTriangle', 'fillEllipse', 'moveTo', 'lineTo', 'arc', 'translateCanvas', 'rotateCanvas'];

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
      REC.calls.push({ m, args });
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
  for (const idx of [0, 1, 5]) {
    it(`level ${idx + 1}: no NaN/undefined draw coordinates over 200 frames`, () => {
      run(idx, 200);
      /* the monster bug produced undefined w/h and NaN y; a rounded-rect radius may
         legitimately be an object ({tl,tr,bl,br}) so only flag undefined + NaN numbers */
      const bad = REC.calls.filter(c => c.args.some(a => a === undefined || (typeof a === 'number' && Number.isNaN(a))));
      expect(bad.slice(0, 5), `bad draw calls: ${JSON.stringify(bad.slice(0, 5))}`).toHaveLength(0);
      expect(REC.calls.length).toBeGreaterThan(100);
    });
  }

  it('B1: monsters are actually drawn (40×40 body rects present)', () => {
    run(0, 3);
    const monsterBodies = REC.calls.filter(c => c.m === 'fillRoundedRect' && c.args[2] === 40 && c.args[3] === 40);
    expect(monsterBodies.length).toBeGreaterThan(0);
  });

  it('B2 (peaks): monsters drawn AND player body drawn with valid box', () => {
    run(1, 3);
    const monsters = REC.calls.filter(c => c.m === 'fillRoundedRect' && c.args[2] === 40 && c.args[3] === 40);
    expect(monsters.length, 'monsters missing on B2').toBeGreaterThan(0);
    /* player body: a rounded rect ~38 wide, finite everywhere */
    const playerish = REC.calls.filter(c => c.m === 'fillRoundedRect' && c.args[2] > 20 && c.args[2] < 80 && c.args[3] > 15 && c.args[3] < 70);
    expect(playerish.length).toBeGreaterThan(0);
  });
});
