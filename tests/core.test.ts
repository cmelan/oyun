/* v2 core regression suite — mirrors the v1 smoke suite's logic coverage
   (rendering/UI tests return with the Phase 1 Phaser slice). */
import { describe, it, expect } from 'vitest';
import { CONFIG } from '../src/core/config';
import { S, STR, setLang, SPEECH_LOCALE } from '../src/core/i18n';
import { TREES, treeName } from '../src/core/trees';
import { WORLD, LEVELS, LEVEL_META, prepLevel } from '../src/core/world';
import { makeSection, GAP, PUZZLE_FACTORY, type LevelData } from '../src/core/generator';
import { level4 } from '../src/core/levels';
import {
  sandCapacity, makeMonster, sandHit, empathyTick,
  bossSandHit, bossCageResolve, pick3, pointRectDist,
  mimicNextId, assistFactors, familyStars, streakStart, streakAnswer,
} from '../src/core/logic';
import { level10 } from '../src/core/levels';
import { regionTreePool } from '../src/core/world';
import { loadSave, writeSave, recordTreeWake, SAVE_KEY_V1, SAVE_KEY_V2, type KVStorage } from '../src/core/save';

function memStorage(seed: Record<string, string> = {}): KVStorage & { data: Map<string, string> } {
  const data = new Map(Object.entries(seed));
  return { data, getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => { data.set(k, v); } };
}

describe('kum bütçesi', () => {
  it('B1: canavar sayısı + 2 (boss yok)', () => {
    const lv = prepLevel(0);
    expect(lv.boss).toBeNull();
    expect(sandCapacity(lv)).toBe(lv.monsters.length + 2);
  });
  it('B2: boss bonusu +3 uygulanıyor', () => {
    const lv = prepLevel(1);
    expect(lv.boss).not.toBeNull();
    expect(sandCapacity(lv)).toBe(lv.monsters.length + CONFIG.sand.bossBonus + CONFIG.sand.buffer);
  });
});

describe('empati döngüsü (kum → kör → iyileştir → mutlu)', () => {
  it('kum canavarı körleştirir, sevgi ışığı mutlu eder', () => {
    const m = makeMonster({ x: 0, gx0: 0, gx1: 100, ground: 370, lo: 0, hi: 100 });
    expect(m.state).toBe('angry');
    sandHit(m);
    expect(m.state).toBe('blind');
    let becameHappy = false;
    for (let f = 0; f < 100 && !becameHappy; f++) becameHappy = empathyTick(m, 1 / 60, true);
    expect(becameHappy).toBe(true);
    expect(m.state).toBe('happy');
  });
  it('iyileştirilmeyen kör canavar süre dolunca tekrar kızar (ceza yok, sıfırlama var)', () => {
    const m = makeMonster({ x: 0, gx0: 0, gx1: 100, ground: 370, lo: 0, hi: 100 });
    sandHit(m);
    for (let f = 0; f < 60 * 5; f++) empathyTick(m, 1 / 60, false);
    expect(m.state).toBe('angry');
  });
  it('mutlu canavara kum işlemez', () => {
    const m = makeMonster({ x: 0, gx0: 0, gx1: 100, ground: 370, lo: 0, hi: 100 });
    sandHit(m);
    while (!empathyTick(m, 1 / 60, true)) { /* heal */ }
    sandHit(m);
    expect(m.state).toBe('happy');
  });
});

describe('WORLD / bölge şeması', () => {
  it('10 bölge, düz bölüm listesiyle eşleşiyor', () => {
    expect(WORLD.length).toBe(10);
    expect(LEVELS.length).toBe(WORLD.reduce((n, r) => n + r.levels.length, 0));
    expect(LEVEL_META.length).toBe(LEVELS.length);
  });
  it('her bölgenin treeSet\'i TREES kaydında var', () => {
    for (const r of WORLD) for (const id of r.treeSet) expect(TREES[id], `${r.id}:${id}`).toBeDefined();
  });
  it('her bölümde ≥3 ağaç ve hepsi bölgenin yerli setinden', () => {
    LEVELS.forEach((_, i) => {
      const lv = prepLevel(i);
      const set = WORLD[LEVEL_META[i].regionIdx].treeSet;
      expect(lv.trees.length).toBeGreaterThanOrEqual(3);
      for (const tr of lv.trees) expect(set).toContain(tr.id);
    });
  });
  it('prepLevel: günlükteki ağaçlar uyanık başlar', () => {
    const lv = prepLevel(0, ['meşe']);
    expect(lv.trees.find(t => t.id === 'meşe')!.awake).toBe(true);
    expect(lv.trees.find(t => t.id === 'çınar')!.awake).toBe(false);
  });
});

