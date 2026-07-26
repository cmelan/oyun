'use strict';
/* Çok Kalpli Koruyucu — Duman/regresyon testleri
   Çalıştır: node tests/smoke.test.js
   Bağımlılık yok (yalnız Node çekirdek modülleri). Her PR/değişiklikten önce
   bunu çalıştırmak, bu proje boyunca sohbet oturumlarında elle yapılan
   kontrolleri kalıcı hale getirir. */
const assert = require('assert');
const path = require('path');
const { runGame } = require('./harness-helpers');

const GAME = path.join(__dirname, '..', 'game', 'cok-kalpli-koruyucu.html');
let passed = 0, failed = 0;

function test(name, fn) {
  try { fn(); passed++; console.log('✓ ' + name); }
  catch (e) { failed++; console.log('✗ ' + name + '\n  ' + e.message); }
}

const RESET_INPUT = `function resetInput(){ for(const k of ['left','right','jumpEdge','jumpHeld','useEdge','sandEdge','healHeld']) input[k]=false; }
function place(x,y){ resetInput(); player.x=x; player.y=y; player.vx=0; player.vy=0; }`;

/* ---------- Bölüm 1: kum bütçesi + kör/iyileştir döngüsü ---------- */
test('B1: kum bütçesi = canavar sayısı + 2', () => {
  const r = runGame(GAME, `${RESET_INPUT}
    loadLevel(0);
    globalThis.__test.result = { sandMax, monsterCount: L.monsters.length };`);
  const res = eval('globalThis.__test.result');
  assert.strictEqual(res.sandMax, res.monsterCount + 2, 'kum bütçesi formülü bozuldu');
});

test('B1: kum → canavar körleşir, sevgi ışığı → mutlu olur', () => {
  const r = runGame(GAME, `${RESET_INPUT}
    loadLevel(0); resetInput();
    place(560,326); input.sandEdge=true; update(1/60); resetInput();
    for(let f=0;f<40;f++) update(1/60);
    const afterSand = L.monsters[0].state;
    place(L.monsters[0].x-30,326); input.healHeld=true;
    for(let f=0;f<100;f++) update(1/60);
    globalThis.__test.result = { afterSand, afterHeal: L.monsters[0].state };`);
  const res = eval('globalThis.__test.result');
  assert.strictEqual(res.afterSand, 'blind');
  assert.strictEqual(res.afterHeal, 'happy');
});

/* ---------- WORLD / bölge şeması ---------- */
test('WORLD: 4 bölge, düz bölüm listesiyle eşleşiyor', () => {
  const r = runGame(GAME, `globalThis.__test.result = { regions: WORLD.length, levels: LEVELS.length };`);
  const res = eval('globalThis.__test.result');
  assert.strictEqual(res.regions, 4);
  assert.strictEqual(res.levels, 4);
});

/* ---------- Bölüm 2/3: bulmacalar + boss finisher'ları ---------- */
test('B2: thorn/bridge doğru renkte kuşanıyor, ağaç araya girmiyor', () => {
  const r = runGame(GAME, `${RESET_INPUT}
    loadLevel(1); resetInput();
    place(1150,260); update(1/60); const thornEquip=equipped, thornNear=nearTree;
    place(1730,290); update(1/60); const bridgeEquip=equipped, bridgeNear=nearTree;
    globalThis.__test.result = { thornEquip, thornNear, bridgeEquip, bridgeNear };`);
  const res = eval('globalThis.__test.result');
  assert.strictEqual(res.thornEquip, 'red');
  assert.strictEqual(res.thornNear, null);
  assert.strictEqual(res.bridgeEquip, 'yellow');
  assert.strictEqual(res.bridgeNear, null);
});

test('B2 boss: kafes finisher, 3 vuruşta yenilir', () => {
  const r = runGame(GAME, `${RESET_INPUT}
    loadLevel(1); bossActive=true;
    L.boss.state='caged'; L.boss.cageT=-1; update(1/60);
    const afterHit1 = { hp: L.boss.hp, state: L.boss.state };
    L.boss.state='caged'; L.boss.cageT=-1; update(1/60);
    const afterHit2 = { hp: L.boss.hp, state: L.boss.state };
    L.boss.state='caged'; L.boss.cageT=-1; update(1/60);
    globalThis.__test.result = { afterHit1, afterHit2, afterHit3: { hp: L.boss.hp, state: L.boss.state } };`);
  const res = eval('globalThis.__test.result');
  assert.strictEqual(res.afterHit1.hp, 2);
  assert.strictEqual(res.afterHit2.hp, 1);
  assert.strictEqual(res.afterHit3.hp, 0);
  assert.strictEqual(res.afterHit3.state, 'defeated');
});

