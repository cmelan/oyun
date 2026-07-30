/* LevelScene — v1 engine on the vanilla-Canvas engine (src/game/engine.ts).
   Kinematics/constants are the proven v1 values (game feel preserved); the engine
   supplies the camera (scroll/shake/flash) and render loop. World entities draw
   immediate-mode into Graphics layers (a faithful port of the v1 renderer). */
import { Scene, Graphics, BLEND, hexToNum } from './engine';
import { CONFIG, TOOLS, type Eye } from '../core/config';
import { BIOME } from '../core/biomes';
import { prepLevel, LEVEL_META, WORLD, LEVELS, regionTreePool } from '../core/world';
import type { LevelData, Interact, BossData, Rect, TreeInstance } from '../core/generator';
import {
  sandCapacity, makeMonster, sandHit, empathyTick, bossSandHit, bossCageResolve,
  mimicNextId, assistFactors, overlap, type MonsterRuntime, type AssistState,
} from '../core/logic';
import { TREES } from '../core/trees';
import { LEAF_COLOR } from './art';
import { sfx, setMusicMood, currentMood, type MusicMood } from './audio';
import type { UI } from './ui';
import { art } from './assets';
import { drawMeadowForeground, drawMeadowMidground } from './meadowEnvironment';
import { sceneryFor } from '../core/scenery';
import { drawSky, drawRidges, drawPlatformSurface, drawGroundCover, drawFringe, drawAmbient } from './environment';
import { speciesFor } from '../core/creatures';
import { drawCreature } from './creatureArt';
import { drawBossCreature } from './bossArt';
import { chapterFor, currentStep, type ChapterState } from '../core/chapters';
import { S } from '../core/i18n';

const { GRAV, MOVE, ACCEL, FRICTION, JUMP_V, JUMP_CUT, MAX_FALL, BOUNCE, COYOTE, JBUF } = CONFIG.physics;
const W = CONFIG.canvas.W, H = CONFIG.canvas.H;

interface InputState { left: boolean; right: boolean; jumpEdge: boolean; jumpHeld: boolean; useEdge: boolean; sandEdge: boolean; healHeld: boolean }
interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; col: number; alpha: number; r: number }
interface Sand { x: number; y: number; vx: number; vy: number; life: number }
interface Shot { x: number; y: number; vx: number; vy: number }

export interface SceneHooks {
  ui: UI;
  journal(): string[];
  onTreeLearned(id: string): void;
  onLevelComplete(idx: number, name: string, isLast: boolean): void;
  onGameOver(): void;
}

export class LevelScene extends Scene {
  static KEY = 'level';
  private hooks!: SceneHooks;
  private L!: LevelData;
  private idx = 0;
  private monsters: MonsterRuntime[] = [];
  private gfx!: Graphics;
  private bgGfx!: Graphics;
  private foregroundGfx!: Graphics;
  private darkGfx!: Graphics;
  private input2: InputState = { left: false, right: false, jumpEdge: false, jumpHeld: false, useEdge: false, sandEdge: false, healHeld: false };
  private player = { x: 90, y: 340, w: CONFIG.player.w, h: CONFIG.player.h, vx: 0, vy: 0, grounded: false, face: 1, coyote: 0, jbuf: 0, iframe: 0, squash: 1, squashVel: 0, blink: 0, blinkT: 2.2 };
  private hearts: number = CONFIG.hearts;
  private respawn = { x: 90, y: 340 };
  private lastSafe = { x: 90, y: 340 };
  private cam = 0;
  private t = 0;
  private equipped: Eye | null = null;
  private sands: Sand[] = [];
  private sandLeft = 0; private sandMax = 0;
  private healTarget: MonsterRuntime | null = null;
  private nearTree: { id: string; x: number; y: number; awake?: boolean } | null = null;
  private bossActive = false;
  private bossShots: Shot[] = [];
  private particles: Particle[] = [];
  private assist: AssistState = { deaths: 0 };
  private modal = false;   /* card open: world frozen */
  private ended = false;
  private introSeen = new Set<number>();
  /* Meadow's ending is a readable two-character tableau, not an invisible
     position check: the Guardian takes the sun-heart stone and the friend takes
     the leaf-heart stone. gateStep drives one-time spoken/visual prompts. */
  private meadowStory: { helper: MonsterRuntime | null; pressureAwake: boolean; restoring: number; restoreCue: number; gateStep: number; oakGuided: boolean } = { helper: null, pressureAwake: false, restoring: 0, restoreCue: 0, gateStep: 0, oakGuided: false };
  private keyHandlers: { dn: (e: KeyboardEvent) => void; up: (e: KeyboardEvent) => void } | null = null;
  private reducedMotion = false;
  private objectiveKey = '';
  private progressSignature = '';
  private noProgressT = 0;
  private bossRefillT = 0;

  constructor() { super(LevelScene.KEY); }

  init(data: { idx: number; hooks: SceneHooks }): void {
    this.idx = data.idx; this.hooks = data.hooks;
  }

  create(): void {
    this.L = prepLevel(this.idx, this.hooks.journal());
    this.monsters = this.L.monsters.map(makeMonster);
    this.hearts = CONFIG.hearts;
    this.respawn = { x: this.L.spawn.x, y: this.L.spawn.y };
    this.lastSafe = { x: this.L.spawn.x, y: this.L.spawn.y };
    this.player.x = this.L.spawn.x; this.player.y = this.L.spawn.y;
    this.player.vx = 0; this.player.vy = 0; this.player.iframe = 0; this.player.squash = 1;
    this.cam = 0; this.t = 0; this.ended = false; this.modal = false;
    this.bossActive = false; this.bossShots = []; this.sands = []; this.particles = [];
    this.assist = { deaths: 0 }; this.introSeen.clear();
    this.objectiveKey = ''; this.progressSignature = ''; this.noProgressT = 0; this.bossRefillT = 0;
    this.meadowStory = { helper: null, pressureAwake: false, restoring: 0, restoreCue: 0, gateStep: 0, oakGuided: false };
    this.reducedMotion = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.sandMax = sandCapacity(this.L); this.sandLeft = this.sandMax;
    this.bgGfx = this.add.graphics().setScrollFactor(0);
    this.gfx = this.add.graphics();
    this.foregroundGfx = this.add.graphics().setScrollFactor(0);
    this.darkGfx = this.add.graphics().setScrollFactor(0);
    this.cameras.main.setBounds(0, 0, this.L.w, H);
    this.bindKeys();
    const ui = this.hooks.ui;
    ui.clearHints();          /* a new chapter never inherits the last one's voice */
    ui.setGameplayVisible(true);
    ui.setHearts(this.hearts, CONFIG.hearts);
    ui.setSand(this.sandLeft);
    ui.setPower(null);
    ui.setRescueVisible(false);
    ui.hideOverlay();
    this.updateObjective(true);
  }

