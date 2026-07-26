/* Hand-built level data (B1–B3) + generated B4 — ported verbatim from v1. */
import type { LevelData } from './generator';
import { makeSection } from './generator';

export function level1(): LevelData {
  return {
    name: 'Bölüm 1 · İlk Adımlar', w: 3040, deathY: 700, gentle: true, spawn: { x: 90, y: 300 },
    platforms: [
      { x: 20, y: 380, w: 380, h: 240 }, { x: 520, y: 370, w: 300, h: 240 }, { x: 1080, y: 370, w: 460, h: 240 },
      { x: 1618, y: 360, w: 160, h: 242 }, { x: 1860, y: 355, w: 160, h: 245 }, { x: 2100, y: 352, w: 940, h: 252 },
    ],
    water: { x: 760, top: 470, w: 320 },
    interact: [
      { type: 'freeze', eye: 'blue', done: false, zone: { x: 660, y: 300, w: 200, h: 150 }, ice: { x: 760, y: 370, w: 320, h: 40 } },
      { type: 'grow', eye: 'green', done: false, zone: { x: 1320, y: 278, w: 170, h: 110 }, sprout: { x: 1450, y: 370 }, leaves: [{ x: 1515, y: 354, w: 86, h: 18 }, { x: 1588, y: 350, w: 86, h: 18 }], em: { x: 1450, y: 322 } },
      { type: 'bridge', eye: 'yellow', done: false, zone: { x: 1660, y: 270, w: 170, h: 110 }, bridge: { x: 1755, y: 348, w: 125, h: 18 }, ropeX: 1818, anchorY: 245, em: { x: 1818, y: 302 } },
    ],
    trees: [{ id: 'çınar', x: 585, y: 370 }, { id: 'ıhlamur', x: 2180, y: 352 }, { id: 'meşe', x: 2925, y: 352 }],
    monsters: [
      { x: 1210, gx0: 1100, gx1: 1450, ground: 370, lo: 1088, hi: 1530, spd: 82, aggro: 185, patrolSpd: 36 },
    ],
    boss: null, arena: null,
    checkpoints: [{ x: 560, y: 370 }, { x: 1125, y: 370 }, { x: 2112, y: 352 }],
    goal: null, hasSand: true, hasHeal: true,
    intros: [
      { x: 170, text: 'Çayır çok sessiz… birlikte dinleyelim.  ←  →' },
      { x: 695, text: 'Akarsu üşümeyi hatırlıyor.  ❄️  ✨' },
      { x: 1200, text: 'Korkmuş, kötü değil.  🏖️  →  💛' },
      { x: 1420, text: 'Minik kökler yolu hissediyor.  🌿  ✨' },
      { x: 1740, text: 'Sarkan köprüyü nazikçe uyandır.  🌀  ✨' },
      { x: 2410, text: 'İki kalp, iki taş… dostuna güven.' },
    ],
  };
}