describe('ödüllük Çayır dikey kesiti', () => {
  it('beş vuruşlu şefkat akışını veri düzeyinde korur', () => {
    const lv = prepLevel(0);
    expect(lv.interact.map(i => i.type)).toEqual(['freeze', 'grow', 'bridge']);
    expect(lv.monsters).toHaveLength(1);
    expect(lv.goal).toBeNull();
    expect(lv.trees.some(t => t.id === 'meşe' && t.x > 2800)).toBe(true);
    expect(lv.intros.some(i => i.text.includes('kötü değil'))).toBe(true);
  });
});

describe('bölüm üretici', () => {
  const gen = (): LevelData => level4();
  it('yapısal geçerlilik: ağaç = kontrol noktası, bulmaca = canavar, min 3', () => {
    const lv = gen();
    expect(lv.trees.length).toBeGreaterThanOrEqual(3);
    expect(lv.checkpoints.length).toBe(lv.trees.length);
    expect(lv.interact.length).toBe(lv.monsters.length);
    expect(lv.interact.length).toBeGreaterThanOrEqual(3);
    expect(lv.boss).not.toBeNull();
    expect(lv.arena).not.toBeNull();
  });
  it('ağaç ile bulmaca zone\'ları arasında 0 çakışma (wakeRadius bazlı)', () => {
    const lv = gen();
    for (const tr of lv.trees) for (const it of lv.interact) {
      const d = pointRectDist(tr.x, tr.y, it.zone);
      expect(d, `${tr.id} vs ${it.type}`).toBeGreaterThan(CONFIG.tree.wakeRadius);
    }
  });
  it('platform boşlukları sabit ve adil (GAP + tier payı, asla riskli üretim yok)', () => {
    const lv = makeSection({
      name: 'test', biome: 'meadow', tier: 3,
      treeIds: ['meşe', 'çınar', 'ıhlamur'], puzzleTypes: ['freeze', 'grow', 'bridge'],
      cageEye: 'blue', finisher: 'cage',
    });
    const expected = GAP + Math.min(30, 3 * 6);
    for (let i = 1; i < lv.platforms.length; i++) {
      const gap = lv.platforms[i].x - (lv.platforms[i - 1].x + lv.platforms[i - 1].w);
      expect(gap).toBe(expected);
    }
  });
  it('her PUZZLE_FACTORY tipi üretiliyor ve zone taşıyor', () => {
    for (const [type, fn] of Object.entries(PUZZLE_FACTORY)) {
      const it = fn(500, 370);
      expect(it.type).toBe(type);
      expect(it.zone.w).toBeGreaterThan(0);
      expect(it.done).toBe(false);
    }
  });
});

describe('boss finisher\'ları', () => {
  it('kafes: 3 vuruşta yenilir', () => {
    const lv = prepLevel(1); const b = lv.boss!;
    expect(b.finisher).toBe('cage');
    bossCageResolve(b); expect(b.hp).toBe(2); expect(b.state).toBe('idle');
    bossCageResolve(b); expect(b.hp).toBe(1);
    bossCageResolve(b); expect(b.hp).toBe(0); expect(b.state).toBe('defeated');
  });
  it('küçültme: her vuruş ölçeği düşürür', () => {
    const lv = prepLevel(2); const b = lv.boss!;
    expect(b.finisher).toBe('shrink');
    bossCageResolve(b);
    expect(b.scale).toBeLessThan(1);
  });
  it('kum boss\'u yalnız idle durumda körleştirir', () => {
    const lv = prepLevel(1); const b = lv.boss!;
    b.state = 'idle';
    expect(bossSandHit(b)).toBe(true);
    expect(b.state).toBe('blind');
    expect(bossSandHit(b)).toBe(false); /* already blind */
  });
});

