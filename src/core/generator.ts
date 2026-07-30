/* Section generator — ported verbatim from v1. SECTION_RHYTHM + fixed GAP are the
   PROVEN B1 platform/gap values: generated levels never produce an unfair jump.
   Calm platforms (tree + checkpoint) and puzzle platforms alternate, so tree vs
   puzzle-zone conflicts are impossible by construction. */
import type { Eye } from './config';

export interface Rect { x: number; y: number; w: number; h: number; bounce?: boolean }
export interface Interact {
  type: string; eye: Eye; done: boolean; zone: Rect;
  [k: string]: unknown;
}
export interface MonsterData {
  x: number; gx0: number; gx1: number; ground: number; lo: number; hi: number;
  spd?: number; aggro?: number; patrolSpd?: number; flip?: boolean; type?: string;
}
export type Finisher = 'cage' | 'shrink';
export type BossKind = 'thrower' | 'mimic';
export interface BossData {
  kind: BossKind;
  /* mimic only: id of the tree the boss imitates (rotates per hit) */
  mimicId?: string;
  x: number; w: number; h: number; ground: number; hp: number;
  state: 'sleep' | 'idle' | 'blind' | 'caged' | 'defeated';
  face: number; atkT: number; tel: number; blindT: number; cageT: number; defT: number;
  paceDir: number; px0: number; px1: number; shake: number;
  cageEye: Eye; finisher: Finisher; scale: number;
}
/* `finale` marks the tree a chapter's ending depends on. A finale tree is never
   pre-woken from the journal: completion must never be satisfiable by a save
   file, or the chapter becomes unfinishable on replay. */
export interface TreeInstance { id: string; x: number; y: number; awake?: boolean; finale?: boolean }
export interface LevelData {
  name: string; w: number; deathY: number; gentle: boolean;
  spawn: { x: number; y: number };
  platforms: Rect[]; water: { x: number; top: number; w: number } | null;
  interact: Interact[]; monsters: MonsterData[];
  boss: BossData | null; arena: { trig: number; wall: Rect } | null;
  checkpoints: { x: number; y: number }[]; goal: { x: number; y: number; r: number } | null;
  hasSand: boolean; hasHeal: boolean; trees: TreeInstance[];
  intros: { x: number; text: string }[];
  biome?: string; regionIdx?: number; cave?: boolean; dark?: boolean;
}

export interface Recipe {
  name: string; biome: string; treeIds: string[]; tier?: number;
  puzzleTypes: string[]; cageEye: Eye; finisher: Finisher; hint?: string;
  bossKind?: BossKind;
}

export const SECTION_RHYTHM: { w: number; h: number }[] = [
  { w: 380, h: 240 }, { w: 300, h: 240 }, { w: 460, h: 240 },
  { w: 220, h: 245 }, { w: 240, h: 248 }, { w: 260, h: 252 },
];
export const GAP = 140; /* proven gap from B1 */
/** How much of a platform's left edge stays clear of creatures, so a jump can
 *  always be landed before anything has to be dealt with. */
export const LANDING_ZONE = 96;

export const PUZZLE_FACTORY: Record<string, (x: number, gy: number) => Interact> = {
  freeze: (x, gy) => ({ type: 'freeze', eye: 'blue', done: false, zone: { x: x - 20, y: gy - 90, w: 200, h: 150 }, ice: { x: x + 20, y: gy, w: 280, h: 40 } }),
  thorn: (x, gy) => ({ type: 'thorn', eye: 'red', done: false, zone: { x, y: gy - 134, w: 170, h: 120 }, wall: { x: x + 80, y: gy - 124, w: 28, h: 124 }, em: { x: x + 94, y: gy - 145 } }),
  grow: (x, gy) => ({ type: 'grow', eye: 'green', done: false, zone: { x, y: gy - 90, w: 130, h: 100 }, sprout: { x: x + 60, y: gy }, leaves: [{ x: x + 120, y: gy - 10, w: 80, h: 18 }, { x: x + 220, y: gy - 10, w: 80, h: 18 }], em: { x: x + 60, y: gy - 42 } }),
  bridge: (x, gy) => ({ type: 'bridge', eye: 'yellow', done: false, zone: { x, y: gy - 90, w: 140, h: 110 }, bridge: { x: x + 100, y: gy - 8, w: 220, h: 18 }, ropeX: x + 210, anchorY: gy - 100, em: { x: x + 210, y: gy - 50 } }),
  rock: (x, gy) => ({ type: 'rock', eye: 'purple', done: false, zone: { x, y: gy - 90, w: 160, h: 110 }, block: { x: x + 100, y: gy - 100, w: 52, h: 100 }, em: { x: x + 126, y: gy - 118 } }),
  mush: (x, gy) => ({ type: 'mush', eye: 'purple', done: false, zone: { x, y: gy - 70, w: 150, h: 100 }, sprout: { x: x + 60, y: gy }, pad: { x: x + 80, y: gy - 8, w: 120, h: 20, bounce: true }, em: { x: x + 60, y: gy - 38 } }),
  torch: (x, gy) => ({ type: 'torch', eye: 'red', done: false, zone: { x, y: gy - 140, w: 140, h: 130 }, x: x + 70, y: gy - 90, em: { x: x + 70, y: gy - 140 } }),
};

