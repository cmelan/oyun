/* LevelScene — v1 engine on the vanilla-Canvas engine (src/game/engine.ts).
   Kinematics/constants are the proven v1 values (game feel preserved); the engine
   supplies the camera (scroll/shake/flash) and render loop. World entities draw
   immediate-mode into Graphics layers (a faithful port of the v1 renderer). */
import { Scene, Graphics, BLEND, hexToNum } from './engine';
import { CONFIG, TOOLS, type Eye } from '../core/config';
import { BIOME } from '../core/biomes';
import { prepLevel, LEVEL_META, WORLD, LEVELS, regionTreePool } from '../core/world';
import type { LevelData, Interact, BossData, Rect } from '../core/generator';
import {
  sandCapacity, makeMonster, sandHit, empathyTick, bossSandHit, bossCageResolve,
  mimicNextId, assistFactors, overlap, type MonsterRuntime, type AssistState,
} from '../core/logic';
import { TREES } from '../core/trees';
import { LEAF_COLOR } from './art';
import { sfx } from './audio';
import type { UI } from './ui';

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
  private darkGfx!: Graphics;
  private input2: InputState = { left: false, right: false, jumpEdge: false, jumpHeld: false, useEdge: false, sandEdge: false, healHeld: false };
  private player = { x: 90, y: 340, w: CONFIG.player.w, h: CONFIG.player.h, vx: 0, vy: 0, grounded: false, face: 1, coyote: 0, jbuf: 0, iframe: 0, squash: 1, squashVel: 0, blink: 0, blinkT: 2.2 };
  private hearts: number = CONFIG.hearts;
  private respawn = { x: 90, y: 340 };
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
  private keyHandlers: { dn: (e: KeyboardEvent) => void; up: (e: KeyboardEvent) => void } | null = null;

  constructor() { super(LevelScene.KEY); }

  init(data: { idx: number; hooks: SceneHooks }): void {
    this.idx = data.idx; this.hooks = data.hooks;
  }

  create(): void {
    this.L = prepLevel(this.idx, this.hooks.journal());
    this.monsters = this.L.monsters.map(makeMonster);
    this.hearts = CONFIG.hearts;
    this.respawn = { x: this.L.spawn.x, y: this.L.spawn.y };
    this.player.x = this.L.spawn.x; this.player.y = this.L.spawn.y;
    this.player.vx = 0; this.player.vy = 0; this.player.iframe = 0; this.player.squash = 1;
    this.cam = 0; this.t = 0; this.ended = false; this.modal = false;
    this.bossActive = false; this.bossShots = []; this.sands = []; this.particles = [];
    this.assist = { deaths: 0 }; this.introSeen.clear();
    this.sandMax = sandCapacity(this.L); this.sandLeft = this.sandMax;
    this.bgGfx = this.add.graphics().setScrollFactor(0);
    this.gfx = this.add.graphics();
    this.darkGfx = this.add.graphics().setScrollFactor(0);
    this.cameras.main.setBounds(0, 0, this.L.w, H);
    this.bindKeys();
    const ui = this.hooks.ui;
    ui.setGameplayVisible(true);
    ui.setHearts(this.hearts, CONFIG.hearts);
    ui.setSand(this.sandLeft);
    ui.setPower(null);
    ui.hideOverlay();
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
    for (let i = 0; i < n; i++) this.particles.push({ x, y, vx: (Math.random() * 2 - 1) * sp, vy: (Math.random() * 2 - 1) * sp - 40, life, max: life, col, alpha: 1, r: 2 + Math.random() * 3 });
  }
  private shake(mag: number, dur: number): void { this.cameras.main.shake(dur * 1000, mag * 0.0016); }
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
    if (this.L.arena && this.bossActive && this.L.boss && this.L.boss.state !== 'defeated') arr.push(this.L.arena.wall);
    return arr;
  }
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
    this.cameras.main.flash(160, 190, 240, 220);
    switch (it.type) {
      case 'freeze': sfx('freeze'); this.spawnP(a.ice.x + a.ice.w / 2, a.ice.y, 30, 0xbfe9ff, 240, .9); break;
      case 'thorn': sfx('burn'); this.spawnP(a.wall.x + 14, a.wall.y + 60, 26, 0xff8a4a, 200, .8); break;
      case 'grow': sfx('grow'); a.leaves.forEach((l: Rect) => this.spawnP(l.x + l.w / 2, l.y, 14, 0x7fe0a0, 150, .8)); break;
      case 'bridge': sfx('cut'); this.spawnP(a.bridge.x + a.bridge.w / 2, a.bridge.y, 22, 0xd9b98a, 200, .8); break;
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
      if (px > z.x && px < z.x + z.w && py > z.y && py < z.y + z.h && it.eye === this.equipped) { this.activate(it); return; }
    }
  }

  /* modal answers, called from main wiring */
  resolveTreeAnswer(correct: boolean, treeId: string): void {
    if (!correct) { this.shake(CONFIG.tree.wrongShake, .15); sfx('puff'); return; }
    const tr = this.L.trees.find(t => t.id === treeId && !t.awake);
    if (tr) {
      tr.awake = true; sfx('wake');
      this.spawnP(tr.x, tr.y - 70, 26, 0xffe6a0, 180, 1.1); this.shake(2, .2);
      this.hooks.onTreeLearned(treeId);
    }
    this.hooks.ui.showTreeWake(treeId, () => { this.hooks.ui.hideOverlay(); this.setModal(false); });
  }
  resolveMimicAnswer(correct: boolean): void {
    if (!correct) { this.shake(CONFIG.tree.wrongShake, .15); sfx('puff'); return; }
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
    this.cameras.main.flash(240, 255, 80, 90); sfx('hurt'); this.shake(3, .15);
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
      if (empathyTick(m, dt, m === this.healTarget)) { this.gainHeart(); this.spawnP(m.x + 20, m.ground - 40, 26, 0xffe6a0, 200, 1); sfx('heal'); this.shake(2, .12); }
      if (m.state === 'happy') {
        if (m.x <= m.gx0) (m as any).dir = 1; if (m.x >= m.gx1) (m as any).dir = -1;
        m.x += ((m as any).dir || 1) * CONFIG.monster.happy * dt; continue;
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
    p.blinkT -= dt; if (p.blinkT <= 0) { p.blink = .12; p.blinkT = 1.8 + Math.random() * 2.6; } if (p.blink > 0) p.blink -= dt;
    for (let pi = this.particles.length - 1; pi >= 0; pi--) {
      const pt = this.particles[pi]; pt.life -= dt;
      if (pt.life <= 0) { this.particles.splice(pi, 1); continue; }
      pt.vy += 380 * dt; pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.alpha = pt.life / pt.max;
    }
    /* intros → hint bar */
    this.L.intros.forEach((intro, ii) => {
      if (!this.introSeen.has(ii) && Math.abs(pcx - intro.x) < 40) { this.introSeen.add(ii); this.hooks.ui.showHint(intro.text, 2.6); }
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
    const g = this.gfx, bg = this.bgGfx;
    /* sky + parallax */
    bg.clear();
    bg.fillGradientStyle(this.col(B.skyTop), this.col(B.skyTop), this.col(B.skyMid), this.col(B.skyBot), 1);
    bg.fillRect(0, 0, W, H);
    bg.fillStyle(this.col(B.hillsFar), 1);
    for (let hx = -1; hx < 6; hx++) { const bxx = hx * 260 - (this.cam * .2) % 260; bg.fillEllipse(bxx, H - 90, 340, 220); }
    bg.fillStyle(this.col(B.hillsMid), 1);
    for (let hx = -1; hx < 7; hx++) { const bxx = hx * 200 - (this.cam * .45) % 200; bg.fillEllipse(bxx, H - 40, 260, 170); }
    g.clear();
    /* water */
    if (this.L.water) {
      const wt = this.L.water;
      g.fillStyle(0x3fa9f5, .55); g.fillRect(wt.x, wt.top, wt.w, H - wt.top);
      g.fillStyle(0xffffff, .3);
      for (let k = 0; k < 4; k++) g.fillRect(wt.x + 20 + k * 70 + Math.sin(this.t * 2 + k) * 8, wt.top + 4, 34, 3);
    }
    /* platforms */
    for (const pl of this.L.platforms) {
      g.fillStyle(this.col(B.soil), 1); g.fillRoundedRect(pl.x, pl.y, pl.w, pl.h, 8);
      g.fillStyle(this.col(B.soilDark), 1); g.fillRect(pl.x + 4, pl.y + 22, pl.w - 8, Math.max(0, pl.h - 26));
      g.fillStyle(this.col(B.grass), 1); g.fillRoundedRect(pl.x, pl.y, pl.w, 16, { tl: 8, tr: 8, bl: 0, br: 0 });
      g.fillStyle(this.col(B.grassLight), 1);
      for (let k = pl.x + 8; k < pl.x + pl.w - 8; k += 26) g.fillRect(k, pl.y + 2, 10, 4);
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
    /* trees */
    for (const tr of this.L.trees) this.drawTree(g, tr as any);
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
  private drawMonster(g: Graphics, m: MonsterRuntime): void {
    const md = m as any, x = m.x, y = m.ground - md.h;
    const body = m.state === 'happy' ? 0x76c893 : m.state === 'blind' ? 0xb8b2c9 : 0xd66a6a;
    g.fillStyle(body, 1); g.fillRoundedRect(x, y, md.w, md.h, 12);
    if (m.state === 'blind') { g.fillStyle(0xe8c27a, 1); g.fillRoundedRect(x + 4, y + 8, md.w - 8, 9, 4); }
    else {
      g.fillStyle(0xffffff, 1); g.fillCircle(x + md.w * .32, y + 13, 5); g.fillCircle(x + md.w * .68, y + 13, 5);
      g.fillStyle(0x33222a, 1);
      const dx = (md.face || -1) * 1.6;
      g.fillCircle(x + md.w * .32 + dx, y + 13, 2.4); g.fillCircle(x + md.w * .68 + dx, y + 13, 2.4);
    }
    if (m.state === 'happy') { g.lineStyle(2.4, 0x2a4a33); g.beginPath(); g.arc(x + md.w / 2, y + 24, 7, .15 * Math.PI, .85 * Math.PI); g.strokePath(); }
    else if (m.state === 'angry') { g.lineStyle(2.4, 0x4a2222); g.beginPath(); g.arc(x + md.w / 2, y + 32, 7, 1.15 * Math.PI, 1.85 * Math.PI); g.strokePath(); }
    if (m === this.healTarget && m.healT > 0) {
      g.fillStyle(0xffd54a, .9); g.fillRect(x, y - 12, md.w * Math.min(1, m.healT / CONFIG.heal.HEAL_TIME), 5);
      g.lineStyle(1, 0x8a6a1a, .8); g.strokeRect(x, y - 12, md.w, 5);
    }
  }
  private drawBoss(g: Graphics, b: BossData): void {
    const sc = b.scale, w = b.w * sc, h = b.h * sc;
    const wob = b.shake > 0 ? Math.sin(this.t * 40) * 3 : 0;
    const x = b.x + wob, y = b.ground - h;
    const body = b.state === 'blind' ? 0xb8b2c9 : b.kind === 'mimic' ? 0x5e8a52 : 0x9a5e8a;
    g.fillStyle(body, 1); g.fillRoundedRect(x, y, w, h, 16);
    if (b.kind === 'mimic') { /* leafy disguise tufts */
      g.fillStyle(0x76b45e, 1);
      for (let k = 0; k < 4; k++) g.fillCircle(x + w * (.2 + k * .2), y - 6 * sc, 9 * sc);
    }
    if (b.state === 'blind') { g.fillStyle(0xe8c27a, 1); g.fillRoundedRect(x + 8 * sc, y + 16 * sc, w - 16 * sc, 12 * sc, 5); }
    else {
      g.fillStyle(0xffffff, 1); g.fillCircle(x + w * .3, y + 24 * sc, 8 * sc); g.fillCircle(x + w * .7, y + 24 * sc, 8 * sc);
      g.fillStyle(0x2a1420, 1); g.fillCircle(x + w * .3 + b.face * 2, y + 24 * sc, 3.6 * sc); g.fillCircle(x + w * .7 + b.face * 2, y + 24 * sc, 3.6 * sc);
      if (b.tel > 0) { g.lineStyle(3, 0xffcc3a, .9); g.strokeCircle(x + w / 2, y + h / 2, w * .62); }
    }
    if (b.state === 'caged' && b.finisher === 'cage') {
      g.lineStyle(3, 0x5fc77f, .95);
      for (let k = 0; k <= 4; k++) { const cx2 = x - 6 + (k / 4) * (w + 12); g.beginPath(); g.moveTo(cx2, y - 10); g.lineTo(cx2, b.ground + 4); g.strokePath(); }
      g.strokeRect(x - 6, y - 10, w + 12, h + 14);
    }
    if (b.state === 'defeated') { g.fillStyle(0xffe6a0, .8); g.fillCircle(x + w / 2, y + h / 2, w * (.5 + Math.sin(this.t * 6) * .06)); }
    /* hp pips */
    for (let k = 0; k < 3; k++) { g.fillStyle(k < b.hp ? 0xff6b8a : 0x3a2a35, 1); g.fillCircle(x + w / 2 - 20 + k * 20, y - 18, 6); }
  }
  private drawTree(g: Graphics, tr: { id: string; x: number; y: number; awake?: boolean }): void {
    const info = TREES[tr.id]; const crown = info?.crown || 'broad';
    const bob = tr.awake ? Math.sin(this.t * 1.6) * 3 : 0;
    const x = tr.x, y = tr.y + bob;
    if (!tr.awake) { /* beacon */
      const near = this.nearTree === tr;
      const ba = (near ? .34 : .2) + Math.sin(this.t * 2.4) * .06;
      g.fillStyle(0xffe896, ba); g.fillTriangle(x - 12, 60, x + 12, 60, x, y);
      g.fillStyle(0xfff3c4, .8);
      for (let k = 0; k < 4; k++) { const ph = (this.t * .35 + k * .25) % 1; g.fillCircle(x + Math.sin(this.t * 1.3 + k * 2.2) * 18, y - 20 - ph * 150, 2.4); }
    }
    const trunkH = crown === 'tall' || crown === 'palm' ? 72 : 56, trunkW = crown === 'tall' ? 16 : 18;
    g.fillStyle(tr.awake ? (crown === 'tall' ? 0xcdbd90 : 0x7d5a3a) : 0x6b6560, 1);
    g.fillTriangle(x - trunkW / 2 - 3, y + 2, x - trunkW / 2, y - trunkH, x + trunkW / 2, y - trunkH);
    g.fillTriangle(x - trunkW / 2 - 3, y + 2, x + trunkW / 2, y - trunkH, x + trunkW / 2 + 3, y + 2);
    const cols = LEAF_COLOR[tr.id] || ['#63c49b', '#4fae87'];
    const leafA = tr.awake ? this.col(cols[0]) : 0x8b9490;
    const leafB = tr.awake ? this.col(cols[1]) : 0x767f7b;
    if (crown === 'tall') {
      g.fillStyle(leafA, 1); g.fillCircle(x - 16, y - trunkH - 18, 20); g.fillCircle(x + 16, y - trunkH - 18, 20); g.fillCircle(x, y - trunkH - 44, 24); g.fillCircle(x, y - trunkH - 14, 22);
      g.fillStyle(leafB, 1); g.fillCircle(x + 10, y - trunkH - 34, 13);
    } else if (crown === 'oval') {
      g.fillStyle(leafA, 1); g.fillEllipse(x, y - trunkH - 24, 60, 76);
      g.fillStyle(leafB, 1); g.fillEllipse(x + 9, y - trunkH - 14, 28, 40);
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
    const eyeMark = (ex: number, ey: number, eye: Eye) => {
      const pu = 1 + Math.sin(this.t * 4) * .12;
      g.fillStyle(this.col(TOOLS[eye].col), .28); g.fillCircle(ex, ey, 16 * pu);
      g.fillStyle(this.col(TOOLS[eye].col), 1); g.fillCircle(ex, ey, 8);
      g.fillStyle(0xffffff, .95); g.fillCircle(ex, ey, 3.4);
    };
    switch (it.type) {
      case 'freeze':
        if (it.done) {
          const I = a.ice; g.fillStyle(0xc8eeff, .92); g.fillRoundedRect(I.x, I.y, I.w, I.h, 12);
          g.fillStyle(0xffffff, .85); g.fillRoundedRect(I.x + 6, I.y + 4, I.w - 12, 8, 6);
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
          for (const l of a.leaves) { g.fillStyle(0x3f8c52, 1); g.fillRoundedRect(l.x, l.y, l.w, l.h, 9); g.fillStyle(0x5fc77f, 1); g.fillRoundedRect(l.x, l.y - 3, l.w, 10, 8); }
        } else {
          const s = a.sprout; g.lineStyle(3, 0x3f8c52); g.beginPath(); g.moveTo(s.x, s.y); g.lineTo(s.x, s.y - 14); g.strokePath();
          g.fillStyle(0x5fc77f, 1); g.fillEllipse(s.x - 6, s.y - 12, 14, 8); g.fillEllipse(s.x + 6, s.y - 15, 14, 8);
          eyeMark(a.em.x, a.em.y, 'green');
        }
        break;
      case 'bridge': {
        const b = a.bridge;
        if (it.done) {
          g.fillStyle(0xb5874f, 1); g.fillRoundedRect(b.x, b.y, b.w, b.h, 5);
          g.lineStyle(2, 0x8a6336); for (let i2 = 14; i2 < b.w; i2 += 26) { g.beginPath(); g.moveTo(b.x + i2, b.y); g.lineTo(b.x + i2, b.y + b.h); g.strokePath(); }
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
