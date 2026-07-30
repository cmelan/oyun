/* WORLD — region registry. Geography is the single source of truth: each region
   owns its biome, native tree set, and recognition clue tier; LEVELS/LEVEL_META
   are flattened automatically. Adding a region = one object, no engine change.
   Clue tiers ramp the learning: leaf (B1–B4) → bark (B5–B7) → silhouette (B8–B10). */
import type { LevelData } from './generator';
import { level1, level2, level3, level4, level5, level6, level7, level8, level9, level10 } from './levels';

export type ClueTier = 'leaf' | 'bark' | 'silhouette';
export type LevelFn = (journal?: string[]) => LevelData;

export interface Region {
  id: string; nameKey: string; biome: string; treeSet: string[];
  clueTier: ClueTier;
  levels: LevelFn[];
}

export const WORLD: Region[] = [
  { id: 'cayir', nameKey: 'region.cayir', biome: 'meadow', treeSet: ['meşe', 'çınar', 'ıhlamur'], clueTier: 'leaf', levels: [level1] },
  { id: 'zirveler', nameKey: 'region.zirveler', biome: 'peaks', treeSet: ['çam', 'servi', 'huş', 'akçaağaç'], clueTier: 'leaf', levels: [level2] },
  { id: 'magara', nameKey: 'region.magara', biome: 'cave', treeSet: ['söğüt', 'ginkgo', 'zeytin'], clueTier: 'leaf', levels: [level3] },
  { id: 'kestane', nameKey: 'region.kestane', biome: 'forest', treeSet: ['kestane', 'kayın', 'kavak'], clueTier: 'leaf', levels: [level4] },
  { id: 'toros', nameKey: 'region.toros', biome: 'toros', treeSet: ['toros sediri', 'ardıç', 'sekoya'], clueTier: 'bark', levels: [level5] },
  { id: 'meyve', nameKey: 'region.meyve', biome: 'orchard', treeSet: ['elma', 'kiraz', 'ceviz'], clueTier: 'bark', levels: [level6] },
  { id: 'akdeniz', nameKey: 'region.akdeniz', biome: 'coast', treeSet: ['palmiye', 'incir', 'limon'], clueTier: 'bark', levels: [level7] },
  { id: 'karadeniz', nameKey: 'region.karadeniz', biome: 'rainforest', treeSet: ['ladin', 'fındık', 'kayın'], clueTier: 'silhouette', levels: [level8] },
  { id: 'gol', nameKey: 'region.gol', biome: 'lakeside', treeSet: ['kızılağaç', 'dişbudak', 'söğüt'], clueTier: 'silhouette', levels: [level9] },
  /* mastery region: treeSet is the full learned pool at runtime; listed set is the fresh-save fallback */
  { id: 'usta', nameKey: 'region.usta', biome: 'mastery', treeSet: ['meşe', 'çınar', 'ıhlamur'], clueTier: 'silhouette', levels: [level10] },
];

export interface LevelMeta { regionIdx: number; regionId: string; biome: string; indexInRegion: number }
export const LEVELS: LevelFn[] = [];
export const LEVEL_META: LevelMeta[] = [];
WORLD.forEach((r, ri) => {
  r.levels.forEach((fn, li) => {
    LEVELS.push(fn);
    LEVEL_META.push({ regionIdx: ri, regionId: r.id, biome: r.biome, indexInRegion: li });
  });
});

/* Instantiate a level with region metadata + journal-aware tree state. */
export function prepLevel(idx: number, journal: string[] = []): LevelData {
  const lv = LEVELS[idx](journal);
  lv.biome = LEVEL_META[idx].biome;
  lv.regionIdx = LEVEL_META[idx].regionIdx;
  /* A tree the child already knows greets them awake instead of re-quizzing —
     except the finale tree, whose waking IS the chapter's ending. Pre-waking
     that one would make the chapter impossible to finish on a replay. */
  lv.trees = (lv.trees || []).map(tr => ({
    ...tr,
    awake: !tr.finale && journal.includes(tr.id) && LEVEL_META[idx].regionId !== 'usta',
  }));
  return lv;
}

/* The choice pool for a level's tree cards (mastery uses the journal itself). */
export function regionTreePool(regionIdx: number, journal: string[]): string[] {
  const r = WORLD[regionIdx];
  if (r.id === 'usta' && journal.length >= 3) return journal;
  return r.treeSet;
}
