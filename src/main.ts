/* Boot: vanilla-Canvas engine + DOM UI + save wiring. */
import { Game } from './game/engine';
import { CONFIG } from './core/config';
import { setLang, type Lang } from './core/i18n';
import { loadSave, writeSave, recordTreeWake, type SaveData } from './core/save';
import { LEVELS, LEVEL_META } from './core/world';
import { LevelScene, type SceneHooks } from './game/LevelScene';
import { UI } from './game/ui';
import { initAudio, setMuted, isMuted, startMusic, setMusicMood, setMusicBiome, sfx } from './game/audio';
import { preloadArt } from './game/assets';
import * as artHelpers from './game/art';
import { hasFullJourney, initPurchases, isFamilyPurchaseAvailable, presentFamilyPurchase } from './game/purchases';

const save: SaveData = loadSave(localStorage);
if (save.lang) setLang(save.lang as Lang);
const bootParams = new URLSearchParams(location.search);

/* Canvas is FIT-scaled + letterboxed by CSS (#game canvas{width/height:100%;object-fit:contain}). */
const game = new Game({
  parent: 'game',
  width: CONFIG.canvas.W,
  height: CONFIG.canvas.H,
  backgroundColor: '#57c0ba',
});

let scene: LevelScene | null = null;
let currentIdx = 0;
let paused = false;
/* Failures carried across retries of the SAME chapter. The invisible assist is
   worthless if it resets every time the scene is rebuilt, which is exactly what
   a retry does. Cleared on success or on leaving for a different chapter. */
let priorDeaths = 0;

function persist(): void { writeSave(save, localStorage); }

const hooks: SceneHooks = {
  get ui() { return ui; },
  journal: () => save.journal || [],
  onTreeLearned(id: string) {
    if (recordTreeWake(save, id)) persist();
  },
  onLevelComplete(idx: number, name: string, isLast: boolean) {
    priorDeaths = 0;
    save.furthest = Math.max(save.furthest || 0, idx + 1); persist();
    ui.setGameplayVisible(false);
    ui.showLevelComplete(name, isLast, idx === 0);
  },
  onGameOver() {
    priorDeaths = scene ? scene.deathCount() : priorDeaths;
    ui.setGameplayVisible(false);
    ui.showGameOver();
  },
};

function startLevel(idx: number): void {
  initAudio(!!save.muted);
  const next = Math.max(0, Math.min(idx, LEVELS.length - 1));
  if (next !== currentIdx) priorDeaths = 0;   /* a different chapter starts fresh */
  currentIdx = next;
  /* The biome decides the scale and timbre; the mood decides the intention.
     Every level used to be set to the same mood, so nine of ten chapters
     sounded identical. */
  setMusicBiome(LEVEL_META[currentIdx]?.biome);
  setMusicMood('explore');
  paused = false;
  if (scene) { game.scene.stop(LevelScene.KEY); game.scene.remove(LevelScene.KEY); }
  scene = new LevelScene();
  game.scene.add(LevelScene.KEY, scene, true, { idx: currentIdx, hooks, priorDeaths });
}

function pauseToggle(): void {
  if (!scene || !scene.scene.isActive() && !paused) return;
  paused = !paused;
  if (paused) { scene.scene.pause(); ui.showPause(); }
  else { ui.hideOverlay(); scene.scene.resume(); }
}

