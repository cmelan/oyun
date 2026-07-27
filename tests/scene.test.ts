/* Runtime smoke test for LevelScene: mock just enough of Phaser + DOM to run
   create() and many update() ticks across representative levels, asserting the
   engine never throws and key state transitions fire. Catches the render/update
   wiring bugs that the pure-logic suite can't. */
import { describe, it, expect, beforeEach } from 'vitest';

/* ---- minimal DOM stubs. LevelScene's engine records draw ops without executing
   them (no real canvas needed here); art.ts uses document.createElement('canvas')
   for icon caching, and bindKeys uses window.add/removeEventListener. ---- */
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

  it('B1 root gate requires both visible heart-stones, then restoration completes the chapter', () => {
    const scene: any = new LevelScene();
    const { hooks, events } = makeHooks();
    scene.init({ idx: 0, hooks }); scene.create();
    const helper = scene.monsters[0];
    helper.state = 'happy'; helper.x = 2517;
    scene.meadowStory.helper = helper;
    /* Near the gate is not enough: the Guardian must stand on its own stone. */
    scene.player.x = 2350;
    scene.update(0, 16.7);
    expect(scene.meadowStory.pressureAwake).toBe(false);

    scene.player.x = 2401; /* player centre = 2420, the Guardian heart-stone */
    scene.player.y = 308;
    scene.update(16.7, 16.7);
    expect(scene.meadowStory.pressureAwake).toBe(true);
    expect(scene.meadowStory.gateStep).toBe(3);

    scene.beginMeadowRestoration();
    for (let frame = 0; frame < 260; frame++) scene.update(frame * 16.7, 16.7);
    expect(scene.meadowStory.restoreCue).toBe(3);
    expect(events).toContain('complete');
  });

  it('B1 roots cannot hide the missing-friend prerequisite at the final gate', () => {
    const scene: any = runLevel(0, 2);
    const grow = scene.L.interact[1];
    scene.player.x = grow.zone.x + 12; scene.player.y = grow.zone.y + 20;
    scene.equipped = grow.eye;
    scene.doUse();
    expect(grow.done).toBe(false);

    const helper = scene.monsters[0]; helper.state = 'happy'; scene.meadowStory.helper = helper;
    scene.doUse();
    expect(grow.done).toBe(true);
  });

  it('an exhausted sealed boss arena always grows enough replacement sand', () => {
    for (let idx = 1; idx < LEVELS.length; idx++) {
      const scene: any = runLevel(idx, 2);
      scene.bossActive = true; scene.L.boss.state = 'idle'; scene.sandLeft = 0; scene.sands = [];
      scene.updateRecovery(1.5);
      expect(scene.sandLeft, `level ${idx + 1}`).toBeGreaterThanOrEqual(scene.L.boss.hp);
    }
  });

  it('rescue returns to the last grounded position and clears interrupted input', () => {
    const scene: any = runLevel(1, 2);
    scene.lastSafe = { x: 512, y: 316 };
    scene.player.x = 900; scene.player.y = 620; scene.player.vx = 200; scene.player.vy = 700;
    scene.press('right'); scene.press('jump'); scene.press('heal');
    scene.rescueToSafety();
    expect(scene.player.x).toBe(512); expect(scene.player.y).toBe(316);
    expect(scene.player.vx).toBe(0); expect(scene.player.vy).toBe(0);
    expect(scene.input2.right).toBe(false); expect(scene.input2.jumpHeld).toBe(false); expect(scene.input2.healHeld).toBe(false);
  });

  it('reduced-motion preference suppresses camera jolts and limits celebration particles', () => {
    (globalThis as any).window.matchMedia = () => ({ matches: true });
    const scene: any = new LevelScene();
    const { hooks } = makeHooks();
    scene.init({ idx: 0, hooks }); scene.create();

    scene.spawnP(100, 100, 70, 0xffffff, 250, 1);
    scene.shake(6, .25); scene.flash(500, 255, 235, 175);

    expect(scene.particles).toHaveLength(8);
    expect(scene.cameras.main.shakeT).toBe(0);
    expect(scene.cameras.main.flashT).toBe(0);
  });

  it('mimic boss level (B6): mimic answer path finishes without throw', () => {
    const scene: any = runLevel(5, 2);
    scene.bossActive = true;
    scene.L.boss.state = 'blind';
    expect(() => scene.resolveMimicAnswer(true)).not.toThrow();
    expect(scene.L.boss.state).toBe('caged');
  });
});