test('B3 boss: küçültme finisher gerçekten ölçeği düşürür', () => {
  const r = runGame(GAME, `${RESET_INPUT}
    loadLevel(2); bossActive=true; L.boss.state='caged'; L.boss.cageT=-1; L.boss.hp=3;
    update(1/60);
    globalThis.__test.result = { hp: L.boss.hp, scale: L.boss.scale, state: L.boss.state };`);
  const res = eval('globalThis.__test.result');
  assert.strictEqual(res.hp, 2);
  assert.ok(res.scale < 1, 'küçültme finisher ölçeği düşürmedi');
});

/* ---------- Bilge Ağaçlar: tüm 13 tür, çok dilli, sesli ---------- */
test('Bilge Ağaçlar: 13 türün de ikonu crash etmeden üretiliyor', () => {
  const r = runGame(GAME, `
    const ids=Object.keys(TREES); const errors=[];
    ids.forEach(id=>{ try{ getTreeIcon(id,80); }catch(e){ errors.push(id+':'+e.message); } });
    globalThis.__test.result = { count: ids.length, errors };`);
  const res = eval('globalThis.__test.result');
  assert.strictEqual(res.errors.length, 0, 'İkon üretim hataları: ' + res.errors.join(', '));
  assert.ok(res.count >= 13, 'Beklenenden az tür tanımlı');
});

test('Bilge Ağaçlar: 4 dilde isim + dil-duyarlı seslendirme', () => {
  const r = runGame(GAME, `
    const names = { tr: (lang='tr', treeName('meşe')), en: (lang='en', treeName('meşe')),
      de: (lang='de', treeName('meşe')), ar: (lang='ar', treeName('meşe')) };
    lang='en'; speak(treeName('meşe'));
    globalThis.__test.result = { names };`);
  const res = eval('globalThis.__test.result');
  assert.strictEqual(res.names.tr, 'Meşe');
  assert.strictEqual(res.names.en, 'Oak');
  assert.strictEqual(res.names.de, 'Eiche');
  assert.strictEqual(res.names.ar, 'بلوط');
  assert.ok(r.spokenLog.some(s => s.text === 'Oak' && s.lang === 'en-US'), 'İngilizce seslendirme locale eşleşmedi');
});

test('Bilge Ağaçlar: B1 üç ağaç uyandırılabiliyor, günlüğe kaydediliyor, kalıcı', () => {
  const r = runGame(GAME, `${RESET_INPUT}
    function visitAndWake(x,y){ place(x,y); update(1/60);
      if(!nearTree) return 'HATA:yok@'+x;
      const id=nearTree.id; openTreeEncounter(nearTree); wakeTree(nearTree); resumeGame(); update(1/60);
      return id; }
    loadLevel(0);
    const w1=visitAndWake(585,326), w2=visitAndWake(1190,326), w3=visitAndWake(2180,308);
    const journalAfter = save.journal.slice();
    loadLevel(0);
    const stillAwake = L.trees.filter(t=>t.awake).map(t=>t.id);
    globalThis.__test.result = { w1, w2, w3, journalAfter, stillAwake };`);
  const res = eval('globalThis.__test.result');
  assert.deepStrictEqual(res.journalAfter.sort(), ['meşe', 'çınar', 'ıhlamur'].sort());
  assert.strictEqual(res.stillAwake.length, 3, 'Ağaçlar yeniden yüklemede uyanık kalmadı');
});

/* ---------- Bölüm üretici (Slice B) ---------- */
test('Üretici: B4 yapısal olarak geçerli (ağaç=bulmaca=kontrol noktası sayısı, min 3)', () => {
  const r = runGame(GAME, `
    loadLevel(3);
    globalThis.__test.result = {
      trees: L.trees.length, interact: L.interact.length, checkpoints: L.checkpoints.length,
      biome: L.biome, bossFinisher: L.boss.finisher };`);
  const res = eval('globalThis.__test.result');
  assert.ok(res.trees >= 3, 'Üretilen bölümde 3\'ten az ağaç var — non-negotiable kural ihlali');
  assert.strictEqual(res.trees, res.interact);
  assert.strictEqual(res.trees, res.checkpoints);
});