export function makeSection(recipe: Recipe): LevelData {
  const { name, treeIds, tier = 1, puzzleTypes, cageEye, finisher, hint, bossKind = 'thrower' } = recipe;
  const pairCount = Math.max(treeIds.length, puzzleTypes.length, 3); /* rule: min 3 tree/puzzle pairs */
  const segCount = pairCount * 2 + 2; /* [calm+puzzle] per tree + final 2 boss segments */
  const platforms: Rect[] = []; let x = 20;
  for (let i = 0; i < segCount; i++) {
    const r = SECTION_RHYTHM[i % SECTION_RHYTHM.length], y = 370 - ((Math.floor(i / 2) % 3) * 6);
    /* The gap stays at the proven B1 value for every tier. It used to widen by
       up to 30px with tier, which pushed the widest gaps to 170px against a
       full-speed perfect jump of ~198px — a timing margin of about a tenth of a
       second. That escalates the one axis a five-year-old cannot improve at.
       Difficulty ramps through puzzle chaining and creature variety instead. */
    platforms.push({ x, y, w: r.w, h: r.h }); x += r.w + GAP;
  }
  const w = x + 420;
  const calmP: Rect[] = [], puzzleP: Rect[] = [];
  for (let i = 0; i < segCount - 2; i++) (i % 2 === 0 ? calmP : puzzleP).push(platforms[i]);
  const checkpoints: { x: number; y: number }[] = [], trees: TreeInstance[] = [];
  treeIds.forEach((tid, i) => {
    const p = calmP[Math.min(i, calmP.length - 1)];
    checkpoints.push({ x: p.x + 22, y: p.y }); trees.push({ id: tid, x: p.x + p.w - 46, y: p.y });
  });
  const interact = puzzleP.map((p, i) => PUZZLE_FACTORY[puzzleTypes[i % puzzleTypes.length]](p.x + p.w * 0.22, p.y));
  const monsters: MonsterData[] = puzzleP.map((p, i) => {
    /* Keep every creature clear of the landing zone. Patrol used to start at
       p.x + 16 with lo = p.x - 14, so a creature could stand ON the spot an
       incoming jump lands — and did: the child crossed the gap, touched it on
       touchdown, was knocked back into the pit, and lost the chapter to three
       deaths in eight seconds. A frightened creature must never be the first
       thing a landing foot meets. */
    const gx0 = p.x + LANDING_ZONE, gx1 = Math.max(gx0 + 40, p.x + p.w - 16);
    return {
      x: (gx0 + gx1) / 2, gx0, gx1, ground: p.y,
      lo: p.x + LANDING_ZONE - 24, hi: gx1 + 30,
      spd: 82 + tier * 10, aggro: 165 + tier * 12, patrolSpd: 34 + tier * 3, flip: (i % 3 === 2),
    };
  });
  const lastCalm = platforms[segCount - 2], lastPlat = platforms[segCount - 1];
  /* A checkpoint at the arena door. Without it the last checkpoint sat on a
     calm platform around the level's midpoint, so losing to the boss rewound
     the child through the entire back half of the chapter — the single most
     discouraging thing a level can do to a five-year-old. */
  checkpoints.push({ x: lastCalm.x + 22, y: lastCalm.y });
  const boss: BossData = {
    kind: bossKind,
    x: lastPlat.x + lastPlat.w * 0.35, w: 88, h: 88, ground: lastPlat.y, hp: 3, state: 'sleep',
    face: -1, atkT: 1.8, tel: 0, blindT: 0, cageT: 0, defT: 0, paceDir: -1,
    px0: lastPlat.x + 40, px1: lastPlat.x + lastPlat.w - 120, shake: 0, cageEye, finisher, scale: 1,
  };
  const arena = { trig: lastCalm.x + 30, wall: { x: lastCalm.x - 8, y: 120, w: 14, h: 500 } };
  return {
    /* A fall returns the child to the last checkpoint and costs no heart —
       the same rule the Meadow already used. Hearts are for creature contact,
       which the child can understand and act on; a pit is a slip, and charging
       a life for it turned every chapter into attrition. Measured: pits caused
       nearly every lost heart in end-to-end playthroughs. Losing the ground you
       walked is still a real cost. */
    name, w, deathY: 760, gentle: true, spawn: { x: 90, y: 300 }, platforms, water: null,
    interact, monsters, boss, arena, checkpoints, goal: null, hasSand: true, hasHeal: true, trees,
    intros: [{ x: 60, text: hint || 'Yeni bir bölge — ağaçları bul, bulmacaları çöz!' }],
  };
}
