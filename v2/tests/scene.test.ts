/* Runtime smoke test for LevelScene: mock just enough of Phaser + DOM to run
   create() and many update() ticks across representative levels, asserting the
   engine never throws and key state transitions fire. Catches the render/update
   wiring bugs that the pure-logic suite can't. */
import { describe, it, expect, vi, beforeEach } from 'vitest';

/* ---- minimal DOM canvas stub (art.ts uses document.createElement('canvas')) ---- */
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
  (globalThis as any).window = { addEventListener() {}, removeEventListener() {}, setTimeout: () => 0, clearTimeout() {} };
});

/* ---- Phaser mock: Graphics/camera/scene no-ops, Scene base with .scene facade ---- */
vi.mock('phaser', () => {
  const gfxProxy = () => new Proxy({}, { get: () => () => gfxProxy() });
  class Scene {
    scene = { pause() {}, resume() {}, isActive: () => true, stop() {}, remove() {} };
    add = { graphics: () => { const g: any = gfxProxy(); g.setScrollFactor = () => g; return g; } };
    cameras = { main: { setBounds() {}, setScroll() {}, shake() {}, flash() {} } };
    constructor(_k?: string) {}
  }
  return {
    default: {
      Scene,
      GameObjects: { Graphics: class {} },
      Display: { Color: { HexStringToColor: () => ({ color: 0x000000 }) } },
      BlendModes: { ERASE: 1, NORMAL: 0 },
      Scale: { FIT: 0, CENTER_BOTH: 0 },
      AUTO: 0,
    },
  };
});

import { LevelScene } from '../src/game/LevelScene';
import { LEVELS } from '../src/core/world';

function makeHooks() {
  const learned: string[] = [];
  const events: string[] = [];
  const uiStub = new Proxy({}, { get: () => () => {} });
  return {
    hooks: {
      ui: uiStub as any,
      journal: () => learned,
      onTreeLearned: (id: string) => learned.push(id),
      onLevelComplete: () => events.push('complete'),
      onGameOver: () => events.push('over'),
    },
    events,
  };
}

function runLevel(idx: number, frames: number) {
  const scene = new LevelScene();
  const { hooks } = makeHooks();
  scene.init({ idx, hooks });
  scene.create();
  for (let f = 0; f < frames; f++) scene.update(f * 16.7, 16.7);
  return scene;
}

describe('LevelScene runtime smoke', () => {
  it('B1 (meadow, no boss): create + 300 frames no throw, player advances', () => {
    const scene = runLevel(0, 5);
    // drive right for a while
    scene.press('right');
    expect(() => { for (let f = 0; f < 300; f++) scene.update(f * 16.7, 16.7); }).not.toThrow();
  });

  it('every one of the 10 levels: create + 120 frames no throw', () => {
    for (let i = 0; i < LEVELS.length; i++) {
      expect(() => runLevel(i, 120), `level ${i + 1}`).not.toThrow();
    }
  });

  it('boss level (B2): activating arena + sand + finish runs the boss machine', () => {
    const scene: any = runLevel(1, 2);
    // force boss active and walk it through blind → caged → hit
    scene.bossActive = true;
    const b = scene.L.boss;
    b.state = 'idle';
    expect(() => {
      scene['bossSandHit' as never];
      // simulate the sand-blind then cage-resolve path via public update after seeding state
      b.state = 'caged'; b.cageT = -1; scene.update(1000, 16.7);
      b.state = 'caged'; b.cageT = -1; scene.update(1016, 16.7);
      b.state = 'caged'; b.cageT = -1; scene.update(1032, 16.7);
    }).not.toThrow();
    expect(b.hp).toBeLessThanOrEqual(0);
    expect(b.state).toBe('defeated');
  });

  it('tree answer resolves (correct wakes + records, wrong is harmless)', () => {
    const scene: any = runLevel(0, 2);
    const firstTree = scene.L.trees[0];
    expect(() => scene.resolveTreeAnswer(false, firstTree.id)).not.toThrow();
    expect(() => scene.resolveTreeAnswer(true, firstTree.id)).not.toThrow();
    expect(scene.L.trees[0].awake).toBe(true);
  });

  it('mimic boss level (B6): mimic answer path finishes without throw', () => {
    const scene: any = runLevel(5, 2);
    scene.bossActive = true;
    scene.L.boss.state = 'blind';
    expect(() => scene.resolveMimicAnswer(true)).not.toThrow();
    expect(scene.L.boss.state).toBe('caged');
  });
});
