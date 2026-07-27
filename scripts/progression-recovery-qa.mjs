/* Adversarial progression QA. This deliberately creates the states children
   report as "stuck" and proves the game offers a deterministic escape:
   Meadow cannot skip empathy before roots; every boss arena regrows sand; and
   rescue clears interrupted input and returns to a known-safe position. */
const BASE = process.env.GAME_URL || 'http://localhost:5199';

let chromium;
try { ({ chromium } = await import('playwright')); }
catch { console.error('Playwright missing: npm i -D playwright'); process.exit(1); }

const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
const page = await browser.newPage({ viewport: { width: 1180, height: 820 } });

try {
  await page.goto(`${BASE}/?test`);
  await page.waitForFunction(() => !!window.__ckk);

  const meadow = await page.evaluate(() => {
    const api = window.__ckk;
    api.startLevel(0);
    const s = api.getScene();
    const grow = s.L.interact[1];
    s.player.x = grow.zone.x + 12; s.player.y = grow.zone.y + 20; s.equipped = grow.eye;
    s.doUse();
    const blocked = !grow.done;
    const friend = s.monsters[0]; friend.state = 'happy'; s.meadowStory.helper = friend;
    s.doUse();
    return { blocked, openedAfterHelp: grow.done };
  });
  if (!meadow.blocked || !meadow.openedAfterHelp) throw new Error(`Meadow prerequisite failure: ${JSON.stringify(meadow)}`);
  console.log('✓ Meadow empathy prerequisite is explicit and reversible');

  for (let idx = 1; idx < 10; idx++) {
    const result = await page.evaluate((levelIndex) => {
      const api = window.__ckk;
      api.startLevel(levelIndex);
      const s = api.getScene();
      s.bossActive = true; s.L.boss.state = 'idle'; s.sandLeft = 0; s.sands = [];
      s.updateRecovery(1.5);
      const replenished = s.sandLeft >= s.L.boss.hp;
      s.lastSafe = { x: 123, y: 300 }; s.player.x = 900; s.player.y = 650;
      s.press('right'); s.press('jump'); s.press('heal'); s.rescueToSafety();
      return { replenished, atSafe: s.player.x === 123 && s.player.y === 300, inputClear: !s.input2.right && !s.input2.jumpHeld && !s.input2.healHeld };
    }, idx);
    if (!result.replenished || !result.atSafe || !result.inputClear) throw new Error(`Level ${idx + 1} recovery failure: ${JSON.stringify(result)}`);
    console.log(`✓ Level ${idx + 1} resource + rescue recovery`);
  }
} finally {
  await browser.close();
}