export function level2(): LevelData {
  return {
    name: 'Bölüm 2 · Zümrüt Zirveler', w: 4400, deathY: 700, gentle: false, spawn: { x: 120, y: 300 },
    platforms: [
      { x: 20, y: 380, w: 340, h: 240 }, { x: 440, y: 360, w: 200, h: 240 }, { x: 960, y: 360, w: 460, h: 240 },
      { x: 1560, y: 350, w: 200, h: 250 }, { x: 2000, y: 350, w: 180, h: 250 },
      { x: 2248, y: 342, w: 202, h: 258 }, { x: 2520, y: 348, w: 218, h: 255 },
      { x: 2800, y: 345, w: 244, h: 260 }, { x: 3112, y: 342, w: 244, h: 261 },
      { x: 3420, y: 345, w: 980, h: 260 },
    ],
    water: { x: 640, top: 470, w: 320 },
    interact: [
      { type: 'freeze', eye: 'blue', done: false, zone: { x: 560, y: 300, w: 180, h: 140 }, ice: { x: 640, y: 360, w: 320, h: 40 } },
      { type: 'thorn', eye: 'red', done: false, zone: { x: 1090, y: 250, w: 170, h: 120 }, wall: { x: 1170, y: 236, w: 28, h: 124 }, em: { x: 1184, y: 215 } },
      { type: 'grow', eye: 'green', done: false, zone: { x: 1240, y: 300, w: 130, h: 100 }, sprout: { x: 1300, y: 360 }, leaves: [{ x: 1360, y: 350, w: 80, h: 18 }, { x: 1470, y: 350, w: 80, h: 18 }], em: { x: 1300, y: 318 } },
      { type: 'bridge', eye: 'yellow', done: false, zone: { x: 1660, y: 300, w: 140, h: 110 }, bridge: { x: 1760, y: 352, w: 240, h: 18 }, ropeX: 1880, anchorY: 250, em: { x: 1880, y: 300 } },
      { type: 'grow', eye: 'green', done: false, zone: { x: 2258, y: 248, w: 148, h: 108 }, sprout: { x: 2330, y: 342 }, leaves: [{ x: 2444, y: 342, w: 82, h: 18 }, { x: 2534, y: 348, w: 82, h: 18 }], em: { x: 2330, y: 270 } },
      { type: 'thorn', eye: 'red', done: false, zone: { x: 2808, y: 240, w: 148, h: 120 }, wall: { x: 2888, y: 228, w: 28, h: 117 }, em: { x: 2902, y: 210 } },
    ],
    monsters: [
      { x: 1060, gx0: 1010, gx1: 1200, ground: 360, lo: 980, hi: 1280 },
      { x: 1668, gx0: 1568, gx1: 1728, ground: 350, lo: 1564, hi: 1756 },
      { x: 2580, gx0: 2530, gx1: 2710, ground: 348, lo: 2524, hi: 2734, spd: 148, aggro: 295, patrolSpd: 66 },
      { x: 2856, gx0: 2806, gx1: 3016, ground: 345, lo: 2804, hi: 3040, spd: 152, aggro: 305, patrolSpd: 68 },
      { type: 'flipper', x: 3174, gx0: 3118, gx1: 3330, ground: 342, lo: 3116, hi: 3350, spd: 158, aggro: 312, patrolSpd: 70 },
      { x: 3380, gx0: 3322, gx1: 3412, ground: 345, lo: 3320, hi: 3415, spd: 144, aggro: 278, patrolSpd: 62 },
    ],
    boss: { kind: 'thrower', x: 3840, w: 88, h: 88, ground: 345, hp: 3, state: 'sleep', face: -1, atkT: 1.8, tel: 0, blindT: 0, cageT: 0, defT: 0, paceDir: -1, px0: 3640, px1: 3960, shake: 0, cageEye: 'green', finisher: 'cage', scale: 1 },
    arena: { trig: 3474, wall: { x: 3422, y: 120, w: 14, h: 490 } },
    checkpoints: [{ x: 1000, y: 360 }, { x: 1600, y: 350 }, { x: 2540, y: 348 }, { x: 2804, y: 345 }],
    goal: null, hasSand: true, hasHeal: true,
    trees: [{ id: 'çam', x: 990, y: 360 }, { id: 'servi', x: 1575, y: 350 }, { id: 'huş', x: 2560, y: 348 }, { id: 'akçaağaç', x: 3140, y: 342 }],
    intros: [
      { x: 2332, text: '🌿 yine sarmaşık — yeni köprü yap!' },
      { x: 2582, text: 'Hızlı canavar! 🏖️ hazır ol' },
      { x: 2858, text: 'Diken + canavar aynı anda — sırayla!' },
      { x: 3180, text: 'Bu canavar kafası karışmış — yön değiştiriyor!' },
      { x: 3384, text: 'Son geçit öncesi — 🏖️ hazır!' },
    ],
  };
}

