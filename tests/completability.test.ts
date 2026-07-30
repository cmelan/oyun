/* Completability guard.

   A chapter must never be finishable-in-theory-only. The bug this suite exists
   to prevent: Level 1's ending is "wake the Ancient Oak", but `prepLevel` used
   to pre-wake any tree already in the journal — so the moment a child learned
   'meşe', the free chapter had no card to open, no goal, and no boss, and could
   never be completed again. It was reachable by simply playing the free chapter
   twice, which is exactly what a competition judge does.

   The invariant: from ANY save state, every level must still expose at least one
   thing that can end it. */
import { describe, it, expect, beforeEach } from 'vitest';
import { LEVELS, prepLevel, LEVEL_META } from '../src/core/world';
import { TREES } from '../src/core/trees';

const EVERY_TREE = Object.keys(TREES);

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

/* The three things that can end a level: a boss to restore, a goal to reach, or
   a finale tree still asleep. */
function endings(idx: number, journal: string[]) {
  const lv = prepLevel(idx, journal);
  return {
    boss: !!lv.boss,
    goal: !!lv.goal,
    sleepingFinaleTree: lv.trees.some(t => t.finale && !t.awake),
    anySleepingTree: lv.trees.some(t => !t.awake),
  };
}
const completable = (e: ReturnType<typeof endings>) => e.boss || e.goal || e.sleepingFinaleTree;

describe('every level stays completable whatever the save says', () => {
  for (const journalName of ['a fresh save', 'a save that has learned every tree']) {
    const journal = journalName === 'a fresh save' ? [] : EVERY_TREE;
    it(`with ${journalName}, all ${LEVELS.length} levels can still be ended`, () => {
      for (let idx = 0; idx < LEVELS.length; idx++) {
        const e = endings(idx, journal);
        expect(completable(e), `level ${idx + 1} (${LEVEL_META[idx].regionId}) has no ending: ${JSON.stringify(e)}`).toBe(true);
      }
    });
  }

  it('the free Meadow chapter is replayable: its finale tree is never pre-woken', () => {
    /* The exact reproduction of the shipped bug. */
    const replay = prepLevel(0, ['meşe', 'çınar', 'ıhlamur']);
    const finale = replay.trees.find(t => t.finale);
    expect(finale, 'level 1 must declare a finale tree').toBeDefined();
    expect(finale!.id).toBe('meşe');
    expect(finale!.awake, 'the finale tree must start asleep even on a replay').toBe(false);
  });

  it('non-finale trees are still greeted awake, so replays are not a re-quiz', () => {
    const replay = prepLevel(0, ['meşe', 'çınar', 'ıhlamur']);
    const ordinary = replay.trees.filter(t => !t.finale);
    expect(ordinary.length).toBeGreaterThan(0);
    expect(ordinary.every(t => t.awake)).toBe(true);
  });

  it('the finale tree is found by data, not by its x position', async () => {
    /* Moving the oak must not break the chapter — the old code located it with
       `x > 2800`, so a level edit could silently sever the ending. */
    const { LevelScene } = await import('../src/game/LevelScene');
    const scene: any = new LevelScene();
    scene.init({
      idx: 0,
      hooks: {
        ui: new Proxy({}, { get: () => () => {} }) as any,
        journal: () => [], onTreeLearned() {}, onLevelComplete() {}, onGameOver() {},
      },
    });
    scene.create();
    const oak = scene.finaleTree();
    expect(oak?.id).toBe('meşe');

    oak.x = 1234;                       /* relocate the finale */
    expect(scene.finaleTree()?.x).toBe(1234);
    expect(scene.finaleTree()?.id).toBe('meşe');
  });
});

describe('replaying the Meadow can still reach its ending', () => {
  it('standing at the oak on a replay opens the recognition card', async () => {
    const { LevelScene } = await import('../src/game/LevelScene');
    const opened: string[] = [];
    const scene: any = new LevelScene();
    scene.init({
      idx: 0,
      hooks: {
        ui: new Proxy({}, {
          get: (_t, p) => (...args: any[]) => { if (p === 'showTreeQuestion') opened.push(args[0]); },
        }) as any,
        journal: () => ['meşe', 'çınar', 'ıhlamur'],
        onTreeLearned() {}, onLevelComplete() {}, onGameOver() {},
      },
    });
    scene.create();

    const oak = scene.finaleTree();
    scene.player.x = oak.x - 40;
    scene.player.y = oak.y - scene.player.h;
    scene.player.vx = 0; scene.player.vy = 0;
    scene.update(0, 16.7);

    expect(scene.nearTree?.id, 'the oak must be reachable on a replay').toBe('meşe');
    scene.doUse();
    expect(opened, 'pressing ✨ at the oak must open its card').toEqual(['meşe']);
  });
});
