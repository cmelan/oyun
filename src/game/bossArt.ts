/* BOSS ART — one distinct silhouette per archetype.

   Every boss in the game, including the final one, was an 88x88 rounded
   rectangle with two white circles and two dark pupils. The mimic added four
   green dots on top. That was the whole visual escalation across nine bosses.

   These are not enemies. Each is a large creature in distress that the child
   calms and then restores, so the design language is "too big and frightened",
   never "armed". They are drawn around the existing BossData box; nothing here
   changes the hitbox, the attack cadence, or the finisher. */
import type { Graphics } from './engine';
import type { BossData } from '../core/generator';

export type BossForm = 'thrower' | 'mimic';

export interface BossPose {
  x: number; ground: number; w: number; h: number;
  face: number; t: number;
  state: BossData['state'];
  /** 0..1 — how far through its restoration, used to soften the whole shape. */
  calm: number;
}

/* Shared: the sand band that says "calmed, not defeated". */
function calmBand(g: Graphics, p: BossPose, cx: number, y: number, w: number): void {
  if (p.state !== 'blind') return;
  g.fillStyle(0xe8c27a, .95);
  g.fillRoundedRect(cx - w / 2, y - 6, w, 13, 6);
}

function bigEyes(g: Graphics, p: BossPose, cx: number, y: number, spread: number, r: number): void {
  if (p.state === 'blind') return;
  const worried = p.state === 'idle' ? Math.sin(p.t * 2) * 1.5 : 0;
  g.fillStyle(0xffffff, 1);
  g.fillCircle(cx - spread, y + worried, r); g.fillCircle(cx + spread, y + worried, r);
  g.fillStyle(0x2a1420, 1);
  const dx = p.face * r * .28;
  g.fillCircle(cx - spread + dx, y + worried, r * .46);
  g.fillCircle(cx + spread + dx, y + worried, r * .46);
}

/** The Thrower: a hunched giant of piled stone. It is not attacking so much as
 *  flinching — huge shoulders, small head, arms wrapped around itself. */
function drawThrower(g: Graphics, p: BossPose, body: number): void {
  const cx = p.x + p.w / 2, base = p.ground;
  const w = p.w, h = p.h;
  const hunch = p.state === 'idle' ? Math.sin(p.t * 1.6) * 3 : 0;

  g.fillStyle(0x241a2a, .22);
  g.fillEllipse(cx, base + 3, w * 1.15, 14);

  /* Legs: two heavy blocks, planted wide. */
  g.fillStyle(body, 1);
  g.fillRoundedRect(cx - w * .42, base - h * .34, w * .32, h * .34, 9);
  g.fillRoundedRect(cx + w * .10, base - h * .34, w * .32, h * .34, 9);

  /* Body: a boulder mass, wider at the shoulders than the hips. */
  g.fillPolygon([
    cx - w * .40, base - h * .30,
    cx - w * .56, base - h * .74 + hunch,
    cx - w * .34, base - h * .96 + hunch,
    cx + w * .34, base - h * .96 + hunch,
    cx + w * .56, base - h * .74 + hunch,
    cx + w * .40, base - h * .30,
  ]);

  /* Moss and cracks — it has been standing here a long time. */
  g.fillStyle(0x5f7a52, .5 + p.calm * .4);
  g.fillEllipse(cx - w * .22, base - h * .88 + hunch, w * .3, h * .1);
  g.fillEllipse(cx + w * .26, base - h * .8 + hunch, w * .22, h * .08);

  /* Arms wrapped across the chest: the whole read is "braced", not "swinging". */
  g.lineStyle(Math.max(6, w * .13), body, 1);
  g.beginPath();
  g.moveTo(cx - w * .5, base - h * .66 + hunch);
  g.lineTo(cx - w * .14, base - h * .46 + hunch);
  g.lineTo(cx + w * .2, base - h * .56 + hunch);
  g.strokePath();

  /* A small head for a big body — the classic gentle-giant proportion. */
  const headY = base - h * 1.06 + hunch;
  g.fillStyle(body, 1);
  g.fillEllipse(cx, headY, w * .46, h * .30);
  bigEyes(g, p, cx, headY, w * .13, w * .085);
  calmBand(g, p, cx, headY, w * .40);
}

/** The Mimic: a tree that is not a tree. Its silhouette is a proper crown and
 *  trunk, and the tell is that the crown breathes and the trunk has a seam. */
function drawMimic(g: Graphics, p: BossPose, body: number): void {
  const cx = p.x + p.w / 2, base = p.ground;
  const w = p.w, h = p.h;
  const breathe = p.state === 'idle' ? Math.sin(p.t * 2.4) * .04 : 0;
  const open = p.state === 'blind' || p.state === 'caged' || p.state === 'defeated' ? 1 : 0;

  g.fillStyle(0x241a2a, .22);
  g.fillEllipse(cx, base + 3, w * 1.0, 13);

  /* Root flare and trunk. */
  g.fillStyle(0x6b4a33, 1);
  g.fillPolygon([
    cx - w * .34, base,
    cx - w * .14, base - h * .5,
    cx + w * .14, base - h * .5,
    cx + w * .34, base,
  ]);
  /* The seam: a vertical split that only a careful child notices. */
  g.fillStyle(0x3f2a1c, .8 + open * .2);
  g.fillRect(cx - 2, base - h * (.48 + open * .1), 4, h * (.46 + open * .1));

  /* Crown: overlapping leaf masses, scaled by its breathing. */
  const s = 1 + breathe;
  g.fillStyle(body, 1);
  g.fillCircle(cx, base - h * .78 * s, w * .38 * s);
  g.fillCircle(cx - w * .32, base - h * .6 * s, w * .28 * s);
  g.fillCircle(cx + w * .32, base - h * .6 * s, w * .28 * s);
  g.fillCircle(cx - w * .16, base - h * 1.0 * s, w * .26 * s);
  g.fillCircle(cx + w * .18, base - h * 1.02 * s, w * .28 * s);
  g.fillStyle(0x8fd07a, .45);
  g.fillCircle(cx + w * .06, base - h * .88 * s, w * .2 * s);

  /* The eyes live IN the crown, which is the joke: the tree is looking at you. */
  bigEyes(g, p, cx, base - h * .74, w * .16, w * .1);
  calmBand(g, p, cx, base - h * .74, w * .46);
}

const FORMS: Record<BossForm, (g: Graphics, p: BossPose, body: number) => void> = {
  thrower: drawThrower,
  mimic: drawMimic,
};

/** Draw a boss. Colour comes from its state so the calming arc is legible at a
 *  glance: distressed → calmed → restored. */
export function drawBossCreature(g: Graphics, form: BossForm, p: BossPose): void {
  const body = p.state === 'blind' ? 0xb8b2c9
    : p.state === 'caged' ? 0x9fbfa0
      : p.state === 'defeated' ? 0x8fd0a0
        : form === 'mimic' ? 0x5e8a52 : 0x8a6f8a;
  (FORMS[form] || drawThrower)(g, p, body);
}