export function level3(): LevelData {
  return {
    name: 'Bölüm 3 · Kristal Mağaralar', w: 4100, deathY: 760, gentle: false, cave: true, dark: true, spawn: { x: 90, y: 340 },
    platforms: [
      { x: 20, y: 400, w: 560, h: 240 }, { x: 700, y: 300, w: 360, h: 340 }, { x: 1060, y: 340, w: 360, h: 300 },
      { x: 1560, y: 340, w: 200, h: 300 }, { x: 1858, y: 338, w: 322, h: 322 },
      { x: 2258, y: 330, w: 262, h: 330 }, { x: 2598, y: 336, w: 202, h: 324 },
      { x: 2878, y: 332, w: 262, h: 328 }, { x: 3320, y: 334, w: 220, h: 326 },
      { x: 3600, y: 334, w: 500, h: 326 },
    ],
    water: null,
    interact: [
      { type: 'rock', eye: 'purple', done: false, zone: { x: 330, y: 300, w: 160, h: 110 }, block: { x: 430, y: 300, w: 52, h: 100 }, em: { x: 456, y: 282 } },
      { type: 'mush', eye: 'purple', done: false, zone: { x: 480, y: 320, w: 150, h: 100 }, sprout: { x: 540, y: 400 }, pad: { x: 560, y: 392, w: 120, h: 20, bounce: true }, em: { x: 540, y: 362 } },
      { type: 'torch', eye: 'red', done: false, zone: { x: 1630, y: 250, w: 140, h: 130 }, x: 1700, y: 300, em: { x: 1700, y: 250 } },
      { type: 'rock', eye: 'purple', done: false, zone: { x: 2268, y: 222, w: 142, h: 122 }, block: { x: 2342, y: 222, w: 54, h: 108 }, em: { x: 2369, y: 204 } },
      { type: 'torch', eye: 'red', done: false, zone: { x: 2608, y: 238, w: 132, h: 130 }, x: 2678, y: 292, em: { x: 2678, y: 242 } },
      { type: 'mush', eye: 'purple', done: false, zone: { x: 2886, y: 228, w: 150, h: 118 }, sprout: { x: 2960, y: 332 }, pad: { x: 2980, y: 322, w: 120, h: 20, bounce: true }, em: { x: 2960, y: 278 } },
    ],
    monsters: [
      { x: 1862, gx0: 1862, gx1: 2070, ground: 338, lo: 1862, hi: 2175, spd: 118, aggro: 230, patrolSpd: 55 },
      { x: 2310, gx0: 2265, gx1: 2445, ground: 330, lo: 2262, hi: 2516, spd: 105, aggro: 215, patrolSpd: 48 },
      { x: 2658, gx0: 2608, gx1: 2776, ground: 336, lo: 2602, hi: 2794, spd: 132, aggro: 262, patrolSpd: 58 },
      { type: 'flipper', x: 2940, gx0: 2882, gx1: 3100, ground: 332, lo: 2880, hi: 3135, spd: 150, aggro: 305, patrolSpd: 66 },
      { x: 3376, gx0: 3324, gx1: 3512, ground: 334, lo: 3322, hi: 3514, spd: 158, aggro: 315, patrolSpd: 72 },
    ],
    boss: { kind: 'thrower', x: 3790, w: 88, h: 88, ground: 334, hp: 3, state: 'sleep', face: -1, atkT: 1.8, tel: 0, blindT: 0, cageT: 0, defT: 0, paceDir: -1, px0: 3648, px1: 3860, shake: 0, cageEye: 'purple', finisher: 'shrink', scale: 1 },
    arena: { trig: 3656, wall: { x: 3604, y: 120, w: 14, h: 540 } },
    checkpoints: [{ x: 740, y: 300 }, { x: 1620, y: 340 }, { x: 2296, y: 330 }, { x: 2882, y: 332 }],
    goal: null, hasSand: true, hasHeal: true,
    trees: [{ id: 'söğüt', x: 770, y: 300 }, { id: 'ginkgo', x: 1870, y: 338 }, { id: 'zeytin', x: 2100, y: 338 }],
    intros: [
      { x: 160, text: '🟣 yeni güç! Kayaya yaklaş, ✨ ile küçült' },
      { x: 520, text: 'Mantarı ✨ ile büyüt → üstünde zıpla' },
      { x: 1680, text: 'Karanlık! 🔥 ile meşaleyi yak' },
      { x: 2314, text: 'Bir kaya daha + canavar — önce 🏖️!' },
      { x: 2660, text: 'Karanlık meşale 🔥 — ve canavar! 🏖️' },
      { x: 2944, text: 'Yeni mantar 🟣 → büyüt ve uçarak atla!' },
      { x: 3380, text: 'Son canavar — 🏖️ hızlı!' },
    ],
  };
}