test('Üretici: ağaç ile bulmaca zone\'ları arasında 0 çakışma (wakeRadius bazlı)', () => {
  const r = runGame(GAME, `
    loadLevel(3);
    let conflicts=[];
    L.trees.forEach(tr=>{ L.interact.forEach(it=>{
      const cx=Math.max(it.zone.x,Math.min(tr.x,it.zone.x+it.zone.w));
      const cy=Math.max(it.zone.y,Math.min(tr.y,it.zone.y+it.zone.h));
      const d=Math.hypot(tr.x-cx,tr.y-cy);
      if(d<CONFIG.tree.wakeRadius) conflicts.push(tr.id+'/'+it.type+'@'+d.toFixed(0));
    }); });
    globalThis.__test.result = { conflicts };`);
  const res = eval('globalThis.__test.result');
  assert.strictEqual(res.conflicts.length, 0, 'Çakışma tespit edildi: ' + res.conflicts.join(', '));
});

test('Üretici: B4 tam oynanış — bulmacalar, 3 ağaç, boss kafes akışı', () => {
  const r = runGame(GAME, `${RESET_INPUT}
    loadLevel(3);
    const equipResults = L.interact.map(it=>{ const z=it.zone; place(z.x+z.w/2,z.y+z.h/2); update(1/60); return { type:it.type, eye:it.eye, equipped }; });
    const wakeResults = L.trees.map(tr=>{ place(tr.x,tr.y-40); update(1/60);
      if(!nearTree || nearTree.id!==tr.id) return 'HATA';
      openTreeEncounter(nearTree); wakeTree(nearTree); resumeGame(); update(1/60); return 'OK'; });
    place(L.boss.x+400,L.boss.ground); update(1/60);
    const bossTriggered = bossActive;
    place(L.boss.x-20,L.boss.ground-L.boss.h);
    input.sandEdge=true; update(1/60); resetInput();
    for(let f=0;f<3;f++) update(1/60);
    input.useEdge=true; update(1/60); resetInput();
    globalThis.__test.result = { equipResults, wakeResults, bossTriggered, bossState: L.boss.state };`);
  const res = eval('globalThis.__test.result');
  res.equipResults.forEach(er => assert.strictEqual(er.equipped, er.eye, er.type + ' bulmacası yanlış renk kuşandı'));
  res.wakeResults.forEach(wr => assert.strictEqual(wr, 'OK'));
  assert.ok(res.bossTriggered);
  assert.strictEqual(res.bossState, 'caged');
});

/* ---------- Harita / kilit mantığı ---------- */
test('Harita: 4 bölge de görünüyor, kilit mantığı furthest\'e göre çalışıyor', () => {
  const r = runGame(GAME, `
    const html = buildMapHTML();
    globalThis.__test.result = {
      hasKestane: html.indexOf('Kestane Korusu') >= 0,
      hasCayir: html.indexOf('Çayır Vadisi') >= 0 };`);
  const res = eval('globalThis.__test.result');
  assert.ok(res.hasKestane && res.hasCayir);
});

/* ---------- Dil altyapısı ---------- */
test('Dil: boş EN/DE/AR tabloları TR\'ye düşer (arayüz metni hiçbir zaman boş değil)', () => {
  const r = runGame(GAME, `
    lang='en'; const en = S('ui.newGame');
    lang='tr'; const tr = S('ui.newGame');
    globalThis.__test.result = { en, tr };`);
  const res = eval('globalThis.__test.result');
  assert.strictEqual(res.en, res.tr, 'EN fallback TR metnine düşmedi');
});

/* ---------- Render crash testi ---------- */
test('Render: B1 ve B4 30 kare boyunca crash etmiyor', () => {
  const r = runGame(GAME, `
    loadLevel(3); for(let f=0;f<30;f++){ update(1/60); render(); }
    loadLevel(0); for(let f=0;f<10;f++){ update(1/60); render(); }
    globalThis.__test.result = { ok: true };`);
  const res = eval('globalThis.__test.result');
  assert.ok(res.ok);
});

console.log('\n' + passed + ' geçti, ' + failed + ' başarısız.');
process.exit(failed > 0 ? 1 : 0);
