/* Chapter script regression.

   Nine of ten levels used to display the identical objective bar
   "→ 🏖️ ✨  Follow the glowing path". These tests keep every chapter speaking
   with its own voice, keep the Meadow's original seven beats intact through the
   migration, and keep the evaluation rule honest. */
import { describe, it, expect, beforeEach } from 'vitest';
import { CHAPTERS, DEFAULT_CHAPTER, chapterFor, currentStep, type ChapterState } from '../src/core/chapters';
import { WORLD, LEVEL_META, LEVELS } from '../src/core/world';
import { STR, LANGS, setLang, S } from '../src/core/i18n';

const blank = (over: Partial<ChapterState> = {}): ChapterState => ({
  puzzles: [], healed: 0, creatures: 1, treesAwake: 0, trees: 3,
  finaleAwake: false, bossActive: false, bossCalmed: false,
  gateOpen: false, progress: 0, ...over,
});

beforeEach(() => setLang('tr'));

describe('every region has its own chapter', () => {
  it('all ten regions resolve to an authored chapter, not the fallback', () => {
    for (const region of WORLD) {
      const chapter = chapterFor(region.id);
      expect(chapter.id, `region "${region.id}" fell back to the default chapter`).toBe(region.id);
    }
  });

  it('an unknown region falls back rather than throwing', () => {
    expect(chapterFor(undefined)).toBe(DEFAULT_CHAPTER);
    expect(chapterFor('not-a-region')).toBe(DEFAULT_CHAPTER);
  });

  it('no two chapters share a step sequence', () => {
    /* The exact failure being prevented: nine chapters with one shared bar. */
    const seen = new Map<string, string>();
    for (const [id, chapter] of Object.entries(CHAPTERS)) {
      const sig = chapter.steps.map(s => `${s.icon}/${s.labelKey}`).join('>');
      const clash = seen.get(sig);
      expect(clash, `${id} has the same objective script as ${clash}`).toBeUndefined();
      seen.set(sig, id);
    }
  });

  it('no two chapters even share an icon sequence', () => {
    const seen = new Map<string, string>();
    for (const [id, chapter] of Object.entries(CHAPTERS)) {
      const sig = chapter.steps.map(s => s.icon).join('');
      const clash = seen.get(sig);
      expect(clash, `${id} shows the same icons as ${clash}`).toBeUndefined();
      seen.set(sig, id);
    }
  });

  it('every chapter has a real arc, not a single state', () => {
    for (const [id, chapter] of Object.entries(CHAPTERS)) {
      expect(chapter.steps.length, `${id} is too short to be an arc`).toBeGreaterThanOrEqual(4);
      expect(chapter.steps.length, `${id} has more beats than a child will track`).toBeLessThanOrEqual(8);
    }
  });

  it('every chapter ends on a step that never completes, so the bar never blanks', () => {
    for (const [id, chapter] of Object.entries(CHAPTERS)) {
      const last = chapter.steps[chapter.steps.length - 1];
      const everythingDone = blank({
        puzzles: [true, true, true, true], healed: 9, treesAwake: 9,
        finaleAwake: true, bossActive: true, bossCalmed: true, gateOpen: true, progress: 1,
      });
      expect(last.done(everythingDone), `${id}'s final step can complete, leaving an empty bar`).toBe(false);
    }
  });
});

describe('step evaluation', () => {
  it('the current step is the first unfinished one', () => {
    const cayir = CHAPTERS.cayir;
    expect(currentStep(cayir, blank())).toBe(0);
    expect(currentStep(cayir, blank({ puzzles: [true] }))).toBe(1);
    expect(currentStep(cayir, blank({ puzzles: [true], healed: 1 }))).toBe(2);
    expect(currentStep(cayir, blank({ puzzles: [true, true], healed: 1 }))).toBe(3);
  });

  it('the Meadow keeps the seven beats it shipped with', () => {
    /* The migration off the inline if-chain must not change what the child
       sees in the one chapter that was already award-quality. */
    expect(CHAPTERS.cayir.steps.map(s => s.icon)).toEqual(['❄️', '💛', '🌿', '🌀', '💛', '🌳', '✨']);
    expect(CHAPTERS.cayir.steps.map(s => s.labelKey)).toEqual([
      'objective.meadow.freeze', 'objective.meadow.friend', 'objective.meadow.grow',
      'objective.meadow.bridge', 'objective.meadow.gate', 'objective.meadow.oak',
      'objective.meadow.restore',
    ]);
  });

  it('the Meadow gate step needs the gate, not just the puzzles', () => {
    const beforeGate = blank({ puzzles: [true, true, true], healed: 1 });
    expect(currentStep(CHAPTERS.cayir, beforeGate)).toBe(4);
    expect(currentStep(CHAPTERS.cayir, { ...beforeGate, gateOpen: true })).toBe(5);
  });

  it('never returns an out-of-range index', () => {
    for (const chapter of Object.values(CHAPTERS)) {
      for (const state of [blank(), blank({ progress: 1, healed: 9, treesAwake: 9, bossCalmed: true, gateOpen: true, finaleAwake: true, puzzles: [true, true, true, true] })]) {
        const i = currentStep(chapter, state);
        expect(i).toBeGreaterThanOrEqual(0);
        expect(i).toBeLessThan(chapter.steps.length);
      }
    }
  });
});

describe('chapter labels are localised', () => {
  it('every step label exists in Turkish', () => {
    for (const [id, chapter] of Object.entries(CHAPTERS)) {
      for (const step of chapter.steps) {
        expect(STR.tr[step.labelKey], `${id}: missing tr string for ${step.labelKey}`).toBeDefined();
      }
    }
    for (const step of DEFAULT_CHAPTER.steps) {
      expect(STR.tr[step.labelKey], `default chapter: missing tr string for ${step.labelKey}`).toBeDefined();
    }
  });

  it('every step label exists in every shipped language', () => {
    for (const lang of LANGS) {
      for (const [id, chapter] of Object.entries(CHAPTERS)) {
        for (const step of chapter.steps) {
          expect(STR[lang][step.labelKey], `${id}: missing ${lang} string for ${step.labelKey}`).toBeDefined();
        }
      }
    }
  });

  it('a label never renders as its own key', () => {
    for (const lang of LANGS) {
      setLang(lang);
      for (const chapter of Object.values(CHAPTERS)) {
        for (const step of chapter.steps) {
          expect(S(step.labelKey), `${lang}/${step.labelKey} fell through to the key`).not.toBe(step.labelKey);
        }
      }
    }
  });
});

describe('every level in the world gets a chapter', () => {
  it('all ten', () => {
    for (let idx = 0; idx < LEVELS.length; idx++) {
      const chapter = chapterFor(LEVEL_META[idx].regionId);
      expect(chapter.steps.length, `level ${idx + 1}`).toBeGreaterThan(0);
      expect(chapter.id, `level ${idx + 1} has no authored chapter`).not.toBe('default');
    }
  });
});