describe('Bilge Ağaçlar', () => {
  it('26 tür tanımlı, hepsinde 3 dilde isim + aile + fact', () => {
    const ids = Object.keys(TREES);
    expect(ids.length).toBe(26);
    for (const id of ids) {
      const t = TREES[id];
      for (const l of ['tr', 'en', 'de'] as const) expect(t.name[l], `${id}.${l}`).toBeTruthy();
      expect(t.family).toBeTruthy(); expect(t.fact || t.gift).toBeTruthy();
    }
  });
  it('treeName dil-duyarlı', () => {
    expect(treeName('meşe', 'tr')).toBe('Meşe');
    expect(treeName('meşe', 'en')).toBe('Oak');
    expect(treeName('meşe', 'de')).toBe('Eiche');
    expect(SPEECH_LOCALE.en).toBe('en-US');
  });
  it('pick3: doğru id daima içinde, 3 benzersiz seçenek', () => {
    const pool = ['meşe', 'çınar', 'ıhlamur', 'çam'];
    for (let s = 0; s < 25; s++) {
      const c = pick3('meşe', pool);
      expect(c.length).toBe(3);
      expect(c).toContain('meşe');
      expect(new Set(c).size).toBe(3);
      for (const id of c) expect(pool).toContain(id);
    }
  });
  it('uyandırma → günlük → kalıcılık (roundtrip)', () => {
    const st = memStorage();
    const save = loadSave(st);
    expect(recordTreeWake(save, 'meşe')).toBe(true);
    expect(recordTreeWake(save, 'meşe')).toBe(false); /* idempotent */
    writeSave(save, st);
    const again = loadSave(st);
    expect(again.journal).toEqual(['meşe']);
  });
});

describe('kayıt / göç', () => {
  it('v1 kaydı v2\'ye göçer, ilerleme korunur', () => {
    const st = memStorage({ [SAVE_KEY_V1]: JSON.stringify({ furthest: 3, journal: ['meşe', 'çam'], lang: 'tr', muted: false }) });
    const save = loadSave(st);
    expect(save.furthest).toBe(3);
    expect(save.journal).toEqual(['meşe', 'çam']);
    expect(st.data.has(SAVE_KEY_V2)).toBe(true); /* persisted under new key */
  });
  it('bozuk kayıt çökertmez, boş kayıtla devam eder', () => {
    const st = memStorage({ [SAVE_KEY_V2]: '{not json' });
    expect(loadSave(st)).toEqual({});
  });
  it("kaldırılan dil ('ar') kaydı tr'ye çevrilir — v2 ve v1 göçünde", () => {
    const v2st = memStorage({ [SAVE_KEY_V2]: JSON.stringify({ furthest: 2, lang: 'ar' }) });
    expect(loadSave(v2st).lang).toBe('tr');
    const v1st = memStorage({ [SAVE_KEY_V1]: JSON.stringify({ furthest: 5, journal: ['meşe'], lang: 'ar' }) });
    const migrated = loadSave(v1st);
    expect(migrated.lang).toBe('tr');
    expect(migrated.furthest).toBe(5); /* progress untouched */
  });
});

