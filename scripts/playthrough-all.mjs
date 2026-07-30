/* Full-game playthrough regression.

   Drives the real keyboard and card UI through every chapter to completion. It
   reads scene state only to decide what a player would do next and to know when
   an input succeeded; it never sets gameplay state.

   This exists because "all tests pass" and "the game can be finished" are
   different claims. Before this, only the Meadow had an end-to-end run.

     GAME_URL=http://127.0.0.1:5199 node scripts/playthrough-all.mjs
     LEVELS=4,5 node scripts/playthrough-all.mjs      # a subset

   Exit code is non-zero if any chapter cannot be completed. */
import { chromium } from 'playwright';

const BASE = process.env.GAME_URL || 'http://127.0.0.1:5199';
const ONLY = process.env.LEVELS ? process.env.LEVELS.split(',').map(n => Number(n) - 1) : null;
const BUDGET_MS = Number(process.env.BUDGET_MS || 150000);

const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
const results = [];

for (let idx = 0; idx < 10; idx++) {
  if (ONLY && !ONLY.includes(idx)) continue;
  const ctx = await browser.newContext({ viewport: { width: 960, height: 540 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

  await page.addInitScript(() => localStorage.setItem('ckk2_save_v2', JSON.stringify({
    furthest: 10, lang: 'en',
    journal: ['meşe', 'çınar', 'ıhlamur', 'çam', 'servi', 'huş', 'akçaağaç',
      'söğüt', 'ginkgo', 'zeytin', 'kestane', 'kayın', 'kavak'],
  })));
  await page.goto(`${BASE}/?test`, { waitUntil: 'networkidle' });
  await page.evaluate(i => window.__ckk.startLevel(i), idx);
  await page.waitForTimeout(400);

  const started = Date.now();
  const name = await page.evaluate(() => window.__ckk.getScene().L.name);
  let outcome = 'timeout', note = '';
  let held = null;

  const hold = async (key) => { if (held !== key) { if (held) await page.keyboard.up(held); if (key) await page.keyboard.down(key); held = key; } };

  /* A compact read of everything a player can see, once per decision tick. */
  const look = () => page.evaluate(() => {
    const s = window.__ckk.getScene();
    if (!s) return null;
    const p = s.player, pcx = p.x + p.w / 2, feet = p.y + p.h;
    const L = s.L;
    /* Act on the puzzle the player is standing IN, not the first unsolved one —
       those are different the moment a level has more than one open at once. */
    const midY = p.y + p.h / 2;
    const open = L.interact.filter(it => !it.done);
    const inside = open.find(it => pcx > it.zone.x && pcx < it.zone.x + it.zone.w
      && midY > it.zone.y && midY < it.zone.y + it.zone.h);
    const ahead = open.filter(it => it.zone.x + it.zone.w > pcx - 40)
      .sort((a, b) => a.zone.x - b.zone.x)[0];
    const nextPuzzle = inside || ahead || null;
    const monsters = s.monsters.map(m => ({
      x: m.x, ground: m.ground, state: m.state, w: m.w,
      d: (m.x + m.w / 2) - pcx,
    }));
    const tree = (L.trees || []).filter(t => !t.awake)
      .map(t => ({ id: t.id, x: t.x, y: t.y, d: t.x - pcx }))
      .sort((a, b) => Math.abs(a.d) - Math.abs(b.d))[0] || null;
    return {
      ended: s.ended, modal: s.modal, hearts: s.hearts, w: L.w,
      px: p.x, pcx, feet, vy: p.vy, grounded: p.grounded, face: p.face,
      sand: s.sandLeft, equipped: s.equipped,
      nearTree: s.nearTree ? s.nearTree.id : null,
      tree,
      puzzle: nextPuzzle ? {
        type: nextPuzzle.type, eye: nextPuzzle.eye,
        zx: nextPuzzle.zone.x, zy: nextPuzzle.zone.y,
        zw: nextPuzzle.zone.w, zh: nextPuzzle.zone.h,
        inside: nextPuzzle === inside,
      } : null,
      monsters,
      boss: L.boss ? { x: L.boss.x, w: L.boss.w, state: L.boss.state, hp: L.boss.hp, kind: L.boss.kind, ground: L.boss.ground } : null,
      bossActive: s.bossActive,
      arenaTrig: L.arena ? L.arena.trig : null,
      /* Distance from the player's front foot to the lip of the platform they
         are standing on, and whether there is air beyond it. A fixed forward
         probe made the bot jump ~95px early, land back on the same platform,
         and then walk off the edge. */
      edge: (() => {
        const here = L.platforms.find(pl => pcx > pl.x && pcx < pl.x + pl.w && Math.abs(pl.y - feet) < 26);
        if (!here) return null;
        const lip = here.x + here.w;
        const beyond = L.platforms.some(pl => lip + 30 > pl.x && lip + 30 < pl.x + pl.w && Math.abs(pl.y - feet) < 40);
        return beyond ? null : { dist: lip - (p.x + p.w) };
      })(),
      onGround: p.grounded,
      groundY: (L.platforms.find(pl => pcx > pl.x && pcx < pl.x + pl.w) || { y: 400 }).y,
      /* Meadow only: the two-heart-stone gate, once a friend is walking with you. */
      meadowGate: s.idx === 0 && !!s.meadowStory.helper && pcx > 2180,
      gateOpen: s.meadowStory.pressureAwake,
    };
  });

  /* Answer whichever card is open, correctly. */
  const answerCard = async (correctId) => {
    /* Tree ids are Turkish (meşe, ıhlamur, kızılağaç), so match on the dataset
       in the page rather than building an attribute selector in Node. */
    const buttons = await page.$$('.treeChoice');
    let target = buttons[0];
    for (const b of buttons) {
      const id = await b.evaluate(el => el.dataset.id);
      if (id === correctId) { target = b; break; }
    }
    if (target) await target.click();
    await page.waitForTimeout(200);
    const done = await page.$('#tDone');
    if (done) { await done.click(); await page.waitForTimeout(300); }
  };

  let lastX = -1, stuckTicks = 0;
  let lastHearts = 3, prev = null, prevNearCreature = false;
  const deaths = [];

  try {
    while (Date.now() - started < BUDGET_MS) {
      const v = await look();
      if (!v) break;
      if (v.ended) {
        /* `ended` is set by BOTH completion and game over. Distinguishing them
           is the difference between "the chapter can be finished" and "the
           child ran out of hearts", so ask the UI which card it put up. */
        await page.waitForTimeout(400);
        const card = await page.evaluate(() => ({
          complete: !!document.getElementById('nNext') || !!document.getElementById('wMenu'),
          over: !!document.getElementById('oRetry'),
        }));
        outcome = card.complete ? 'completed' : card.over ? 'game-over' : 'ended-unknown';
        break;
      }

      /* Where hearts are lost is the whole diagnostic: a pit, a creature, or
         the boss are three completely different design problems. */
      if (v.hearts < lastHearts) {
        /* Report the previous tick: by now the child has already respawned, so
           v.pcx is the checkpoint, not the place it went wrong. */
        deaths.push(`${Math.round(prev ? prev.pcx : v.pcx)}:${prev && prev.feet > prev.groundY + 120 ? 'pit' : prevNearCreature ? 'creature' : v.bossActive ? 'boss' : 'unknown'}`);
        lastHearts = v.hearts;
      }
      prevNearCreature = v.monsters.some(m => Math.abs(m.d) < 80 && m.state !== 'happy');
      prev = v;

      /* Stuck-breaker. A real child jiggles: jumps, backs up, tries the button.
         Without this a single bad heuristic burns the whole time budget. */
      if (Math.abs(v.pcx - lastX) < 3) stuckTicks++; else stuckTicks = 0;
      lastX = v.pcx;
      if (stuckTicks > 26 && !v.modal) {
        stuckTicks = 0;
        await hold(null);
        await page.keyboard.press('KeyF');
        await page.keyboard.press('KeyG');
        await page.keyboard.down('ArrowLeft'); await page.waitForTimeout(160); await page.keyboard.up('ArrowLeft');
        await page.keyboard.down('ArrowRight');
        await page.keyboard.down('ArrowUp'); await page.waitForTimeout(230); await page.keyboard.up('ArrowUp');
        await page.waitForTimeout(120);
        await page.keyboard.up('ArrowRight');
        continue;
      }

      if (v.modal) {
        /* A recognition card is open. Answer it with the tree it is asking about. */
        const want = await page.evaluate(() => {
          const s = window.__ckk.getScene();
          return s.nearTree?.id ?? s.L.boss?.mimicId ?? null;
        });
        await hold(null);
        await answerCard(want);
        continue;
      }

      /* 1. A frightened creature ahead: calm it, then restore it. */
      const threat = v.monsters.find(m => m.state !== 'happy' && m.d > -70 && m.d < 260);
      if (threat) {
        if (threat.state === 'angry') {
          /* Keep the throwing distance a child naturally keeps. Too close and
             the creature reaches you before the sand does; too far and the
             sand falls short (it is a lobbed arc with a 1.1s life). */
          if (threat.d < 95) {
            await hold('ArrowLeft');
            await page.waitForTimeout(110);
            continue;
          }
          await hold(null);
          if (v.face < 0) {
            /* Face the creature before throwing, or the sand goes backwards. */
            await page.keyboard.down('ArrowRight'); await page.waitForTimeout(50); await page.keyboard.up('ArrowRight');
            continue;
          }
          if (v.sand > 0) {
            await page.keyboard.press('KeyG');
            /* Let the throw actually land before deciding anything else —
               otherwise the bot empties its whole sand budget in a second. */
            await page.waitForTimeout(650);
          } else {
            /* Out of sand: wait for a checkpoint refill rather than walking in. */
            await hold('ArrowLeft'); await page.waitForTimeout(200);
          }
          continue;
        }
        if (threat.state === 'blind') {
          /* Healing restores a heart, so it is always worth closing the gap. */
          if (Math.abs(threat.d) > 46) {
            await hold(threat.d > 0 ? 'ArrowRight' : 'ArrowLeft');
            await page.waitForTimeout(80);
            continue;
          }
          await hold(null);
          await page.keyboard.down('KeyH');
          await page.waitForTimeout(900);
          await page.keyboard.up('KeyH');
          continue;
        }
      }

      /* 1b. The Meadow's cooperative root gate is a bespoke beat: the Guardian
         stands on the sun-heart stone and waits for the friend it healed to
         reach its own. No generic heuristic reaches it, and that is the point
         of the chapter — so the autoplayer performs it explicitly. */
      if (v.meadowGate && !v.gateOpen) {
        const stone = 2401;
        if (Math.abs(v.px - stone) > 8) {
          await hold(v.px < stone ? 'ArrowRight' : 'ArrowLeft');
          await page.waitForTimeout(50);
          continue;
        }
        await hold(null);
        await page.waitForTimeout(400);
        continue;
      }

      /* 2. Standing in a puzzle zone with the matching power: use it. */
      if (v.puzzle && v.puzzle.inside && v.equipped === v.puzzle.eye) {
        await hold(null);
        await page.keyboard.press('KeyF');
        await page.waitForTimeout(220);
        continue;
      }

      /* 3. Beside a sleeping tree: wake it. */
      if (v.nearTree) {
        await hold(null);
        await page.waitForTimeout(60);
        await page.keyboard.press('KeyF');
        await page.waitForTimeout(320);
        continue;
      }

      /* 4. The boss. Calm with sand, then use the matching power. */
      if (v.bossActive && v.boss && v.boss.state !== 'defeated') {
        const bd = (v.boss.x + v.boss.w / 2) - v.pcx;
        if (v.boss.state === 'idle') {
          if (bd > 150) { await hold('ArrowRight'); await page.waitForTimeout(80); continue; }
          await hold(null);
          if (v.sand > 0) { await page.keyboard.press('KeyG'); await page.waitForTimeout(200); }
          else await page.waitForTimeout(300);
          continue;
        }
        if (v.boss.state === 'blind') {
          if (Math.abs(bd) > 70) { await hold(bd > 0 ? 'ArrowRight' : 'ArrowLeft'); await page.waitForTimeout(70); continue; }
          await hold(null);
          await page.keyboard.press('KeyF');
          await page.waitForTimeout(260);
          continue;
        }
        await hold(null); await page.waitForTimeout(200); continue;
      }

      /* 5. Otherwise walk right, jumping gaps and when a puzzle sits above. */
      await hold('ArrowRight');
      /* Jump late — the closer to the lip, the further the arc reaches. */
      const atLip = v.edge && v.edge.dist < 26;
      const needJump = atLip || (v.puzzle && !v.puzzle.inside && v.puzzle.zy < v.feet - 60 && Math.abs(v.puzzle.zx - v.pcx) < 130);
      if (needJump && v.onGround) {
        await page.keyboard.down('ArrowUp');
        await page.waitForTimeout(300);          /* full-height jump */
        await page.keyboard.up('ArrowUp');
        await page.waitForTimeout(120);          /* stay committed through the arc */
        continue;
      }
      await page.waitForTimeout(55);
    }
  } catch (e) {
    outcome = 'error';
    note = e.message.split('\n')[0];
  }
  await hold(null);

  const final = await look().catch(() => null);
  if (outcome === 'timeout' && final) {
    note = `stalled at x=${Math.round(final.pcx)}/${final.w} hearts=${final.hearts} boss=${final.boss ? final.boss.state + '/hp' + final.boss.hp : 'none'}`;
  }
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  if (deaths.length) note = (note ? note + ' · ' : '') + 'lost hearts at ' + deaths.join(', ');
  results.push({ level: idx + 1, name, outcome, seconds, errors: errors.length, note });
  console.log(`${outcome === 'completed' ? '✓' : '✗'} L${idx + 1} ${name} — ${outcome} in ${seconds}s${note ? ' · ' + note : ''}${errors.length ? ' · ' + errors.length + ' console errors' : ''}`);
  await ctx.close();
}

await browser.close();

const failed = results.filter(r => r.outcome !== 'completed');
console.log(`\n${results.length - failed.length}/${results.length} chapters completed.`);
if (failed.length) {
  console.log('Incomplete:', failed.map(f => `L${f.level} (${f.outcome})`).join(', '));
  process.exit(1);
}
