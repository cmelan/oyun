/* Boot: vanilla-Canvas engine + DOM UI + save wiring. */
import { Game } from './game/engine';
import { CONFIG } from './core/config';
import { setLang, type Lang } from './core/i18n';
import { loadSave, writeSave, recordTreeWake, type SaveData } from './core/save';
import { LEVELS } from './core/world';
import { LevelScene, type SceneHooks } from './game/LevelScene';
import { UI } from './game/ui';
import { initAudio, setMuted, isMuted, startMusic, sfx } from './game/audio';
import { preloadArt } from './game/assets';

const save: SaveData = loadSave(localStorage);
if (save.lang) setLang(save.lang as Lang);
void preloadArt();

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

function persist(): void { writeSave(save, localStorage); }

const hooks: SceneHooks = {
  get ui() { return ui; },
  journal: () => save.journal || [],
  onTreeLearned(id: string) {
    if (recordTreeWake(save, id)) persist();
  },
  onLevelComplete(idx: number, name: string, isLast: boolean) {
    save.furthest = Math.max(save.furthest || 0, idx + 1); persist();
    ui.setGameplayVisible(false);
    ui.showLevelComplete(name, isLast);
  },
  onGameOver() {
    ui.setGameplayVisible(false);
    ui.showGameOver();
  },
};

function startLevel(idx: number): void {
  initAudio(!!save.muted);
  currentIdx = Math.max(0, Math.min(idx, LEVELS.length - 1));
  paused = false;
  if (scene) { game.scene.stop(LevelScene.KEY); game.scene.remove(LevelScene.KEY); }
  scene = new LevelScene();
  game.scene.add(LevelScene.KEY, scene, true, { idx: currentIdx, hooks });
}

function pauseToggle(): void {
  if (!scene || !scene.scene.isActive() && !paused) return;
  paused = !paused;
  if (paused) { scene.scene.pause(); ui.showPause(); }
  else { ui.hideOverlay(); scene.scene.resume(); }
}

const ui = new UI({
  onStart: (idx) => startLevel(idx),
  onResume: () => { ui.hideOverlay(); paused = false; scene?.setModal(false); scene?.scene.resume(); ui.setGameplayVisible(true); },
  onRetry: () => startLevel(currentIdx),
  onNextLevel: () => startLevel(currentIdx + 1),
  onLangChange: (l) => { save.lang = l; persist(); if (!scene) ui.showMenu(); },
  onMuteToggle: () => { const m = !isMuted(); setMuted(m); save.muted = m; persist(); return m; },
  onRestartLevel: () => { if (scene) startLevel(currentIdx); },
  onPauseToggle: pauseToggle,
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
wrap.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
document.addEventListener('gesturestart', (e) => e.preventDefault()); /* iOS pinch zoom */
wrap.addEventListener('contextmenu', (e) => e.preventDefault());      /* long-press menu */
/* Portrait on a touch device: the CSS #rotateHint overlay covers the game —
   also pause a running level so nothing happens under it. */
const portrait = window.matchMedia('(orientation: portrait) and (pointer: coarse)');
portrait.addEventListener?.('change', (m) => {
  if (m.matches && scene && scene.scene.isActive()) pauseToggle();
});

startMusic();
ui.setGameplayVisible(false);
ui.showMenu();

/* e2e hook: ?test exposes the UI + level starter + art helpers so Playwright
   scripts (device matrix, design pack) can drive screens directly (never
   active for players). */
if (new URLSearchParams(location.search).has('test')) {
  import('./game/art').then(art => { (window as any).__ckk = { ui, startLevel, art }; });
}
export { game, sfx };
