/* Browser-level golden path: drives the real keyboard/UI surface through the
   full Meadow story. It reads test-only state solely to know when a child-like
   input has succeeded; it never mutates scene state. */
import { chromium } from 'playwright';

const base = process.env.GAME_URL || 'http://127.0.0.1:5173';
const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const started = Date.now();

const sceneValue = (expression) => page.evaluate(expression => {
  const s = window.__ckk?.getScene?.();
  if (!s) return null;
  return Function('s', `return (${expression})`)(s);
}, expression);
const waitFor = async (expression, label, timeout = 8000) => {
  const until = Date.now() + timeout;
  while (Date.now() < until) {
    if (await sceneValue(expression)) return;
    await page.waitForTimeout(50);
  }
  const state = await sceneValue("({x:s.player.x,y:s.player.y,vx:s.player.vx,vy:s.player.vy,grounded:s.player.grounded,modal:s.modal,ended:s.ended})");
  throw new Error(`Timed out: ${label} · ${JSON.stringify(state)}`);
};
const moveTo = async (x, timeout = 9000) => {
  await page.keyboard.down('ArrowRight');
  try { await waitFor(`s.player.x >= ${x}`, `walk to ${x}`, timeout); }
  finally { await page.keyboard.up('ArrowRight'); }
};
const jumpRight = async (x, timeout = 5000) => {
  await page.keyboard.down('ArrowRight'); await page.keyboard.down('ArrowUp');
  try { await waitFor(`s.player.x >= ${x}`, `jump to ${x}`, timeout); }
  finally { await page.keyboard.up('ArrowUp'); await page.keyboard.up('ArrowRight'); }
};

try {
  await page.addInitScript(() => localStorage.setItem('ckk2_save_v2', JSON.stringify({ furthest: 0, journal: [], lang: 'en' })));
  await page.goto(`${base}/?test`, { waitUntil: 'networkidle' });
  await page.click('#mStart');
  await waitFor('!!s.player', 'level start');

  await moveTo(330);
  await jumpRight(545);
  await moveTo(650);
  await page.keyboard.press('KeyF');
  await waitFor('s.L.interact[0].done', 'freeze the stream');
  await moveTo(1030);

  /* Calm from a safe observing distance, then approach only after it stops. */
  const movingMossX = await sceneValue('s.monsters[0].x');
  await moveTo(Math.max(1040, movingMossX - 125), 3500);
  let calmed = false;
  for (let attempt = 0; attempt < 3 && !calmed; attempt++) {
    await page.keyboard.press('KeyG');
    const until = Date.now() + 1100;
    while (Date.now() < until && !(calmed = await sceneValue("s.monsters[0].state === 'blind'"))) await page.waitForTimeout(40);
    if (!calmed) await moveTo((await sceneValue('s.player.x')) + 24, 1500);
  }
  if (!calmed) {
    const miss = await sceneValue("({player:s.player.x,face:s.player.face,monster:s.monsters[0].x,state:s.monsters[0].state,sand:s.sandLeft})");
    throw new Error(`Could not calm Mossling · ${JSON.stringify(miss)}`);
  }
  const blindX = await sceneValue('s.monsters[0].x');
  const playerX = await sceneValue('s.player.x');
  if (playerX < blindX - 54) await moveTo(blindX - 48);
  await page.keyboard.down('KeyH');
  try { await waitFor("s.monsters[0].state === 'happy'", 'heal the Mossling', 4500); }
  finally { await page.keyboard.up('KeyH'); }

  await moveTo(1325);
  await page.keyboard.press('KeyF');
  await waitFor('s.L.interact[1].done', 'grow the leaf path');
  await jumpRight(1710);
  await page.keyboard.press('KeyF');
  await waitFor('s.L.interact[2].done', 'wake the hanging bridge');
  await jumpRight(2070);
  /* The Guardian's sun-heart stone is deliberately a real second half of the
     cooperation puzzle; stop on it while the healed friend reaches theirs. */
  await moveTo(2401);
  await waitFor('s.meadowStory.pressureAwake', 'companion pressure-stone cooperation', 42000);

  await moveTo(2945);
  /* Let the next animation frame publish proximity before sending the tap. A
     human naturally releases the movement key before pressing interact. */
  await waitFor("s.nearTree?.id === 'meşe'", 'stand beside the ancient oak', 1500);
  await page.keyboard.press('KeyF');
  await page.waitForSelector('.treeChoice[data-id="meşe"]', { timeout: 4000 });
  await page.click('.treeChoice[data-id="meşe"]');
  await page.click('#tDone');
  await waitFor('s.meadowStory.restoreCue === 3', 'full restoration choreography', 5000);
  await page.waitForSelector('#nNext', { timeout: 5000 });

  const elapsed = ((Date.now() - started) / 1000).toFixed(1);
  const summary = await sceneValue(`({
    interactions:s.L.interact.map(i=>i.done),
    helper:s.monsters[0].state,
    gate:s.meadowStory.pressureAwake,
    restoration:s.meadowStory.restoreCue,
    ended:s.ended
  })`);
  const nextLabel = await page.locator('#nNext').innerText();
  if (!/Emerald Peaks/.test(nextLabel)) throw new Error(`Unclear Meadow transition label: ${nextLabel}`);
  await page.click('#nNext');
  await waitFor('s.idx === 1', 'enter Emerald Peaks after the Meadow finale', 5000);
  summary.nextChapter = await sceneValue('s.idx === 1');
  console.log(`✓ full Meadow browser playthrough in ${elapsed}s`);
  console.log(JSON.stringify(summary));
} finally {
  await browser.close();
}
