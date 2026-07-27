/* Mobile overlay regression check. It tests the actual DOM cards in the short
   landscape viewports where the original Continue button was below the fold. */
import { chromium } from 'playwright';

const BASE = process.env.GAME_URL || 'http://127.0.0.1:5173';
const DEVICES = [
  ['small-landscape', 568, 320],
  ['iphone-se', 667, 375],
  ['iphone-15', 852, 393],
  ['pixel-7', 915, 412],
];

const browser = await chromium.launch(
  process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});

for (const [name, width, height] of DEVICES) {
  const page = await browser.newPage({ viewport: { width, height }, hasTouch: true, isMobile: true });
  await page.goto(`${BASE}/?test`);
  await page.waitForFunction(() => !!window.__ckk);

  await page.evaluate(() => window.__ckk.ui.showTreeWake('meşe', () => {}));
  await page.waitForSelector('#tDone');
  const wake = await page.evaluate(() => {
    const button = document.querySelector('#tDone');
    const card = document.querySelector('#card');
    if (!button || !card) return null;
    const r = button.getBoundingClientRect();
    const c = card.getBoundingClientRect();
    return {
      visible: r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth,
      /* WebKit can report a 48px CSS control as 47.99 device px. */
      usable: r.height >= 47 && r.width >= 44,
      dimensions: [r.width, r.height],
      cardFits: c.top >= 0 && c.bottom <= innerHeight,
      touchAction: getComputedStyle(card).touchAction,
    };
  });
  if (!wake?.visible || !wake.usable || !wake.cardFits || wake.touchAction !== 'pan-y') {
    throw new Error(`${name}: wake card failed ${JSON.stringify(wake)}`);
  }
  await page.click('#tDone');

  await page.evaluate(() => window.__ckk.ui.showTreeQuestion('meşe', ['meşe', 'çınar', 'ıhlamur'], 'leaf'));
  await page.waitForSelector('.treeChoice');
  const question = await page.evaluate(() => {
    const card = document.querySelector('#card');
    const choices = [...document.querySelectorAll('.treeChoice')];
    if (!card || choices.length !== 3) return null;
    const r = card.getBoundingClientRect();
    return {
      cardFits: r.top >= 0 && r.bottom <= innerHeight,
      allChoicesTappable: choices.every(choice => {
        const b = choice.getBoundingClientRect();
        return b.width >= 44 && b.height >= 44 && b.top >= 0 && b.bottom <= innerHeight;
      }),
    };
  });
  if (!question?.cardFits || !question.allChoicesTappable) {
    throw new Error(`${name}: recognition card failed ${JSON.stringify(question)}`);
  }
  console.log(`✓ ${name} ${width}×${height}`);
  await page.close();
}
await browser.close();