const ui = new UI({
  onStart: (idx) => idx === 0 || hasFullJourney() ? startLevel(idx) : ui.showFamilyGate(),
  onResume: () => { ui.hideOverlay(); paused = false; scene?.setModal(false); scene?.scene.resume(); ui.setGameplayVisible(true); },
  onRetry: () => startLevel(currentIdx),
  onNextLevel: () => hasFullJourney() ? startLevel(currentIdx + 1) : ui.showFamilyGate(),
  onLangChange: (l) => { save.lang = l; persist(); if (!scene) ui.showMenu(); },
  onMuteToggle: () => { const m = !isMuted(); setMuted(m); save.muted = m; persist(); return m; },
  onRestartLevel: () => { if (scene) startLevel(currentIdx); },
  onRescue: () => scene?.rescueToSafety(),
  onPauseToggle: pauseToggle,
  canAccessLevel: (idx) => idx === 0 || hasFullJourney(),
  isFamilyPurchaseAvailable,
  onFamilyPurchase: presentFamilyPurchase,
  press: (a) => scene?.press(a),
  release: (a) => scene?.release(a),
  onTreeAnswer: (ok, id) => scene?.resolveTreeAnswer(ok, id),
  onMimicAnswer: (ok) => scene?.resolveMimicAnswer(ok),
}, save);

window.addEventListener('keydown', (e) => {
  if ((e.code === 'KeyP' || e.code === 'Escape') && scene) { e.preventDefault(); pauseToggle(); }
});
window.addEventListener('pointerdown', () => initAudio(!!save.muted), { once: true });

/* --- mobile hardening --- */
/* Block browser gestures over the game surface (pull-to-refresh, overscroll,
   two-finger page zoom); the pads/cards handle their own pointer events. */
const wrap = document.getElementById('wrap')!;
/* The playable canvas remains gesture-free, but cards are real scroll
   containers. Preventing every touchmove on #wrap made short phone cards trap
   the child below their own primary action. */
wrap.addEventListener('touchmove', (e) => {
  if ((e.target as HTMLElement | null)?.closest('#ov .card')) return;
  e.preventDefault();
}, { passive: false });
document.addEventListener('gesturestart', (e) => e.preventDefault()); /* iOS pinch zoom */
wrap.addEventListener('contextmenu', (e) => e.preventDefault());      /* long-press menu */
const releaseInterruptedInput = () => scene?.releaseAll();
window.addEventListener('blur', releaseInterruptedInput);
document.addEventListener('visibilitychange', () => { if (document.hidden) releaseInterruptedInput(); });
/* Portrait on a touch device: the CSS #rotateHint overlay covers the game —
   also pause a running level so nothing happens under it. */
const portrait = window.matchMedia('(orientation: portrait) and (pointer: coarse)');
let portraitPaused = false;
portrait.addEventListener?.('change', (m) => {
  releaseInterruptedInput();
  if (m.matches && scene && scene.scene.isActive()) { portraitPaused = true; pauseToggle(); }
  else if (!m.matches && portraitPaused && scene && paused) {
    portraitPaused = false; paused = false; ui.hideOverlay(); scene.scene.resume(); ui.setGameplayVisible(true);
  }
});

startMusic();
ui.setGameplayVisible(false);
void Promise.all([preloadArt(), initPurchases()]).finally(() => {
  document.body.classList.remove('booting');
  const stage = bootParams.get('stage');
  if (bootParams.has('test') && stage?.startsWith('oak-')) {
    startLevel(0);
    const s = scene as any;
    const finalTree = s.L.trees.find((tree: any) => tree.finale);
    s.meadowStory.pressureAwake = true;
    s.player.x = finalTree.x - 135; s.player.y = 292; s.player.vx = 0; s.player.vy = 0;
    s.cam = s.L.w - CONFIG.canvas.W; s.cameras.main.setScroll(s.cam, 0);
    if (stage === 'oak-awake') {
      finalTree.awake = true; s.meadowStory.restoring = 1.72; s.meadowStory.restoreCue = 2;
      setMusicMood('restored');
    }
  } else {
    setMusicMood('menu');
    ui.showMenu();
  }
});

/* e2e hook: ?test exposes the UI + level starter + art helpers so Playwright
   scripts (device matrix, design pack) can drive screens directly (never
   active for players). */
if (bootParams.has('test')) {
  (window as any).__ckk = { ui, startLevel, getScene: () => scene, art: artHelpers };
}
export { game, sfx };
