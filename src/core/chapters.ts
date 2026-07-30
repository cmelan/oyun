/* CHAPTERS — what a level is ABOUT, as data.

   `updateObjective` used to be a two-branch `if`: branch one was Level 1's
   entire seven-step script written inline against `interact[0..2]` by array
   index, and branch two was a fixed three-step ["→","🏖️","✨"] that all nine
   other levels shared verbatim. Nine of ten chapters said the same sentence.

   A chapter is a list of steps. Each step knows its icon, its spoken label, and
   how to tell whether it is done. The first step that is not done is the
   current one — that is the whole evaluation rule. */

/** Everything a step is allowed to look at. Deliberately narrow: a step may ask
 *  about progress, never reach into the scene and change it. */
export interface ChapterState {
  /** Per-puzzle completion, in level order. */
  puzzles: boolean[];
  /** Creatures restored so far, and how many the level holds. */
  healed: number;
  creatures: number;
  /** Trees woken, and the level's total. */
  treesAwake: number;
  trees: number;
  /** The finale tree specifically — its waking ends chapters that have one. */
  finaleAwake: boolean;
  bossActive: boolean;
  bossCalmed: boolean;
  /** Meadow's cooperative root gate. */
  gateOpen: boolean;
  /** Fraction of the level walked, 0..1. */
  progress: number;
}

export interface ChapterStep {
  icon: string;
  /** i18n key for the spoken/displayed label. */
  labelKey: string;
  done: (s: ChapterState) => boolean;
}

export interface Chapter {
  /** Stable id — not the flat level index, which shifts when levels are added. */
  id: string;
  steps: ChapterStep[];
}

/* --- reusable step builders, so a chapter is a sentence not a program --- */

const puzzle = (i: number, icon: string, labelKey: string): ChapterStep =>
  ({ icon, labelKey, done: s => !!s.puzzles[i] });
const befriend = (n: number, icon: string, labelKey: string): ChapterStep =>
  ({ icon, labelKey, done: s => s.healed >= n });
const wake = (n: number, icon: string, labelKey: string): ChapterStep =>
  ({ icon, labelKey, done: s => s.treesAwake >= n });
const reach = (frac: number, icon: string, labelKey: string): ChapterStep =>
  ({ icon, labelKey, done: s => s.progress >= frac });
const calmBoss = (icon: string, labelKey: string): ChapterStep =>
  ({ icon, labelKey, done: s => s.bossCalmed });
const finale = (icon: string, labelKey: string): ChapterStep =>
  ({ icon, labelKey, done: s => s.finaleAwake });

/* --- the ten chapters ---
   Each opens on its own verb, escalates, and ends on its own payoff. No two
   share a step sequence; there is a test for that. */