export function level4(): LevelData {
  return makeSection({
    name: 'Bölüm 4 · Kestane Korusu', biome: 'forest', tier: 2,
    treeIds: ['kestane', 'kayın', 'kavak'], puzzleTypes: ['grow', 'bridge', 'thorn'],
    cageEye: 'green', finisher: 'cage', hint: 'Kestane Korusu — üç yeni ağaç seni bekliyor!',
  });
}

/* --- v2 content: B5–B10 (built ahead of playtest by owner decision 2026-07-06;
   each still requires child-playtest validation before being considered "done"). --- */
export function level5(): LevelData {
  return makeSection({
    name: 'Bölüm 5 · Toros Yaylası', biome: 'toros', tier: 3,
    treeIds: ['toros sediri', 'ardıç', 'sekoya'], puzzleTypes: ['freeze', 'rock', 'bridge'],
    cageEye: 'blue', finisher: 'shrink', hint: 'Yayla rüzgarı sert — sedirler seni bekliyor!',
  });
}
export function level6(): LevelData {
  return makeSection({
    name: 'Bölüm 6 · Meyve Bahçesi', biome: 'orchard', tier: 3, bossKind: 'mimic',
    treeIds: ['elma', 'kiraz', 'ceviz'], puzzleTypes: ['grow', 'mush', 'bridge'],
    cageEye: 'green', finisher: 'cage', hint: 'Bahçede bir Taklitçi saklanıyor — ağaçları iyi tanı!',
  });
}
export function level7(): LevelData {
  return makeSection({
    name: 'Bölüm 7 · Akdeniz Kıyısı', biome: 'coast', tier: 4,
    treeIds: ['palmiye', 'incir', 'limon'], puzzleTypes: ['bridge', 'thorn', 'freeze'],
    cageEye: 'yellow', finisher: 'shrink', hint: 'Deniz kokusu! Kıyı ağaçları güneşte uyukluyor.',
  });
}
export function level8(): LevelData {
  return makeSection({
    name: 'Bölüm 8 · Karadeniz Ormanı', biome: 'rainforest', tier: 4,
    treeIds: ['ladin', 'fındık', 'kayın'], puzzleTypes: ['torch', 'grow', 'mush'],
    cageEye: 'red', finisher: 'cage', hint: 'Sisli orman — meşaleler yol gösterir.',
  });
}
export function level9(): LevelData {
  return makeSection({
    name: 'Bölüm 9 · Göl Kenarı', biome: 'lakeside', tier: 5, bossKind: 'mimic',
    treeIds: ['kızılağaç', 'dişbudak', 'söğüt'], puzzleTypes: ['freeze', 'bridge', 'grow'],
    cageEye: 'blue', finisher: 'shrink', hint: 'Göl aynası — su seven ağaçlar ve bir Taklitçi daha!',
  });
}
/* B10 mastery: trees drawn from the journal (what the child actually learned);
   falls back to a fixed review set for a fresh save. Silhouette-tier clues. */
export function level10(journal: string[] = []): LevelData {
  const pool = journal.length >= 3 ? journal.slice(-6) : ['meşe', 'çınar', 'ıhlamur'];
  const treeIds = pool.slice(0, Math.min(4, pool.length));
  return makeSection({
    name: 'Bölüm 10 · Usta Bahçıvan', biome: 'mastery', tier: 5, bossKind: 'mimic',
    treeIds, puzzleTypes: ['rock', 'torch', 'thorn', 'mush'],
    cageEye: 'purple', finisher: 'cage', hint: 'Usta sınavı — öğrendiğin ağaçlar gölgeleriyle karşında!',
  });
}