describe('v2 içerik: B5–B10', () => {
  it('her bölgede clueTier tanımlı ve rampa doğru (leaf→bark→silhouette)', () => {
    const tiers = WORLD.map(r => r.clueTier);
    expect(tiers.slice(0, 4).every(t => t === 'leaf')).toBe(true);
    expect(tiers.slice(4, 7).every(t => t === 'bark')).toBe(true);
    expect(tiers.slice(7).every(t => t === 'silhouette')).toBe(true);
  });
  it('B5–B9 yapısal geçerli + ağaç/bulmaca 0 çakışma', () => {
    for (let i = 4; i <= 8; i++) {
      const lv = prepLevel(i);
      expect(lv.trees.length, `B${i + 1} trees`).toBeGreaterThanOrEqual(2);
      expect(lv.checkpoints.length).toBe(lv.trees.length);
      expect(lv.boss).not.toBeNull();
      for (const tr of lv.trees) for (const it of lv.interact)
        expect(pointRectDist(tr.x, tr.y, it.zone)).toBeGreaterThan(CONFIG.tree.wakeRadius);
    }
  });
  it('mimic boss B6/B9/B10, thrower diğerleri', () => {
    expect(prepLevel(5).boss!.kind).toBe('mimic');
    expect(prepLevel(8).boss!.kind).toBe('mimic');
    expect(prepLevel(9).boss!.kind).toBe('mimic');
    expect(prepLevel(4).boss!.kind).toBe('thrower');
    expect(prepLevel(1).boss!.kind).toBe('thrower');
  });
  it('B10 usta: günlükten ağaç çeker, taze kayıtta güvenli düşer', () => {
    const fresh = level10([]);
    expect(fresh.trees.length).toBeGreaterThanOrEqual(3);
    const learned = level10(['meşe', 'çam', 'zeytin', 'elma', 'limon']);
    for (const tr of learned.trees) expect(['meşe', 'çam', 'zeytin', 'elma', 'limon']).toContain(tr.id);
    expect(regionTreePool(9, ['meşe', 'çam', 'zeytin'])).toEqual(['meşe', 'çam', 'zeytin']);
    expect(regionTreePool(9, [])).toEqual(WORLD[9].treeSet);
  });
  it('mimicNextId: havuzdan seçer, öncekini tekrar etmez', () => {
    for (let s = 0; s < 20; s++) {
      const id = mimicNextId(['elma', 'kiraz', 'ceviz'], 'elma');
      expect(['kiraz', 'ceviz']).toContain(id);
    }
  });
  it('ilk-deneme serisi: 3 üst üste doğru → kutlama; yanlış sıfırlar, ceza yok', () => {
    const s = { run: 0, wrong: false };
    streakStart(s); expect(streakAnswer(s, true)).toBe(false);  /* 1 */
    streakStart(s); expect(streakAnswer(s, true)).toBe(false);  /* 2 */
    streakStart(s); expect(streakAnswer(s, true)).toBe(true);   /* 3 → celebrate */
    streakStart(s); expect(streakAnswer(s, false)).toBe(false); /* wrong resets run */
    expect(s.run).toBe(0);
    expect(streakAnswer(s, true)).toBe(false); /* correct after retry: no streak credit */
    streakStart(s);
    expect(streakAnswer(s, true)).toBe(false); /* fresh question counts again */
    expect(s.run).toBe(1);
  });
  it('görünmez yardım: sınırlı, etiketsiz, 2 ölüme kadar devreye girmez', () => {
    expect(assistFactors({ deaths: 0 }).monsterSpd).toBe(1);
    expect(assistFactors({ deaths: 2 }).monsterSpd).toBe(1);
    const heavy = assistFactors({ deaths: 20 });
    expect(heavy.monsterSpd).toBeGreaterThanOrEqual(0.75);
    expect(heavy.iframeBonus).toBeLessThanOrEqual(0.6);
    expect(heavy.blindBonus).toBeLessThanOrEqual(2);
  });
  it('aile yıldızları: tam aile ★', () => {
    const trees = { a: { family: 'X' }, b: { family: 'X' }, c: { family: 'Y' } };
    const stars = familyStars(['a', 'b'], trees);
    expect(stars['X'].star).toBe(true);
    expect(stars['Y'].star).toBe(false);
    expect(stars['X'].learned).toBe(2);
  });
});

describe('dil', () => {
  it('EN/DE görünür arayüzü çevrilidir; eksik anahtarlar güvenle TR\'ye düşer', () => {
    setLang('en'); expect(S('ui.newGame')).toBe('▶ New Journey');
    setLang('de'); expect(S('ui.newGame')).toBe('▶ Neue Reise');
    for (const l of ['en', 'de'] as const) {
      setLang(l);
      expect(S('tree.question')).toBeTruthy();
      expect(S('menu.subtitle')).not.toBe(STR.tr['menu.subtitle']);
    }
    setLang('tr');
  });
  it('bilinmeyen anahtar anahtarın kendisini döner (asla undefined)', () => {
    expect(S('no.such.key')).toBe('no.such.key');
  });
});
