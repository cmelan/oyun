/* CONFIG — ported verbatim from v1 (game feel values are proven, do not tune casually). */
export const CONFIG = {
  canvas: { W: 960, H: 540, maxDPR: 2 },
  physics: { GRAV: 2000, MOVE: 275, ACCEL: 2800, FRICTION: 2600, JUMP_V: 720, JUMP_CUT: 260, MAX_FALL: 1150, BOUNCE: 1000, COYOTE: 0.10, JBUF: 0.13 },
  player: { w: 38, h: 44, IFRAME: 1.2 },
  heal: { BLIND_TIME: 4.5, HEAL_TIME: 1.4, BOSS_BLIND: 4.2, range: 34, vRange: 70, decay: 2 },
  sand: { SPD: 440, vy0: -150, grav: 1400, life: 1.1, buffer: 2, bossBonus: 3 },
  monster: { chase: 130, aggro: 240, patrol: 55, happy: 35, flipMin: 1.4, flipRand: 0.8 },
  juice: { squashK: 210, squashDamp: 13, trailVy: 440, trailChance: 0.55 },
  camera: { lerp: 6 },
  hearts: 3,
  boss: {
    atkIntervals: [1.8, 2.3, 2.9], /* idx = hp-1 */
    telegraph: 0.55, shotVx: 260, shotVy: -330, shotGrav: 1300, shotRadius: 13,
    cageT0: 1.1, shrinkFactor: 0.62, defeatT: 2.6, paceSpd: 40, meleeRange: 74, meleeVRange: 82,
  },
  tree: { wakeRadius: 70, wrongShake: 6 },
} as const;

export type Eye = 'blue' | 'red' | 'green' | 'yellow' | 'purple';
export const TOOLS: Record<Eye, { col: string; emoji: string }> = {
  blue: { col: '#3fa9f5', emoji: '❄️' },
  red: { col: '#ff6b4a', emoji: '🔥' },
  green: { col: '#54c97a', emoji: '🌿' },
  yellow: { col: '#ffcc3a', emoji: '🌀' },
  purple: { col: '#b07ad8', emoji: '🟣' },
};