export const CHAPTERS: Record<string, Chapter> = {
  cayir: {
    id: 'cayir',
    steps: [
      puzzle(0, '❄️', 'objective.meadow.freeze'),
      befriend(1, '💛', 'objective.meadow.friend'),
      puzzle(1, '🌿', 'objective.meadow.grow'),
      puzzle(2, '🌀', 'objective.meadow.bridge'),
      { icon: '💛', labelKey: 'objective.meadow.gate', done: s => s.gateOpen },
      finale('🌳', 'objective.meadow.oak'),
      { icon: '✨', labelKey: 'objective.meadow.restore', done: () => false },
    ],
  },
  zirveler: {
    id: 'zirveler',
    steps: [
      /* Peaks climb through cloud; Toros shelters from wind. Distinct verbs, so
         distinct icons — a pre-reader navigates by these, not by the label. */
      reach(.18, '☁️', 'objective.zirveler.climb'),
      befriend(1, '🕊️', 'objective.zirveler.chick'),
      wake(2, '🌲', 'objective.zirveler.trees'),
      calmBoss('🏖️', 'objective.zirveler.giant'),
      { icon: '✨', labelKey: 'objective.zirveler.summit', done: () => false },
    ],
  },
  magara: {
    id: 'magara',
    steps: [
      puzzle(0, '🟣', 'objective.magara.rock'),
      { icon: '🔥', labelKey: 'objective.magara.light', done: s => s.puzzles.filter(Boolean).length >= 3 },
      befriend(1, '💛', 'objective.magara.newt'),
      calmBoss('🏖️', 'objective.magara.deep'),
      { icon: '✨', labelKey: 'objective.magara.grove', done: () => false },
    ],
  },
  kestane: {
    id: 'kestane',
    steps: [
      reach(.16, '🌰', 'objective.kestane.husks'),
      befriend(1, '💛', 'objective.kestane.curled'),
      wake(2, '🌳', 'objective.kestane.trees'),
      calmBoss('🏖️', 'objective.kestane.keeper'),
      { icon: '✨', labelKey: 'objective.kestane.canopy', done: () => false },
    ],
  },
  toros: {
    id: 'toros',
    steps: [
      reach(.15, '🌬️', 'objective.toros.wind'),
      befriend(1, '💛', 'objective.toros.lamb'),
      wake(2, '🌲', 'objective.toros.cedars'),
      calmBoss('🏖️', 'objective.toros.shiver'),
      { icon: '✨', labelKey: 'objective.toros.settle', done: () => false },
    ],
  },
  meyve: {
    id: 'meyve',
    steps: [
      reach(.15, '🌸', 'objective.meyve.blossom'),
      befriend(1, '💛', 'objective.meyve.bird'),
      wake(2, '🍎', 'objective.meyve.match'),
      calmBoss('🌳', 'objective.meyve.mimic'),
      { icon: '✨', labelKey: 'objective.meyve.harvest', done: () => false },
    ],
  },
  akdeniz: {
    id: 'akdeniz',
    steps: [
      reach(.15, '🌊', 'objective.akdeniz.shore'),
      befriend(1, '💛', 'objective.akdeniz.crab'),
      wake(2, '🌴', 'objective.akdeniz.trees'),
      calmBoss('🏖️', 'objective.akdeniz.tide'),
      { icon: '✨', labelKey: 'objective.akdeniz.green', done: () => false },
    ],
  },
  karadeniz: {
    id: 'karadeniz',
    steps: [
      puzzle(0, '🔥', 'objective.karadeniz.torch'),
      befriend(1, '💛', 'objective.karadeniz.deer'),
      wake(2, '🌲', 'objective.karadeniz.trees'),
      calmBoss('🏖️', 'objective.karadeniz.sleeper'),
      { icon: '✨', labelKey: 'objective.karadeniz.clear', done: () => false },
    ],
  },
  gol: {
    id: 'gol',
    steps: [
      reach(.15, '💧', 'objective.gol.water'),
      befriend(1, '💛', 'objective.gol.heron'),
      wake(2, '🌿', 'objective.gol.reeds'),
      calmBoss('🌳', 'objective.gol.mirror'),
      { icon: '✨', labelKey: 'objective.gol.still', done: () => false },
    ],
  },
  usta: {
    id: 'usta',
    steps: [
      reach(.12, '📖', 'objective.usta.remember'),
      wake(2, '🌳', 'objective.usta.name'),
      befriend(1, '💛', 'objective.usta.echo'),
      calmBoss('🌳', 'objective.usta.final'),
      { icon: '⭐', labelKey: 'objective.usta.garden', done: () => false },
    ],
  },
};

/** Fallback for a region with no authored chapter — still better than the old
 *  shared three-step, because it names what the level actually contains. */
export const DEFAULT_CHAPTER: Chapter = {
  id: 'default',
  steps: [
    reach(.2, '→', 'objective.explore'),
    befriend(1, '💛', 'objective.generic.friend'),
    calmBoss('🏖️', 'objective.boss'),
    { icon: '✨', labelKey: 'objective.generic.restore', done: () => false },
  ],
};

export function chapterFor(regionId: string | undefined): Chapter {
  return (regionId && CHAPTERS[regionId]) || DEFAULT_CHAPTER;
}

/** The current step is the first one not yet done. Returns the last index when
 *  everything is done, so the bar never goes blank at the end. */
export function currentStep(chapter: Chapter, state: ChapterState): number {
  const i = chapter.steps.findIndex(step => !step.done(state));
  return i === -1 ? chapter.steps.length - 1 : i;
}
