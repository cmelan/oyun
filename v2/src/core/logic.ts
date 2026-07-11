/* Pure gameplay rules — the empathy loop (sand → blind → heal → happy), sand
   budget, boss finisher resolution, and the tree-choice picker. All headless. */
import { CONFIG } from './config';
import type { BossData, LevelData, MonsterData } from './generator';

/* --- Sand budget: monsters + (boss ? bonus : 0) + buffer, refills at checkpoints --- */
export function sandCapacity(lv: Pick<LevelData, 'monsters' | 'boss'>): number {
  return lv.monsters.length + (lv.boss ? CONFIG.sand.bossBonus : 0) + CONFIG.sand.buffer;
}

/* --- Monster empathy cycle --- */
export type MonsterState = 'angry' | 'blind' | 'happy';
export interface MonsterRuntime extends MonsterData {
  w: number; h: number;
  state: MonsterState; blindT: number; healT: number;
  dir: number; face: number; vx: number; flipT: number;
}
export function makeMonster(d: MonsterData): MonsterRuntime {
  return {
    w: 40, h: 40, /* v1 default box — REQUIRED for draw (ground-h) + hitbox; dropping it makes monsters invisible & non-colliding */
    spd: CONFIG.monster.chase, aggro: CONFIG.monster.aggro, patrolSpd: CONFIG.monster.patrol,
    flip: d.type === 'flipper',
    ...d,
    state: 'angry', blindT: 0, healT: 0,
    dir: -1, face: -1, vx: 0, flipT: 0,
  };
}
export function sandHit(m: MonsterRuntime): void {
  if (m.state === 'happy') return;
  m.state = 'blind'; m.blindT = CONFIG.heal.BLIND_TIME; m.healT = 0;
}
/* Advance blind/heal timers; healing only progresses while `beingHealed`.
   Returns true the moment the monster becomes happy (heart moment). */
export function empathyTick(m: MonsterRuntime, dt: number, beingHealed: boolean): boolean {
  if (m.state === 'happy') return false;
  if (beingHealed && m.state === 'blind') {
    m.healT += dt;
    if (m.healT >= CONFIG.heal.HEAL_TIME) { m.state = 'happy'; m.healT = 0; return true; }
  } else {
    m.healT = Math.max(0, m.healT - dt * CONFIG.heal.decay);
    if (m.state === 'blind') { m.blindT -= dt; if (m.blindT <= 0) m.state = 'angry'; }
  }
  return false;
}

/* --- Boss finisher resolution (the caged→hit step of the v1 state machine) --- */
export function bossSandHit(b: BossData): boolean {
  if (b.state !== 'idle') return false;
  b.state = 'blind'; b.blindT = CONFIG.heal.BOSS_BLIND; b.tel = 0;
  return true;
}
export function bossCageResolve(b: BossData): void {
  b.hp--;
  if (b.hp <= 0) { b.state = 'defeated'; b.defT = CONFIG.boss.defeatT; return; }
  b.state = 'idle';
  b.atkT = CONFIG.boss.atkIntervals[Math.max(0, Math.min(CONFIG.boss.atkIntervals.length - 1, b.hp - 1))] * 0.85;
  b.tel = 0;
  if (b.finisher === 'shrink') b.scale = (b.scale || 1) * CONFIG.boss.shrinkFactor;
}

/* --- Tree choice picker: correct + 2 others from the region pool, shuffled --- */
export function pick3(correctId: string, pool: string[], rng: () => number = Math.random): string[] {
  const others = pool.filter(id => id !== correctId);
  for (let i = others.length - 1; i > 0; i--) {
    const j = (rng() * (i + 1)) | 0; [others[i], others[j]] = [others[j], others[i]];
  }
  const all = [correctId, ...others.slice(0, 2)];
  for (let i = all.length - 1; i > 0; i--) {
    const j = (rng() * (i + 1)) | 0; [all[i], all[j]] = [all[j], all[i]];
  }
  return all;
}

/* --- Mimic boss (Taklitçi): recognition IS the finisher. While blind, ✨ opens
   a "find the real tree" card; a correct answer counts as a cage hit. --- */
export function mimicNextId(pool: string[], exclude: string | undefined, rng: () => number = Math.random): string {
  const options = pool.filter(id => id !== exclude);
  return options.length ? options[(rng() * options.length) | 0] : pool[0];
}

/* --- Invisible assist: repeated deaths in a level gently widen the margins.
   No labels, no shame; resets per level. Bounded so the game never plays itself. --- */
export interface AssistState { deaths: number }
export function assistFactors(a: AssistState): { monsterSpd: number; iframeBonus: number; blindBonus: number } {
  const over = Math.max(0, a.deaths - 2);
  return {
    monsterSpd: Math.max(0.75, 1 - over * 0.08),   /* monsters up to 25% slower */
    iframeBonus: Math.min(0.6, over * 0.2),        /* up to +0.6s invulnerability */
    blindBonus: Math.min(2, over * 0.7),           /* blinded monsters stay calm up to +2s */
  };
}

/* --- Journal family stars: a family with every registered member learned earns a star. --- */
export function familyStars(journal: string[], trees: Record<string, { family: string }>): Record<string, { learned: number; total: number; star: boolean }> {
  const fam: Record<string, { learned: number; total: number; star: boolean }> = {};
  for (const [id, t] of Object.entries(trees)) {
    fam[t.family] = fam[t.family] || { learned: 0, total: 0, star: false };
    fam[t.family].total++;
    if (journal.includes(id)) fam[t.family].learned++;
  }
  for (const f of Object.values(fam)) f.star = f.learned === f.total && f.total > 0;
  return fam;
}

/* --- Geometry helpers shared by tests and engine --- */
export interface Box { x: number; y: number; w: number; h: number }
export const overlap = (a: Box, b: Box): boolean =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

/* Distance from a point to a rect (0 if inside) — used by the tree/puzzle
   zero-conflict guarantee check. */
export function pointRectDist(px: number, py: number, r: Box): number {
  const dx = Math.max(r.x - px, 0, px - (r.x + r.w));
  const dy = Math.max(r.y - py, 0, py - (r.y + r.h));
  return Math.hypot(dx, dy);
}