  private bindKeys(): void {
    if (this.keyHandlers) {
      window.removeEventListener('keydown', this.keyHandlers.dn);
      window.removeEventListener('keyup', this.keyHandlers.up);
    }
    const keyMap: Record<string, string> = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'jump', KeyW: 'jump', Space: 'jump', KeyF: 'use', KeyG: 'sand', KeyH: 'heal' };
    const dn = (e: KeyboardEvent) => { const a = keyMap[e.code]; if (a) { e.preventDefault(); if (!e.repeat) this.press(a); } };
    const up = (e: KeyboardEvent) => { const a = keyMap[e.code]; if (a) { e.preventDefault(); this.release(a); } };
    window.addEventListener('keydown', dn); window.addEventListener('keyup', up);
    this.keyHandlers = { dn, up };
  }
  press(a: string): void {
    const i = this.input2;
    if (a === 'left') i.left = true; if (a === 'right') i.right = true;
    if (a === 'jump') { i.jumpEdge = true; i.jumpHeld = true; }
    if (a === 'use') i.useEdge = true; if (a === 'sand') i.sandEdge = true; if (a === 'heal') i.healHeld = true;
  }
  release(a: string): void {
    const i = this.input2;
    if (a === 'left') i.left = false; if (a === 'right') i.right = false;
    if (a === 'jump') i.jumpHeld = false; if (a === 'heal') i.healHeld = false;
  }
  releaseAll(): void {
    this.input2.left = false; this.input2.right = false; this.input2.jumpHeld = false;
    this.input2.jumpEdge = false; this.input2.useEdge = false; this.input2.sandEdge = false; this.input2.healHeld = false;
  }
  rescueToSafety(): void {
    if (this.ended) return;
    this.player.x = this.lastSafe.x; this.player.y = this.lastSafe.y;
    this.player.vx = 0; this.player.vy = 0; this.player.iframe = 1.1;
    this.releaseAll(); this.noProgressT = 0; this.sands = []; this.bossShots = [];
    this.sandLeft = Math.max(this.sandLeft, this.L.boss && this.bossActive ? Math.max(1, this.L.boss.hp) : 1);
    this.hooks.ui.setSand(this.sandLeft); this.hooks.ui.setRescueVisible(false);
    this.hooks.ui.showHint(S('objective.explore'), 2.4); sfx('ding');
  }
  setModal(m: boolean): void { this.modal = m; }
  shutdown(): void {
    if (this.keyHandlers) {
      window.removeEventListener('keydown', this.keyHandlers.dn);
      window.removeEventListener('keyup', this.keyHandlers.up);
      this.keyHandlers = null;
    }
  }

  /* ---------- helpers ---------- */
  private spawnP(x: number, y: number, n: number, col: number, sp: number, life: number): void {
    const count = this.reducedMotion ? Math.min(8, Math.ceil(n * .22)) : n;
    const speed = this.reducedMotion ? sp * .28 : sp;
    for (let i = 0; i < count; i++) this.particles.push({ x, y, vx: (Math.random() * 2 - 1) * speed, vy: (Math.random() * 2 - 1) * speed - 40, life, max: life, col, alpha: 1, r: 2 + Math.random() * 3 });
  }
  private shake(mag: number, dur: number): void { if (!this.reducedMotion) this.cameras.main.shake(dur * 1000, mag * 0.0016); }
  private flash(duration: number, r: number, g: number, b: number): void {
    if (!this.reducedMotion) this.cameras.main.flash(duration, r, g, b);
  }
  private solids(): Rect[] {
    const arr = this.L.platforms.slice();
    for (const it of this.L.interact) {
      const t = it.type, a = it as any;
      if (t === 'freeze' && it.done) arr.push(a.ice);
      if (t === 'thorn' && !it.done) arr.push(a.wall);
      if (t === 'grow' && it.done) arr.push(...a.leaves);
      if (t === 'bridge' && it.done) arr.push(a.bridge);
      if (t === 'rock' && !it.done) arr.push(a.block);
      if (t === 'mush' && it.done) arr.push(a.pad);
    }
    /* The Meadow's final root gate is opened by the creature the child healed.
       It is a cooperation check, not a dexterity or combat check. */
    if (this.idx === 0 && !this.meadowStory.pressureAwake) arr.push({ x: 2640, y: 188, w: 34, h: 164 });
    if (this.L.arena && this.bossActive && this.L.boss && this.L.boss.state !== 'defeated') arr.push(this.L.arena.wall);
    return arr;
  }
  /* The tree whose waking ends the chapter. Identified by data, not by a
     position guess — the level author decides, and the level can be moved. */
  private finaleTree(): TreeInstance | undefined { return this.L.trees.find(tr => tr.finale); }
  private mbox(m: MonsterRuntime) { return { x: m.x, y: m.ground - (m as any).h, w: (m as any).w, h: (m as any).h }; }
  private bossBox(b: BossData) { return { x: b.x, y: b.ground - b.h * b.scale, w: b.w * b.scale, h: b.h * b.scale }; }
  private nearBoss(): boolean {
    const b = this.L.boss; if (!b) return false;
    return Math.abs((this.player.x + this.player.w / 2) - (b.x + b.w / 2)) < b.w / 2 + CONFIG.boss.meleeRange
      && Math.abs((this.player.y + this.player.h) - b.ground) < CONFIG.boss.meleeVRange;
  }

  /* ---------- interactions ---------- */
  private activate(it: Interact): void {
    it.done = true;
    const a = it as any;
    a.animT = 0;
    this.flash(160, 190, 240, 220);
    switch (it.type) {
      case 'freeze': sfx('freeze'); this.spawnP(a.ice.x + a.ice.w / 2, a.ice.y, 30, 0xbfe9ff, 240, .9); break;
      case 'thorn': sfx('burn'); this.spawnP(a.wall.x + 14, a.wall.y + 60, 26, 0xff8a4a, 200, .8); break;
      case 'grow': sfx('grow'); a.leaves.forEach((l: Rect) => this.spawnP(l.x + l.w / 2, l.y, 14, 0x7fe0a0, 150, .8)); break;
      case 'bridge': sfx('wake'); this.spawnP(a.bridge.x + a.bridge.w / 2, a.bridge.y, 22, 0xd9b98a, 200, .8); break;
      case 'rock': sfx('shrink'); this.spawnP(a.block.x + a.block.w / 2, a.block.y + 50, 24, 0xb07ad8, 180, .8); break;
      case 'mush': sfx('grow'); this.spawnP(a.pad.x + a.pad.w / 2, a.pad.y, 18, 0x7fe0a0, 160, .8); break;
      case 'torch': sfx('burn'); this.spawnP(a.x, a.y - 30, 18, 0xffcf7a, 150, .8); break;
    }
  }
  private computeEquip(): Eye | null {
    const px = this.player.x + this.player.w / 2, py = this.player.y + this.player.h / 2;
    for (const it of this.L.interact) {
      if (it.done) continue;
      const z = it.zone;
      if (px > z.x && px < z.x + z.w && py > z.y && py < z.y + z.h) return it.eye;
    }
    const b = this.L.boss;
    if (b && this.bossActive && b.state === 'blind' && this.nearBoss()) return b.cageEye;
    return this.equipped;
  }
  private doUse(): void {
    const b = this.L.boss;
    if (b && this.bossActive && b.state === 'blind' && this.equipped === b.cageEye && this.nearBoss()) {
      if (b.kind === 'mimic') {
        this.setModal(true);
        const pool = regionTreePool(this.L.regionIdx!, this.hooks.journal());
        b.mimicId = mimicNextId(pool, b.mimicId);
        this.hooks.ui.showMimicQuestion(b.mimicId, pool, WORLD[this.L.regionIdx!].clueTier);
      } else this.startFinish();
      return;
    }
    if (this.nearTree && !this.nearTree.awake) {
      this.setModal(true);
      const pool = regionTreePool(this.L.regionIdx!, this.hooks.journal());
      this.hooks.ui.showTreeQuestion(this.nearTree.id, pool, WORLD[this.L.regionIdx!].clueTier);
      return;
    }
    const px = this.player.x + this.player.w / 2, py = this.player.y + this.player.h / 2;
    for (const it of this.L.interact) {
      if (it.done) continue;
      const z = it.zone;
      if (px > z.x && px < z.x + z.w && py > z.y && py < z.y + z.h && it.eye === this.equipped) {
        if (this.idx === 0 && it.type === 'grow' && !this.meadowStory.helper) {
          this.hooks.ui.showHint(S('meadow.friendRequired'), 4.8); return;
        }
        this.activate(it); return;
      }
    }
  }

  /** Everything a chapter step is allowed to see. */
  private chapterState(): ChapterState {
    const b = this.L.boss;
    return {
      puzzles: this.L.interact.map(it => it.done),
      healed: this.monsters.filter(m => m.state === 'happy').length,
      creatures: this.monsters.length,
      treesAwake: this.L.trees.filter(t => t.awake).length,
      trees: this.L.trees.length,
      finaleAwake: !!this.finaleTree()?.awake,
      bossActive: this.bossActive,
      bossCalmed: !!b && (b.state === 'blind' || b.state === 'caged' || b.state === 'defeated'),
      gateOpen: this.meadowStory.pressureAwake,
      progress: this.L.w > 0 ? (this.player.x + this.player.w / 2) / this.L.w : 0,
    };
  }

  /* The score follows the situation, not the level index. Held for a beat after
     a change so a creature walking in and out of range cannot flap the music. */
  private musicHold = 0;
  private updateMusic(dt: number, state: ChapterState): void {
    this.musicHold = Math.max(0, this.musicHold - dt);
    if (this.musicHold > 0) return;
    const pcx = this.player.x + this.player.w / 2;
    const frightenedNear = this.monsters.some(m =>
      m.state === 'angry' && Math.abs((m.x + (m as any).w / 2) - pcx) < 260);
    const want: MusicMood = this.meadowStory.restoring > 0 ? 'restored'
      : state.bossActive && !state.bossCalmed ? 'tension'
        : this.healTarget ? 'healing'
          : frightenedNear ? 'tension'
            : this.nearTree ? 'discovery'
              : 'explore';
    if (want !== currentMood()) { setMusicMood(want); this.musicHold = 1.6; }
  }

  private updateObjective(force = false): void {
    /* Was a two-branch if: Level 1's whole script inline, and one fixed
       three-step bar shared verbatim by the other nine chapters. */
    const chapter = chapterFor(LEVEL_META[this.idx]?.regionId);
    const state = this.chapterState();
    this.updateMusic(1 / 60, state);
    const current = currentStep(chapter, state);
    const steps = chapter.steps.map(s => s.icon);
    const label = S(chapter.steps[current].labelKey);
    const key = `${current}:${label}`;
    if (force || key !== this.objectiveKey) {
      this.objectiveKey = key; this.noProgressT = 0;
      this.hooks.ui.setObjective(steps, current, label);
      this.hooks.ui.setRescueVisible(false);
    }
  }

  private updateRecovery(dt: number): void {
    const p = this.player, b = this.L.boss;
    if (p.grounded && p.iframe <= 0) this.lastSafe = { x: p.x, y: p.y };
    const signature = `${this.L.interact.map(it => Number(it.done)).join('')}:${this.monsters.map(m => m.state[0]).join('')}:${this.meadowStory.pressureAwake}:${this.L.trees.map(t => Number(!!t.awake)).join('')}:${b?.state || '-'}:${b?.hp ?? '-'}:${this.respawn.x}`;
    if (signature !== this.progressSignature) {
      this.progressSignature = signature; this.noProgressT = 0; this.hooks.ui.setRescueVisible(false);
    } else {
      const engaged = this.input2.left || this.input2.right || this.input2.healHeld || this.bossActive || (this.idx === 0 && p.x > 1180);
      if (engaged) this.noProgressT += dt;
      if (this.noProgressT >= 12) {
        this.hooks.ui.setRescueVisible(true);
        if (this.noProgressT - dt < 12) this.hooks.ui.showHint(S('rescue.hint'), 3.6);
      }
    }
    if (b && this.bossActive && b.state !== 'defeated' && this.sandLeft <= 0 && this.sands.length === 0) {
      this.bossRefillT += dt;
      if (this.bossRefillT >= 1.4) {
        this.bossRefillT = 0; this.sandLeft = Math.max(1, b.hp); this.hooks.ui.setSand(this.sandLeft);
        this.hooks.ui.showHint(S('boss.sandReturn'), 2.6); sfx('ding');
      }
    } else this.bossRefillT = 0;
  }

  /* modal answers, called from main wiring */
  resolveTreeAnswer(correct: boolean, treeId: string): void {
    if (!correct) { this.shake(CONFIG.tree.wrongShake, .15); sfx('hmm'); return; }
    const tr = this.L.trees.find(t => t.id === treeId && !t.awake);
    if (tr) {
      tr.awake = true; sfx('wake');
      this.spawnP(tr.x, tr.y - 70, 26, 0xffe6a0, 180, 1.1); this.shake(2, .2);
      this.hooks.onTreeLearned(treeId);
    }
    const isFinalMeadowOak = this.idx === 0 && !!tr && !!tr.finale;
    this.hooks.ui.showTreeWake(treeId, () => {
      this.hooks.ui.hideOverlay(); this.setModal(false);
      if (isFinalMeadowOak) this.beginMeadowRestoration();
    }, isFinalMeadowOak ? S('tree.wake.finish') : undefined);
  }
  private beginMeadowRestoration(): void {
    if (this.meadowStory.restoring > 0) return;
    const oakX = this.finaleTree()?.x ?? 3005;
    this.meadowStory.restoring = .001;
    this.meadowStory.restoreCue = 0;
    this.spawnP(oakX, 230, 70, 0xffe59a, 250, 2.6);
    this.spawnP(oakX - 85, 310, 45, 0x8fe3a8, 180, 2.4);
    setMusicMood('restored'); sfx('wake'); this.flash(500, 255, 235, 175);
    this.hooks.ui.showHint(S('meadow.restored'), 3.2);
  }
  private updateMeadowRestoration(dt: number): boolean {
    if (this.meadowStory.restoring <= 0) return false;
    const story = this.meadowStory;
    const oakX = this.finaleTree()?.x ?? 3005;
    story.restoring += dt;
    if (story.restoreCue === 0 && story.restoring >= .75) {
      story.restoreCue = 1; sfx('grow');
      this.spawnP(oakX, 328, 44, 0x8fe3a8, 190, 2.1);
    }
    if (story.restoreCue === 1 && story.restoring >= 1.55) {
      story.restoreCue = 2; sfx('streak'); this.flash(360, 255, 215, 110);
      this.spawnP(oakX, 185, 64, 0xffe27a, 230, 2.2);
    }
    if (story.restoreCue === 2 && story.restoring >= 2.55) {
      story.restoreCue = 3; sfx('clear');
      for (let x = 2500; x <= this.L.w - 20; x += 80) this.spawnP(x, 330, 14, x % 160 ? 0x9fe6b3 : 0xffe59a, 155, 1.8);
    }
    /* A brief, non-interactive finale makes the causal chain legible: helper →
       roots → oak → whole meadow. The camera settles instead of snapping. */
    this.player.vx = 0; this.input2.left = false; this.input2.right = false;
    const target = Math.max(0, this.L.w - W);
    this.cam += (target - this.cam) * Math.min(1, dt * 2.4);
    this.cameras.main.setScroll(this.cam, 0);
    for (let pi = this.particles.length - 1; pi >= 0; pi--) {
      const pt = this.particles[pi]; pt.life -= dt;
      if (pt.life <= 0) { this.particles.splice(pi, 1); continue; }
      pt.vy += 220 * dt; pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.alpha = pt.life / pt.max;
    }
    this.draw();
    if (story.restoring >= 4.1) this.completeLevel();
    return true;
  }
  resolveMimicAnswer(correct: boolean): void {
    if (!correct) { this.shake(CONFIG.tree.wrongShake, .15); sfx('hmm'); return; }
    this.hooks.ui.hideOverlay(); this.setModal(false);
    this.startFinish();
  }

  /* ---------- boss ---------- */
  private startFinish(): void {
    const b = this.L.boss!;
    b.state = 'caged'; b.cageT = CONFIG.boss.cageT0; b.shake = .4; this.shake(5, .18);
    if (b.finisher === 'shrink') { sfx('shrink'); this.spawnP(b.x + b.w / 2, b.ground - b.h / 2, 24, 0xb07ad8, 200, .9); }
    else { sfx('cage'); this.spawnP(b.x + b.w / 2, b.ground - b.h / 2, 28, 0x5fc77f, 200, .9); }
  }
  private updateBoss(dt: number, pcx: number): void {
    const b = this.L.boss; if (!b) return;
    const C = CONFIG.boss;
    if (!this.bossActive && this.L.arena && pcx > this.L.arena.trig) {
      this.bossActive = true; b.state = 'idle';
      this.hooks.ui.showHint(`🏖️ → ${TOOLS[b.cageEye].emoji} ${b.kind === 'mimic' ? '🌳?' : ''}`, 3.5);
    }
    if (!this.bossActive) return;
    if (b.shake > 0) b.shake -= dt;
    if (b.state === 'idle') {
      if (b.x <= b.px0) b.paceDir = 1; if (b.x >= b.px1) b.paceDir = -1;
      b.x += b.paceDir * C.paceSpd * dt; b.face = (pcx < b.x + b.w / 2) ? -1 : 1;
      if (b.tel > 0) { b.tel -= dt; if (b.tel <= 0) this.bossThrow(b); }
      else { b.atkT -= dt; if (b.atkT <= 0) { b.tel = C.telegraph; b.atkT = C.atkIntervals[Math.max(0, Math.min(2, b.hp - 1))]; } }
      if (this.player.iframe <= 0 && overlap(this.player, this.bossBox(b))) this.loseLife(false);
    } else if (b.state === 'blind') {
      b.blindT -= dt; if (b.blindT <= 0) b.state = 'idle';
    } else if (b.state === 'caged') {
      b.cageT -= dt;
      if (b.cageT <= 0) {
        bossCageResolve(b);
        if ((b.state as string) === 'defeated') { this.shake(6, .24); this.spawnP(b.x + b.w / 2, b.ground - b.h / 2, 30, 0xc2a6ff, 200, 1.2); }
        else { sfx('bosshurt'); this.spawnP(b.x + b.w / 2, b.ground - b.h / 2, 18, b.finisher === 'shrink' ? 0xb07ad8 : 0x5fc77f, 160, .8); }
      }
    } else if (b.state === 'defeated') {
      b.defT -= dt; if (b.defT <= 0) this.completeLevel();
    }
    for (let i = this.bossShots.length - 1; i >= 0; i--) {
      const s = this.bossShots[i];
      s.vy += C.shotGrav * dt; s.x += s.vx * dt; s.y += s.vy * dt;
      if (this.player.iframe <= 0 && overlap(this.player, { x: s.x - C.shotRadius, y: s.y - C.shotRadius, w: C.shotRadius * 2, h: C.shotRadius * 2 })) {
        this.loseLife(false); this.spawnP(s.x, s.y, 10, 0xc9b3d6, 150, .5); this.bossShots.splice(i, 1); continue;
      }
      if (s.y > b.ground + 10 || (this.L.arena && s.x < this.L.arena.wall.x - 40) || s.x > this.L.w) { this.bossShots.splice(i, 1); }
    }
  }
  private bossThrow(b: BossData): void {
    const C = CONFIG.boss;
    const sx = b.x + b.w / 2 + b.face * 34, sy = b.ground - b.h + 28;
    const dir = Math.sign((this.player.x + this.player.w / 2) - sx) || -1;
    this.bossShots.push({ x: sx, y: sy, vx: dir * C.shotVx, vy: C.shotVy });
    this.spawnP(sx, sy, 5, 0xb9a0c4, 120, .3);
  }

  /* ---------- lives / flow ---------- */
  private loseLife(doRespawn: boolean): void {
    if (this.player.iframe > 0 && !doRespawn) return;
    this.hearts--; this.assist.deaths++;
    this.flash(240, 255, 80, 90); sfx('hurt'); this.shake(3, .15);
    this.spawnP(this.player.x + this.player.w / 2, this.player.y + this.player.h / 2, 14, 0xff8aa6, 200, .7);
    this.hooks.ui.setHearts(Math.max(0, this.hearts), CONFIG.hearts);
    if (this.hearts <= 0) { this.hearts = 0; this.ended = true; sfx('sad'); this.hooks.onGameOver(); return; }
    const af = assistFactors(this.assist);
    if (doRespawn) { this.player.x = this.respawn.x; this.player.y = this.respawn.y; this.player.vx = 0; this.player.vy = 0; this.player.iframe = .6 + af.iframeBonus; }
    else { this.player.iframe = CONFIG.player.IFRAME + af.iframeBonus; this.player.vy = -340; this.player.vx = -this.player.face * 260; }
  }
  private gainHeart(): void {
    if (this.hearts < CONFIG.hearts) { this.hearts++; sfx('ding'); this.hooks.ui.setHearts(this.hearts, CONFIG.hearts); }
  }
  private completeLevel(): void {
    if (this.ended) return;
    this.ended = true; sfx(this.idx + 1 >= LEVELS.length ? 'win' : 'clear');
    this.hooks.onLevelComplete(this.idx, this.L.name, this.idx + 1 >= LEVELS.length);
  }

  /* ---------- main update (v1 order preserved) ---------- */
  update(_time: number, deltaMs: number): void {
    const dt = Math.min(deltaMs / 1000, 1 / 30);
    if (this.modal || this.ended) { this.draw(); return; }
    this.t += dt;
    if (this.updateMeadowRestoration(dt)) return;
    for (const it of this.L.interact) {
      const a = it as any;
      if (it.done && typeof a.animT === 'number' && a.animT < 1) a.animT = Math.min(1, a.animT + dt * 1.9);
    }
    const p = this.player, i = this.input2;
    const af = assistFactors(this.assist);
    const dir = (i.right ? 1 : 0) - (i.left ? 1 : 0);
    if (dir !== 0) { p.vx += dir * ACCEL * dt; p.face = dir; }
    else { const s = Math.sign(p.vx); p.vx -= s * FRICTION * dt; if (Math.sign(p.vx) !== s) p.vx = 0; }
    p.vx = Math.max(-MOVE, Math.min(MOVE, p.vx));
    if (i.jumpEdge) { p.jbuf = JBUF; i.jumpEdge = false; } else p.jbuf = Math.max(0, p.jbuf - dt);
    p.coyote = p.grounded ? COYOTE : Math.max(0, p.coyote - dt);
    if (p.jbuf > 0 && p.coyote > 0) {
      p.vy = -JUMP_V; p.grounded = false; p.coyote = 0; p.jbuf = 0; p.squash = 1.3; p.squashVel = 0;
      sfx('jump'); this.spawnP(p.x + p.w / 2, p.y + p.h, 6, 0xeafff2, 120, .4);
    }
    if (!i.jumpHeld && p.vy < -JUMP_CUT) p.vy = -JUMP_CUT;
    p.vy = Math.min(MAX_FALL, p.vy + GRAV * dt);
    this.equipped = this.computeEquip();
    this.hooks.ui.setPower(this.equipped);
    if (i.useEdge) { this.doUse(); i.useEdge = false; }
    if (i.sandEdge) { this.throwSand(); i.sandEdge = false; }
    p.x += p.vx * dt;
    for (const s of this.solids()) if (overlap(p, s)) { if (p.vx > 0) p.x = s.x - p.w; else if (p.vx < 0) p.x = s.x + s.w; p.vx = 0; }
    p.x = Math.max(0, Math.min(this.L.w - p.w, p.x));
    const wasG = p.grounded; p.grounded = false; p.y += p.vy * dt;
    for (const s of this.solids()) {
      if (!overlap(p, s)) continue;
      if (p.vy > 0) {
        p.y = s.y - p.h;
        if ((s as any).bounce) { p.vy = -BOUNCE; p.squash = 1.4; p.squashVel = 0; sfx('boing'); this.shake(3, .12); this.spawnP(p.x + p.w / 2, p.y + p.h, 8, 0xd9b0f0, 170, .5); }
        else {
          p.grounded = true;
          if (!wasG && p.vy > 300) { const fall = Math.min(1, p.vy / MAX_FALL); p.squash = .72 - fall * .1; p.squashVel = 0; sfx('land', fall); this.shake(1 + fall * 4, .08 + fall * .08); this.spawnP(p.x + p.w / 2, p.y + p.h, 5 + Math.round(fall * 4), 0xeafff2, 100 + fall * 60, .35); }
          p.vy = 0;
        }
      } else if (p.vy < 0) { p.y = s.y + s.h; p.vy = 0; }
    }
    { const K = CONFIG.juice.squashK, D = CONFIG.juice.squashDamp; p.squashVel += (1 - p.squash) * K * dt; p.squashVel *= Math.max(0, 1 - D * dt); p.squash += p.squashVel * dt; }
    const pcx = p.x + p.w / 2, pFeet = p.y + p.h;
    if (this.idx === 0 && pcx > 2280 && !this.meadowStory.helper && this.meadowStory.gateStep === 0) {
      this.meadowStory.gateStep = -1; this.hooks.ui.showHint(S('meadow.friendRequired'), 5);
    }
    /* heal target + near tree */
    this.healTarget = null;
    if (this.L.hasHeal && i.healHeld) {
      let bd = 1e9;
      for (const m of this.monsters) {
        if (m.state !== 'blind') continue;
        const b = this.mbox(m);
        if (p.x < b.x + b.w + CONFIG.heal.range && p.x + p.w > b.x - CONFIG.heal.range && Math.abs(pFeet - m.ground) < CONFIG.heal.vRange) {
          const d = Math.abs(pcx - (m.x + (m as any).w / 2)); if (d < bd) { bd = d; this.healTarget = m; }
        }
      }
    }
    this.nearTree = null;
    if (this.L.trees) {
      let bd = 1e9;
      for (const tr of this.L.trees) {
        if (tr.awake) continue;
        const d = Math.hypot(pcx - tr.x, pFeet - tr.y);
        if (d < CONFIG.tree.wakeRadius && d < bd) { bd = d; this.nearTree = tr; }
      }
    }
    /* monsters */
    for (const m of this.monsters) {
      if (empathyTick(m, dt, m === this.healTarget)) {
        setMusicMood('healing');
        this.gainHeart(); this.spawnP(m.x + 20, m.ground - 40, 26, 0xffe6a0, 200, 1); sfx('heal'); this.shake(2, .12);
        if (this.idx === 0 && !this.meadowStory.helper) {
          this.meadowStory.helper = m; sfx('streak');
          this.hooks.ui.showHint(S('meadow.helper'), 3.2);
        }
      }
      if (m.state === 'happy') {
        if (this.idx === 0 && m === this.meadowStory.helper) {
          const guardianPlateX = 2420, friendPlateX = 2518;
          const atGuardianPlate = Math.abs(pcx - guardianPlateX) < 40 && Math.abs(pFeet - 352) < 26;
          const nearGate = pcx > 2280;
          if (nearGate && this.meadowStory.gateStep === 0) {
            this.meadowStory.gateStep = 1;
            this.hooks.ui.showHint(S('meadow.gateApproach'), 4.2);
          }
          if (atGuardianPlate && this.meadowStory.gateStep < 2) {
            this.meadowStory.gateStep = 2;
            this.hooks.ui.showHint(S('meadow.gateFriend'), 3.4);
          }
          /* The companion keeps pace on the journey, then deliberately settles
             on its own visible stone once the Guardian reaches theirs. */
          const targetX = atGuardianPlate ? friendPlateX : nearGate ? guardianPlateX + 66 : p.x - p.face * 58;
          const delta = targetX - m.x;
          (m as any).face = Math.sign(delta) || (m as any).face;
          /* A catch-up burst avoids a child waiting in front of an understood
             puzzle while a friend walks across the whole meadow. */
          const togetherSpeed = nearGate ? 210 : CONFIG.monster.happy * 1.25;
          m.x += Math.sign(delta) * Math.min(Math.abs(delta), togetherSpeed * dt);
          m.ground = p.x > 2080 ? 352 : p.x > 1550 ? 360 : 370;
          if (!this.meadowStory.pressureAwake && atGuardianPlate && Math.abs(m.x - friendPlateX) < 8) {
            this.meadowStory.pressureAwake = true;
            this.meadowStory.gateStep = 3;
            this.spawnP(2655, 275, 42, 0x8fe3a8, 210, 1.4); sfx('grow'); this.shake(3, .25);
            this.hooks.ui.showHint(S('meadow.gate'), 3.6);
            if (!this.meadowStory.oakGuided) {
              this.meadowStory.oakGuided = true;
              this.hooks.ui.showHint(S('meadow.oakPath'), 4.4);
            }
          }
        } else {
          if (m.x <= m.gx0) (m as any).dir = 1; if (m.x >= m.gx1) (m as any).dir = -1;
          m.x += ((m as any).dir || 1) * CONFIG.monster.happy * dt;
        }
        continue;
      }
      if (m.state === 'blind') continue;
      const md = m as any;
      if (md.flip) { md.flipT = (md.flipT ?? 0) - dt; if (md.flipT <= 0) { md.dir = -(md.dir || 1); md.flipT = CONFIG.monster.flipMin + Math.random() * CONFIG.monster.flipRand; } }
      const d = pcx - (m.x + md.w / 2);
      const spd = (m.spd ?? CONFIG.monster.chase) * af.monsterSpd;
      if (Math.abs(d) < (m.aggro ?? CONFIG.monster.aggro) && Math.abs(pFeet - m.ground) < 70) { md.vx = Math.sign(d) * spd; md.face = Math.sign(d) || md.face; }
      else { if (m.x <= m.gx0) md.dir = 1; if (m.x >= m.gx1) md.dir = -1; md.vx = (md.dir || -1) * (m.patrolSpd ?? CONFIG.monster.patrol) * af.monsterSpd; md.face = md.dir; }
      m.x += md.vx * dt; m.x = Math.max(m.lo, Math.min(m.hi - md.w, m.x));
      if (p.iframe <= 0 && overlap(p, this.mbox(m))) this.loseLife(false);
    }
    /* sands */
    for (let si = this.sands.length - 1; si >= 0; si--) {
      const s = this.sands[si];
      s.life -= dt; s.vy += CONFIG.sand.grav * dt; s.x += s.vx * dt; s.y += s.vy * dt;
      let hit = false;
      for (const m of this.monsters) {
        if (m.state === 'happy') continue;
        const b = this.mbox(m);
        if (s.x > b.x && s.x < b.x + b.w && s.y > b.y && s.y < b.y + b.h) {
          sandHit(m); m.blindT += af.blindBonus;
          sfx('puff'); this.shake(2, .1); this.spawnP(s.x, s.y, 16, 0xe8c27a, 180, .6); hit = true; break;
        }
      }
      const b = this.L.boss;
      if (!hit && b && this.bossActive && b.state === 'idle') {
        const bb = this.bossBox(b);
        if (s.x > bb.x && s.x < bb.x + bb.w && s.y > bb.y && s.y < bb.y + bb.h) {
          bossSandHit(b); b.shake = .3; sfx('thud'); this.shake(4, .16);
          this.spawnP(s.x, s.y, 18, 0xe8c27a, 200, .7);
          this.hooks.ui.showHint(`${TOOLS[b.cageEye].emoji} ✨`, CONFIG.heal.BOSS_BLIND);
          hit = true;
        }
      }
      if (hit || s.life <= 0 || s.y > this.L.deathY) this.sands.splice(si, 1);
    }
    this.updateBoss(dt, pcx);
    /* checkpoints refill sand */
    for (const cp of this.L.checkpoints) {
      if (pcx > cp.x && this.respawn.x < cp.x) {
        this.respawn = { x: cp.x, y: cp.y - p.h - 2 };
        this.spawnP(cp.x, cp.y - 30, 12, 0x9fe6c4, 120, .7);
        if (this.sandLeft < this.sandMax) { this.sandLeft = this.sandMax; this.hooks.ui.setSand(this.sandLeft); }
      }
    }
    if (p.y > this.L.deathY) { if (this.L.gentle) { p.x = this.respawn.x; p.y = this.respawn.y; p.vx = 0; p.vy = 0; p.iframe = .6; } else this.loseLife(true); }
    if (this.L.goal) {
      const dx = pcx - this.L.goal.x, dy = (p.y + p.h / 2) - this.L.goal.y;
      if (Math.hypot(dx, dy) < this.L.goal.r + 18) this.completeLevel();
    }
    if (p.iframe > 0) p.iframe -= dt;
    this.updateObjective();
    this.updateRecovery(dt);
    p.blinkT -= dt; if (p.blinkT <= 0) { p.blink = .12; p.blinkT = 1.8 + Math.random() * 2.6; } if (p.blink > 0) p.blink -= dt;
    for (let pi = this.particles.length - 1; pi >= 0; pi--) {
      const pt = this.particles[pi]; pt.life -= dt;
      if (pt.life <= 0) { this.particles.splice(pi, 1); continue; }
      pt.vy += 380 * dt; pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.alpha = pt.life / pt.max;
    }
    /* intros → hint bar */
    this.L.intros.forEach((intro, ii) => {
      if (!this.introSeen.has(ii) && Math.abs(pcx - intro.x) < 40) {
        this.introSeen.add(ii);
        this.hooks.ui.showHint(this.idx === 0 ? S(`meadow.intro.${ii}`) : intro.text, 2.6);
      }
    });
    /* sand throw */
    const target = Math.max(0, Math.min(this.L.w - W, pcx - W / 2));
    this.cam += (target - this.cam) * Math.min(1, dt * CONFIG.camera.lerp);
    this.cameras.main.setScroll(this.cam, 0);
    this.draw();
  }
  private throwSand(): void {
    if (!this.L.hasSand) return;
    if (this.sandLeft <= 0) { this.hooks.ui.showHint('🏖️ ⏳ 🚩', 1.8); return; }
    this.sandLeft--; this.hooks.ui.setSand(this.sandLeft); sfx('sand');
    const p = this.player;
    this.sands.push({ x: p.x + p.w / 2 + p.face * 12, y: p.y + 12, vx: p.face * CONFIG.sand.SPD, vy: CONFIG.sand.vy0, life: CONFIG.sand.life });
    this.spawnP(p.x + p.w / 2 + p.face * 12, p.y + 12, 6, 0xe8c27a, 120, .3);
  }

  /* ---------- render (immediate-mode port, biome-tinted) ---------- */
  private col(hex: string): number { return hexToNum(hex); }
  private draw(): void {
    const B = BIOME[this.L.biome || 'meadow'] || BIOME.meadow;
    const g = this.gfx, bg = this.bgGfx, foreground = this.foregroundGfx;
    const meadowFar = this.L.biome === 'meadow' ? art('meadow.far') : null;
    const meadowMidground = this.L.biome === 'meadow' ? art('meadow.midground') : null;
    const meadowForeground = this.L.biome === 'meadow' ? {
      left: art('meadow.foreground.left'),
      middle: art('meadow.foreground.middle'),
      right: art('meadow.foreground.right'),
    } : null;
    const meadowSoil = this.L.biome === 'meadow' ? art('meadow.soil') : null;
    const meadowGrass = this.L.biome === 'meadow' ? art('meadow.grass') : null;
    /* sky + parallax — authored plates first, then the procedural scenery
       profile. The profile is a full biome identity (sun, haze, cloud bands,
       noise-silhouette ridges), not the two rows of ellipses it replaces. */
    const S9 = sceneryFor(this.L.biome);
    bg.clear();
    if (meadowFar) {
      bg.drawImage(meadowFar, 0, 0, W, H);
    } else {
      drawSky(bg, S9, B, this.cam, W, H, this.t);
      drawRidges(bg, S9, this.cam, W, H);
    }
    if (this.L.biome === 'meadow') drawMeadowMidground(bg, meadowMidground, this.cam, B, W, H);
    g.clear();
    foreground.clear();
    /* water */
    if (this.L.water) {
      const wt = this.L.water;
      g.fillStyle(0x3fa9f5, .55); g.fillRect(wt.x, wt.top, wt.w, H - wt.top);
      g.fillStyle(0xffffff, .3);
      for (let k = 0; k < 4; k++) g.fillRect(wt.x + 20 + k * 70 + Math.sin(this.t * 2 + k) * 8, wt.top + 4, 34, 3);
    }
    /* platforms */
    for (const pl of this.L.platforms) {
      if (meadowSoil && meadowGrass) {
        g.fillImagePattern(meadowSoil, pl.x, pl.y, pl.w, pl.h, 128, 128);
        g.fillStyle(this.col(B.soilDark), .16);
        g.fillRect(pl.x, pl.y + 24, pl.w, Math.max(0, pl.h - 24));
        g.drawTiledX(meadowGrass, pl.x, pl.y - 14, pl.w, 38, 202);
      } else {
        drawPlatformSurface(g, S9.surface, B, pl.x, pl.y, pl.w, pl.h);
        drawGroundCover(g, S9.cover, B, pl.x, pl.y, pl.w, this.t, S9.rim);
      }
    }
    /* checkpoints: flags */
    for (const cp of this.L.checkpoints) {
      const passed = this.respawn.x >= cp.x;
      g.lineStyle(4, 0x7a5a33); g.beginPath(); g.moveTo(cp.x, cp.y); g.lineTo(cp.x, cp.y - 54); g.strokePath();
      g.fillStyle(passed ? 0x5fc77f : 0xd8cdbf, 1);
      g.fillTriangle(cp.x, cp.y - 54, cp.x, cp.y - 34, cp.x + 26, cp.y - 44);
    }
    /* interacts */
    for (const it of this.L.interact) this.drawInteract(g, it);
    if (this.idx === 0) this.drawMeadowStory(g);
    /* trees */
    for (const tr of this.L.trees) {
      if (this.idx === 0 && tr.finale) this.drawAncientOak(g, tr as any);
      else this.drawTree(g, tr as any);
    }
    /* goal */
    if (this.L.goal) {
      const go = this.L.goal, pu = 1 + Math.sin(this.t * 3) * .1;
      g.fillStyle(0xffd54a, .35); g.fillCircle(go.x, go.y, go.r * 1.5 * pu);
      g.fillStyle(0xffd54a, 1); g.fillCircle(go.x, go.y, go.r * .55);
      g.fillStyle(0xffffff, .9); g.fillCircle(go.x - go.r * .15, go.y - go.r * .18, go.r * .16);
    }
    /* monsters */
    for (const m of this.monsters) this.drawMonster(g, m);
    /* boss */
    if (this.L.boss && this.bossActive) this.drawBoss(g, this.L.boss);
    for (const s of this.bossShots) { g.fillStyle(0xb58cf0, 1); g.fillCircle(s.x, s.y, CONFIG.boss.shotRadius); }
    /* sand */
    for (const s of this.sands) { g.fillStyle(0xe8c27a, 1); g.fillCircle(s.x, s.y, 6); }
    /* heal beam */
    if (this.healTarget) {
      const m = this.healTarget, md = m as any;
      g.lineStyle(3, 0xffd54a, .8);
      g.beginPath(); g.moveTo(this.player.x + this.player.w / 2, this.player.y + 10);
      g.lineTo(m.x + md.w / 2, m.ground - md.h / 2); g.strokePath();
      g.fillStyle(0xffe6a0, .6); g.fillCircle(m.x + md.w / 2, m.ground - md.h - 12, 8 + Math.sin(this.t * 8) * 3);
    }
    /* player */
    this.drawPlayer(g);
    /* particles */
    for (const pt of this.particles) { g.fillStyle(pt.col, pt.alpha); g.fillCircle(pt.x, pt.y, pt.r); }
    /* Ambient motes sit in front of gameplay but behind the fringe, so the
       biome's air reads as depth rather than as UI. */
    drawAmbient(foreground, S9, B, this.cam, W, H, this.t, this.reducedMotion);
    if (meadowForeground) drawMeadowForeground(foreground, meadowForeground, this.cam, this.L.w, B, W, H);
    else drawFringe(foreground, S9.fringe, this.cam, this.L.w, W, H, this.t);
    if (this.meadowStory.restoring > 0) {
      const rp = Math.min(1, this.meadowStory.restoring / 2.5);
      foreground.fillStyle(0xffedb0, Math.sin(rp * Math.PI) * .18);
      foreground.fillRect(0, 0, W, H);
      foreground.fillStyle(0xfff4c7, .14 + rp * .12);
      for (let k = 0; k < 24; k++) {
        const mx = (k * 193 + this.t * (10 + k % 3)) % (W + 80) - 40;
        const my = H - ((k * 71 + this.t * (34 + k % 5)) % (H + 60));
        foreground.fillCircle(mx, my, 1.5 + (k % 3));
      }
    }
    /* darkness (cave-like biomes) */
    this.darkGfx.clear();
    if (B.dark) {
      this.darkGfx.fillStyle(0x0a0718, .62);
      this.darkGfx.fillRect(0, 0, W, H);
      this.darkGfx.setBlendMode(BLEND.ERASE);
      /* soft-edged punches (alpha ramp → feathered lantern glow, not a hard spotlight) */
      const GLOW: [number, number][] = [[0, 1], [.6, .88], [1, 0]];
      const px = this.player.x + this.player.w / 2 - this.cam, py = this.player.y + this.player.h / 2;
      this.darkGfx.fillStyle(0xffffff, 1); this.darkGfx.fillRadial(px, py, 150, GLOW);
      for (const it of this.L.interact) {
        if (it.type === 'torch' && it.done) this.darkGfx.fillRadial((it as any).x - this.cam, (it as any).y - 60, 165, GLOW);
      }
      this.darkGfx.setBlendMode(BLEND.NORMAL);
    }
  }
  private drawPlayer(g: Graphics): void {
    const p = this.player;
    const sq = Math.max(.5, Math.min(1.5, p.squash));
    const w = p.w / sq, h = p.h * sq;
    const x = p.x + p.w / 2 - w / 2, y = p.y + p.h - h;
    const flick = p.iframe > 0 && Math.floor(this.t * 14) % 2 === 0;
    if (flick) return;
    const guardian = art('character.guardian');
    if (guardian) {
      const gh = h * 1.42, gw = gh * (512 / 609);
      const gx = p.x + p.w / 2 - gw / 2, gy = p.y + p.h - gh;
      g.fillStyle(0x143a33, .18); g.fillEllipse(p.x + p.w / 2, p.y + p.h + 2, w * 1.05, 8);
      if (p.face < 0) g.drawImageFlipX(guardian, gx, gy, gw, gh);
      else g.drawImage(guardian, gx, gy, gw, gh);
      return;
    }
    const rad = Math.max(4, Math.min(10, w / 2, h / 2));
    /* ground shadow — anchors the Guardian so it never reads as a floating blob */
    g.fillStyle(0x143a33, .18); g.fillEllipse(p.x + p.w / 2, p.y + p.h + 2, w * .9, 8);
    /* body: saturated purple + dark outline so it stays visible on light (peaks/coast) biomes */
    g.fillStyle(0x7a52c8, 1); g.fillRoundedRect(x, y, w, h, rad);
    g.lineStyle(2.5, 0x3a2470, 1); g.strokeRoundedRect(x, y, w, h, rad);
    /* head sheen — radius capped so it never exceeds half its own height */
    const hh = h * .4, hr = Math.max(3, Math.min(7, hh / 2, (w - 8) / 2));
    g.fillStyle(0x9a78e0, 1); g.fillRoundedRect(x + 4, y + 3, w - 8, hh, hr);
    /* five eyes */
    const eyes: [number, number][] = [[.22, .3], [.4, .22], [.5, .34], [.6, .22], [.78, .3]];
    const blink = p.blink > 0;
    eyes.forEach(([ex, ey], k) => {
      const exx = x + w * ex, eyy = y + h * ey;
      if (blink) { g.lineStyle(2, 0x2a1a4a); g.beginPath(); g.moveTo(exx - 3, eyy); g.lineTo(exx + 3, eyy); g.strokePath(); }
      else {
        g.fillStyle(0x2a1a4a, 1); g.fillCircle(exx, eyy, 5); /* dark ring keeps eyes visible on white */
        g.fillStyle(0xffffff, 1); g.fillCircle(exx, eyy, 4);
        const eyeCols = [0x3fa9f5, 0xff6b4a, 0x54c97a, 0xffcc3a, 0xb07ad8];
        g.fillStyle(eyeCols[k], 1); g.fillCircle(exx + p.face * 1.4, eyy, 2.4);
      }
    });
    g.fillStyle(0xffb3c8, 1); g.fillRoundedRect(x + w * .38, y + h * .62, w * .24, 5, 3);
  }
  private drawMeadowStory(g: Graphics): void {
    const story = this.meadowStory, open = story.pressureAwake;
    const guardianPlateX = 2420, friendPlateX = 2538;
    const pcx = this.player.x + this.player.w / 2, pFeet = this.player.y + this.player.h;
    const guardianOn = Math.abs(pcx - guardianPlateX) < 40 && Math.abs(pFeet - 352) < 26;
    const friendOn = !!story.helper && Math.abs(story.helper.x - 2518) < 8;
    const pulse = .55 + Math.sin(this.t * 4) * .22;
    const heart = (x: number, y: number, col: number, alpha = 1) => {
      g.fillStyle(col, alpha); g.fillCircle(x - 4, y - 2, 4); g.fillCircle(x + 4, y - 2, 4);
      g.fillTriangle(x - 8, y - 1, x + 8, y - 1, x, y + 9);
    };
    const plate = (x: number, active: boolean, companion: boolean) => {
      const lit = active || open;
      g.fillStyle(lit ? 0xffdc78 : 0x718a7d, lit ? .18 + pulse * .18 : .12); g.fillCircle(x, 341, lit ? 34 + pulse * 6 : 28);
      g.fillStyle(0x173e35, .24); g.fillEllipse(x, 354, 76, 14);
      g.fillStyle(lit ? 0x9fe6b3 : 0x9caea5, 1); g.fillRoundedRect(x - 33, 344 + (lit ? 5 : 0), 66, 10, 5);
      heart(x, 349 + (lit ? 5 : 0), lit ? 0xffdc78 : 0xd6d8c8);
      if (companion) { g.fillStyle(lit ? 0x5fc77f : 0x526f69, 1); g.fillCircle(x, 328, 7); }
      else { g.fillStyle(lit ? 0x7a52c8 : 0x526f69, 1); g.fillTriangle(x, 320, x - 7, 332, x + 7, 332); }
    };
    plate(guardianPlateX, guardianOn, false);
    plate(friendPlateX, friendOn, true);
    /* Once the pair reaches the gate, the two stones pulse together until the
       child stands on theirs—no reading or timing guess is required. */
    if (!open && story.helper && pcx > 2280 && !guardianOn) {
      g.fillStyle(0xffe69b, .45 + pulse * .3);
      g.fillTriangle(guardianPlateX, 300, guardianPlateX - 8, 314, guardianPlateX + 8, 314);
    }
    if (!open && guardianOn && !friendOn) {
      g.fillStyle(0x9fe6b3, .45 + pulse * .3);
      g.fillTriangle(friendPlateX, 300, friendPlateX - 8, 314, friendPlateX + 8, 314);
    }
    g.lineStyle(3, open ? 0x8fcea0 : 0x5a8060, open ? .8 : .46);
    g.beginPath(); g.moveTo(guardianPlateX + 33, 349); g.lineTo(2646, 349); g.strokePath();
    if (!open) {
      g.fillStyle(0x496f51, 1);
      for (let k = 0; k < 5; k++) {
        const xx = 2640 + k * 7;
        g.fillRoundedRect(xx, 188 + (k % 2) * 12, 7, 164 - (k % 2) * 12, 4);
      }
      g.fillStyle(0x6d9b61, 1);
      for (let k = 0; k < 6; k++) g.fillEllipse(2640 + (k % 3) * 14, 212 + k * 23, 22, 11);
    } else {
      g.fillStyle(0x79c995, .75);
      for (let k = 0; k < 7; k++) g.fillEllipse(2634 + k * 9, 344 + Math.sin(k) * 3, 20, 9);
      /* The open gate points toward the last tree with a physical, musical
         breadcrumb trail rather than a disappearing sentence. */
      for (let k = 0; k < 8; k++) {
        const x = 2700 + k * 38, y = 334 - Math.sin(this.t * 2 + k) * 6;
        g.fillStyle(k % 2 ? 0xffe49a : 0x9fe6b3, .45 + pulse * .25); g.fillCircle(x, y, 3.5);
      }
      g.fillStyle(0xffe49a, .42 + pulse * .22); g.fillTriangle(2960, 316, 2948, 330, 2960, 344);
    }
  }
  private drawAncientOak(g: Graphics, tr: { id: string; x: number; y: number; awake?: boolean }): void {
    const x = tr.x, y = tr.y, awake = !!tr.awake;
    const dormant = art('meadow.ancientOak.dormant'), awakened = art('meadow.ancientOak.awake');
    if (dormant && awakened) {
      const raw = this.meadowStory.restoring > 0 ? Math.min(1, this.meadowStory.restoring / 2.45) : 0;
      const reveal = raw * raw * (3 - 2 * raw);
      const size = 306, left = x - size / 2, top = y - size;
      g.fillStyle(0x173e35, .22); g.fillEllipse(x, y + 4, 192, 18);
      if (reveal > 0) {
        g.fillStyle(0xffe49a, .12 + reveal * .18); g.fillCircle(x, y - size * .49, size * (.33 + reveal * .12));
      }
      g.drawImage(dormant, left, top, size, size, 1 - reveal);
      if (reveal > 0) g.drawImage(awakened, left, top, size, size, reveal);
      if (!awake && this.nearTree === tr) {
        const pu = 1 + Math.sin(this.t * 3) * .08;
        g.fillStyle(0xffe69b, .2); g.fillCircle(x, y - 132, 48 * pu);
        g.fillStyle(0xfff4c7, .95); g.fillCircle(x, y - 132, 7);
      }
      return;
    }
    const pulse = awake ? 1 + Math.sin(this.t * 1.7) * .025 : 1;
    g.fillStyle(0x173e35, .2); g.fillEllipse(x, y + 4, 164, 20);
    /* Root flare and split trunk make the finale read as the same oak as the menu. */
    g.fillStyle(awake ? 0x765438 : 0x666763, 1);
    g.fillTriangle(x - 58, y + 4, x - 22, y - 112, x + 2, y + 4);
    g.fillTriangle(x + 58, y + 4, x + 22, y - 112, x - 2, y + 4);
    g.fillRoundedRect(x - 26, y - 122, 52, 126, 18);
    g.lineStyle(4, awake ? 0xd99b5b : 0x8b8b82, awake ? .78 : .38);
    g.beginPath(); g.moveTo(x, y - 22); g.lineTo(x - 9, y - 53); g.lineTo(x, y - 73); g.lineTo(x + 9, y - 53); g.lineTo(x, y - 22); g.strokePath();
    const leaf1 = awake ? 0x4f9f69 : 0x788783, leaf2 = awake ? 0x79c985 : 0x657572;
    g.fillStyle(leaf1, 1);
    g.fillEllipse(x, y - 145, 148 * pulse, 84 * pulse);
    g.fillCircle(x - 62, y - 128, 40 * pulse); g.fillCircle(x + 62, y - 128, 40 * pulse);
    g.fillCircle(x - 36, y - 174, 43 * pulse); g.fillCircle(x + 35, y - 178, 48 * pulse);
    g.fillStyle(leaf2, 1);
    g.fillCircle(x + 7, y - 155, 39 * pulse); g.fillCircle(x - 77, y - 151, 25 * pulse);
    if (awake) {
      g.fillStyle(0xffed9a, .45 + Math.sin(this.t * 3) * .12); g.fillCircle(x, y - 52, 12);
      g.fillStyle(0xfffbeb, 1); g.fillCircle(x - 9, y - 96, 5); g.fillCircle(x + 9, y - 96, 5);
      g.fillStyle(0x243d31, 1); g.fillCircle(x - 9, y - 96, 2); g.fillCircle(x + 9, y - 96, 2);
    } else {
      g.lineStyle(3, 0x444a47, .8);
      g.beginPath(); g.moveTo(x - 16, y - 96); g.lineTo(x - 5, y - 94); g.moveTo(x + 5, y - 94); g.lineTo(x + 16, y - 96); g.strokePath();
      if (this.nearTree === tr) {
        g.fillStyle(0xffe69b, .26 + Math.sin(this.t * 2.2) * .07); g.fillCircle(x, y - 75, 76);
        g.fillStyle(0xfff4c7, .9); g.fillCircle(x, y - 137, 7);
      }
    }
  }
  private drawMonster(g: Graphics, m: MonsterRuntime): void {
    const md = m as any;
    const species = speciesFor(this.L.biome, md.species);
    const healProgress = m === this.healTarget && m.healT > 0
      ? m.healT / CONFIG.heal.HEAL_TIME : 0;
    /* Only the Meadow's Mossling has a painted sprite. Every other biome draws
       its own silhouette — before this, that one Mossling was every creature in
       the game, including in the crystal cave and on the Mediterranean coast. */
    const sprite = species.art ? art(species.art) : null;
    if (!sprite) {
      drawCreature(g, species, {
        x: m.x, ground: m.ground, w: md.w, h: md.h,
        face: md.face || -1, state: m.state, t: this.t, healProgress,
      });
      return;
    }
    const x = m.x, face = md.face || -1;
    const bob = m.state === 'happy' ? Math.sin(this.t * 7 + x) * 2 : 0;
    const mh = md.h * 1.7, mw = mh * .75;
    const mx = x + md.w / 2 - mw / 2, my = m.ground - mh + bob;
    g.fillStyle(0x173e35, .16); g.fillEllipse(x + md.w / 2, m.ground + 2, md.w * .9, 8);
    if (m.state === 'happy') {
      g.fillStyle(0x9fe6a9, .22 + Math.sin(this.t * 4) * .06);
      g.fillCircle(x + md.w / 2, my + mh * .48, mw * .65);
    }
    if (face < 0) g.drawImageFlipX(sprite, mx, my, mw, mh, m.state === 'blind' ? .82 : 1);
    else g.drawImage(sprite, mx, my, mw, mh, m.state === 'blind' ? .82 : 1);
    if (m.state === 'blind') {
      g.fillStyle(0xe8c27a, .95 - healProgress * .35);
      g.fillRoundedRect(x + 1, my + mh * .34, md.w - 2, 8, 4);
    } else if (m.state === 'happy') {
      g.fillStyle(0xffd868, 1); g.fillCircle(x + md.w / 2, my - 5, 4 + Math.sin(this.t * 5) * .5);
    }
    if (healProgress > 0) {
      g.fillStyle(0xffd54a, .9); g.fillRect(x, my - 12, md.w * Math.min(1, healProgress), 5);
      g.lineStyle(1, 0x8a6a1a, .8); g.strokeRect(x, my - 12, md.w, 5);
    }
  }
  private drawBoss(g: Graphics, b: BossData): void {
    const sc = b.scale, w = b.w * sc, h = b.h * sc;
    const wob = b.shake > 0 ? Math.sin(this.t * 40) * 3 : 0;
    const x = b.x + wob, y = b.ground - h;
    /* Each archetype has its own silhouette. Before this, every boss in the
       game — including the last one — was a rounded rectangle with two dots. */
    drawBossCreature(g, b.kind === 'mimic' ? 'mimic' : 'thrower', {
      x, ground: b.ground, w, h, face: b.face, t: this.t, state: b.state,
      calm: 1 - Math.max(0, Math.min(1, b.hp / 3)),
    });
    /* Telegraph ring stays outside the silhouette so it reads on any form. */
    if (b.state === 'idle' && b.tel > 0) {
      g.lineStyle(3, 0xffcc3a, .9);
      g.strokeCircle(x + w / 2, b.ground - h * .6, w * .78);
    }
    if (b.state === 'caged' && b.finisher === 'cage') {
      g.lineStyle(3, 0x5fc77f, .95);
      for (let k = 0; k <= 4; k++) { const cx2 = x - 6 + (k / 4) * (w + 12); g.beginPath(); g.moveTo(cx2, y - 10); g.lineTo(cx2, b.ground + 4); g.strokePath(); }
      g.strokeRect(x - 6, y - 10, w + 12, h + 14);
    }
    if (b.state === 'defeated') { g.fillStyle(0xffe6a0, .8); g.fillCircle(x + w / 2, y + h / 2, w * (.5 + Math.sin(this.t * 6) * .06)); }
    /* Calm meter. This used to be three pink "hp" pips drawn at y-18, which
       landed squarely on the boss's face once bosses had faces — and read as a
       damage bar in a game where nothing is ever damaged. It now sits clear
       above the silhouette and FILLS as the creature calms: gold hearts for
       the calm already given, hollow ones for what is left. */
    const meterY = b.ground - h * 1.45;
    const calmed = 3 - Math.max(0, Math.min(3, b.hp));
    for (let k = 0; k < 3; k++) {
      const mx = x + w / 2 - 22 + k * 22;
      if (k < calmed) {
        g.fillStyle(0xffd76b, 1);
        g.fillCircle(mx - 3.4, meterY - 1.6, 3.4); g.fillCircle(mx + 3.4, meterY - 1.6, 3.4);
        g.fillTriangle(mx - 6.8, meterY - .8, mx + 6.8, meterY - .8, mx, meterY + 7.4);
      } else {
        g.lineStyle(2, 0xfff4c7, .55);
        g.strokeCircle(mx, meterY + 1, 5.5);
      }
    }
  }
  private drawTree(g: Graphics, tr: { id: string; x: number; y: number; awake?: boolean }): void {
    const info = TREES[tr.id]; const crown = info?.crown || 'broad';
    const bob = tr.awake ? Math.sin(this.t * 1.6) * 3 : 0;
    const x = tr.x, y = tr.y + bob;
    if (!tr.awake) { /* beacon */
      const near = this.nearTree === tr;
      const ba = (near ? .34 : .2) + Math.sin(this.t * 2.4) * .06;
      /* Local lantern glow keeps sleeping trees discoverable without a giant
         sky laser that competes with the environment painting. */
      g.fillStyle(0xffe896, ba * .6); g.fillCircle(x, y - 82, near ? 58 : 42);
      g.fillStyle(0xfff3c4, .8);
      for (let k = 0; k < 4; k++) { const ph = (this.t * .35 + k * .25) % 1; g.fillCircle(x + Math.sin(this.t * 1.3 + k * 2.2) * 22, y - 28 - ph * 92, 2.2); }
    }
    const trunkH = crown === 'tall' || crown === 'palm' ? 78 : 62, trunkW = crown === 'tall' ? 18 : 20;
    g.fillStyle(0x173e35, .14); g.fillEllipse(x, y + 3, crown === 'tall' ? 68 : 58, 10);
    g.fillStyle(tr.awake ? (crown === 'tall' ? 0xcdbd90 : 0x7d5a3a) : 0x655c50, 1);
    g.fillTriangle(x - trunkW / 2 - 3, y + 2, x - trunkW / 2, y - trunkH, x + trunkW / 2, y - trunkH);
    g.fillTriangle(x - trunkW / 2 - 3, y + 2, x + trunkW / 2, y - trunkH, x + trunkW / 2 + 3, y + 2);
    /* A visible fork and root flare keep the learning trees organic even when
       their colours are muted asleep. */
    g.lineStyle(7, tr.awake ? 0x806044 : 0x655c50, 1);
    g.beginPath(); g.moveTo(x, y - trunkH + 34); g.lineTo(x - 22, y - trunkH - 4);
    g.moveTo(x + 1, y - trunkH + 27); g.lineTo(x + 24, y - trunkH - 12); g.strokePath();
    g.fillStyle(tr.awake ? 0x806044 : 0x655c50, 1);
    g.fillTriangle(x - 22, y + 2, x - 4, y - 22, x - 2, y + 2);
    g.fillTriangle(x + 22, y + 2, x + 4, y - 24, x + 2, y + 2);
    const cols = LEAF_COLOR[tr.id] || ['#63c49b', '#4fae87'];
    const leafA = tr.awake ? this.col(cols[0]) : 0x718b82;
    const leafB = tr.awake ? this.col(cols[1]) : 0x526f69;
    if (crown === 'tall') {
      g.fillStyle(leafB, 1); g.fillEllipse(x, y - trunkH - 24, 78, 58);
      g.fillCircle(x - 29, y - trunkH - 17, 22); g.fillCircle(x + 31, y - trunkH - 22, 25);
      g.fillStyle(leafA, 1); g.fillCircle(x - 20, y - trunkH - 39, 26); g.fillCircle(x + 16, y - trunkH - 47, 29);
      g.fillCircle(x - 2, y - trunkH - 68, 25); g.fillCircle(x + 34, y - trunkH - 49, 18);
      g.fillStyle(tr.awake ? 0xb7df83 : 0x81958f, .65);
      g.fillCircle(x - 25, y - trunkH - 49, 8); g.fillCircle(x + 8, y - trunkH - 69, 7); g.fillCircle(x + 31, y - trunkH - 35, 6);
    } else if (crown === 'oval') {
      g.fillStyle(leafB, 1); g.fillEllipse(x, y - trunkH - 28, 72, 88);
      g.fillEllipse(x - 27, y - trunkH - 19, 34, 58); g.fillEllipse(x + 27, y - trunkH - 23, 35, 62);
      g.fillStyle(leafA, 1); g.fillEllipse(x - 13, y - trunkH - 49, 39, 55);
      g.fillEllipse(x + 15, y - trunkH - 53, 41, 60); g.fillEllipse(x, y - trunkH - 76, 34, 43);
      g.fillStyle(tr.awake ? 0xc9efb0 : 0x81958f, .58);
      g.fillCircle(x - 19, y - trunkH - 61, 7); g.fillCircle(x + 11, y - trunkH - 77, 6); g.fillCircle(x + 28, y - trunkH - 43, 6);
    } else if (crown === 'conifer') {
      g.fillStyle(leafA, 1);
      g.fillTriangle(x - 30, y - trunkH + 6, x + 30, y - trunkH + 6, x, y - trunkH - 34);
      g.fillTriangle(x - 24, y - trunkH - 22, x + 24, y - trunkH - 22, x, y - trunkH - 56);
      g.fillStyle(leafB, 1); g.fillTriangle(x - 16, y - trunkH - 46, x + 16, y - trunkH - 46, x, y - trunkH - 72);
    } else if (crown === 'weeping') {
      g.fillStyle(leafA, 1); g.fillEllipse(x, y - trunkH - 16, 70, 54);
      g.fillStyle(leafB, 1);
      for (let k = -2; k <= 2; k++) g.fillEllipse(x + k * 14, y - trunkH + 8, 8, 40);
    } else if (crown === 'palm') {
      g.fillStyle(leafA, 1);
      for (let k = 0; k < 6; k++) { const a = Math.PI + (k / 5) * Math.PI; g.fillEllipse(x + Math.cos(a) * 26, y - trunkH - 10 + Math.sin(a) * 12, 42, 12); }
      g.fillStyle(leafB, 1); g.fillCircle(x, y - trunkH - 8, 8);
    } else { /* broad */
      g.fillStyle(leafA, 1); g.fillCircle(x, y - trunkH - 26, 34); g.fillCircle(x - 22, y - trunkH - 12, 22); g.fillCircle(x + 22, y - trunkH - 12, 22);
      g.fillStyle(leafB, 1); g.fillCircle(x + 12, y - trunkH - 30, 14);
    }
    if (tr.awake) { /* open eyes */
      g.fillStyle(0xffffff, 1); g.fillCircle(x - 7, y - trunkH - 24, 4); g.fillCircle(x + 7, y - trunkH - 24, 4);
      g.fillStyle(0x2a3a30, 1); g.fillCircle(x - 7, y - trunkH - 24, 1.8); g.fillCircle(x + 7, y - trunkH - 24, 1.8);
    } else if (this.nearTree === tr) {
      g.fillStyle(0xfff7ec, .95); g.fillRoundedRect(x - 14, y - trunkH - 76, 28, 22, 6);
      g.fillStyle(0xffd54a, 1); g.fillCircle(x, y - trunkH - 65, 6);
    }
  }
  private drawInteract(g: Graphics, it: Interact): void {
    const a = it as any;
    const raw = it.done ? Math.max(0, Math.min(1, a.animT ?? 1)) : 0;
    const reveal = raw * raw * (3 - 2 * raw);
    const eyeMark = (ex: number, ey: number, eye: Eye) => {
      const pu = 1 + Math.sin(this.t * 4) * .12;
      g.fillStyle(this.col(TOOLS[eye].col), .28); g.fillCircle(ex, ey, 16 * pu);
      g.fillStyle(this.col(TOOLS[eye].col), 1); g.fillCircle(ex, ey, 8);
      g.fillStyle(0xffffff, .95); g.fillCircle(ex, ey, 3.4);
    };
    switch (it.type) {
      case 'freeze':
        if (it.done) {
          const I = a.ice, iw = I.w * reveal;
          g.fillStyle(0xc8eeff, .92); g.fillRoundedRect(I.x, I.y, iw, I.h, 12);
          if (iw > 14) { g.fillStyle(0xffffff, .85); g.fillRoundedRect(I.x + 6, I.y + 4, iw - 12, 8, 6); }
        } else eyeMark(a.ice.x + a.ice.w / 2, it.zone.y + 30, 'blue');
        break;
      case 'thorn':
        if (!it.done) {
          const wl = a.wall; g.fillStyle(0x5b7d3a, 1); g.fillRoundedRect(wl.x, wl.y, wl.w, wl.h, 6);
          g.fillStyle(0x3f5a28, 1);
          for (let yy = wl.y + 8; yy < wl.y + wl.h; yy += 16) { g.fillTriangle(wl.x - 6, yy, wl.x + 6, yy - 5, wl.x + 4, yy + 4); g.fillTriangle(wl.x + wl.w + 6, yy + 6, wl.x + wl.w - 6, yy + 1, wl.x + wl.w - 4, yy + 10); }
          eyeMark(a.em.x, a.em.y, 'red');
        }
        break;
      case 'grow':
        if (it.done) {
          a.leaves.forEach((l: Rect, k: number) => {
            const lk = Math.max(0, Math.min(1, reveal * 1.35 - k * .18));
            const lw = l.w * lk;
            g.fillStyle(0x3f8c52, 1); g.fillRoundedRect(l.x, l.y + (1 - lk) * 13, lw, l.h * lk, 9);
            if (lw > 4) { g.fillStyle(0x5fc77f, 1); g.fillRoundedRect(l.x, l.y - 3 + (1 - lk) * 13, lw, 10 * lk, 8); }
          });
        } else {
          const s = a.sprout; g.lineStyle(3, 0x3f8c52); g.beginPath(); g.moveTo(s.x, s.y); g.lineTo(s.x, s.y - 14); g.strokePath();
          g.fillStyle(0x5fc77f, 1); g.fillEllipse(s.x - 6, s.y - 12, 14, 8); g.fillEllipse(s.x + 6, s.y - 15, 14, 8);
          eyeMark(a.em.x, a.em.y, 'green');
        }
        break;
      case 'bridge': {
        const b = a.bridge;
        if (it.done) {
          const bw = b.w * reveal;
          g.fillStyle(0xb5874f, 1); g.fillRoundedRect(b.x, b.y, bw, b.h, 5);
          g.lineStyle(2, 0x8a6336); for (let i2 = 14; i2 < bw; i2 += 26) { g.beginPath(); g.moveTo(b.x + i2, b.y); g.lineTo(b.x + i2, b.y + b.h); g.strokePath(); }
        } else {
          const rx = a.ropeX, sw = Math.sin(this.t * 2) * .04;
          g.lineStyle(2, 0xc8a24a); g.beginPath(); g.moveTo(rx, a.anchorY); g.lineTo(rx, a.anchorY + 26); g.strokePath();
          g.fillStyle(0xb5874f, 1);
          g.save(); g.translateCanvas(rx, a.anchorY + 26 + 44 + Math.sin(this.t * 2) * 2); g.rotateCanvas(sw);
          g.fillRoundedRect(-9, -44, 18, 90, 5); g.restore();
          eyeMark(a.em.x, a.em.y, 'yellow');
        }
        break;
      }
      case 'rock': {
        const b = a.block;
        if (!it.done) {
          g.fillStyle(0x6b6480, 1); g.fillRoundedRect(b.x, b.y, b.w, b.h, 10);
          g.fillStyle(0x534d68, 1); g.fillRoundedRect(b.x + 6, b.y + 8, b.w - 12, b.h - 14, 8);
          g.fillStyle(0x8fd6ff, 1); g.fillTriangle(b.x + b.w / 2, b.y + 20, b.x + b.w / 2 + 7, b.y + 36, b.x + b.w / 2, b.y + 52);
          eyeMark(a.em.x, a.em.y, 'purple');
        } else { g.fillStyle(0x6b6480, 1); g.fillCircle(b.x + b.w / 2, b.y + b.h - 6, 7); }
        break;
      }
      case 'mush':
        if (!it.done) {
          const s = a.sprout;
          g.fillStyle(0xd8cdbf, 1); g.fillRect(s.x - 3, s.y - 12, 6, 12);
          g.fillStyle(0xd86a8a, 1); g.fillEllipse(s.x, s.y - 13, 24, 16);
          eyeMark(a.em.x, a.em.y, 'purple');
        } else {
          const pd = a.pad, bobM = Math.sin(this.t * 6) * 2;
          g.fillStyle(0xd8cdbf, 1); g.fillRect(pd.x + pd.w / 2 - 7, pd.y + 8, 14, 20);
          g.fillStyle(0xe0738f, 1); g.fillEllipse(pd.x + pd.w / 2, pd.y + 8 + bobM, pd.w, 32);
          g.fillStyle(0xffffff, 1); for (let i2 = 0; i2 < 4; i2++) g.fillCircle(pd.x + 18 + i2 * 22, pd.y - 1 + bobM, 3);
        }
        break;
      case 'torch': {
        g.lineStyle(5, 0x7a5a33); g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(a.x, a.y - 34); g.strokePath();
        if (it.done) {
          const fy = a.y - 42 + Math.sin(this.t * 10) * 2;
          g.fillStyle(0xffd24a, 1); g.fillEllipse(a.x, fy - 4, 16, 24);
          g.fillStyle(0xff8a3a, 1); g.fillEllipse(a.x, fy, 9, 13);
        } else { g.fillStyle(0x46405f, 1); g.fillCircle(a.x, a.y - 38, 5); eyeMark(a.em.x, a.em.y, 'red'); }
        break;
      }
    }
  }
}
