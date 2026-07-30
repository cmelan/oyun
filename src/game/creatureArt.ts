/* CREATURE ART — one silhouette per biome, drawn from engine primitives.

   Ten shapes that must be told apart at 40px on a phone, so each one commits to
   a different overall mass: round, tall-thin, long-low, ball, wide-woolly,
   plump-crowned, wide-clawed, leggy, one-legged-vertical, shifting.

   Every creature shares the same emotional grammar so a child learns it once:
     angry  — leaning forward, brow down, eyes open
     blind  — a band of calming sand across the eyes, posture softened
     happy  — upright, smiling, a small light above the head
   None of this touches the 40x40 collision box; it is drawn around it. */
import type { Graphics } from './engine';
import type { Species } from '../core/creatures';

export interface CreaturePose {
  /** Collision-box left edge and the ground line the creature stands on. */
  x: number; ground: number; w: number; h: number;
  face: number;
  state: 'angry' | 'blind' | 'happy';
  t: number;
  /** 0..1 while the child is healing this creature. */
  healProgress: number;
}

type Draw = (g: Graphics, s: Species, p: CreaturePose, body: number, cx: number, baseY: number, vw: number, vh: number) => void;

/* ---- shared emotional grammar ---- */

function eyes(g: Graphics, p: CreaturePose, x: number, y: number, spread: number, r = 4): void {
  if (p.state === 'blind') return;
  const dx = p.face * (r * .35);
  g.fillStyle(0xffffff, 1);
  g.fillCircle(x - spread, y, r); g.fillCircle(x + spread, y, r);
  g.fillStyle(0x33222a, 1);
  g.fillCircle(x - spread + dx, y, r * .5); g.fillCircle(x + spread + dx, y, r * .5);
}

function blindfold(g: Graphics, p: CreaturePose, x: number, y: number, w: number): void {
  if (p.state !== 'blind') return;
  /* Calming sand, not a wound: warm, soft-cornered, and it fades as healing
     progresses so the child can see the change they are causing. */
  g.fillStyle(0xe8c27a, .95 - p.healProgress * .35);
  g.fillRoundedRect(x - w / 2, y - 4, w, 8, 4);
}

function mood(g: Graphics, p: CreaturePose, x: number, y: number): void {
  if (p.state === 'happy') {
    g.lineStyle(2.4, 0x2a4a33, 1);
    g.beginPath(); g.arc(x, y, 7, .15 * Math.PI, .85 * Math.PI); g.strokePath();
    g.fillStyle(0xffd868, 1);
    g.fillCircle(x, y - 34 + Math.sin(p.t * 5) * 1.5, 4);
  } else if (p.state === 'angry') {
    g.lineStyle(2.4, 0x573b42, 1);
    g.beginPath(); g.arc(x, y + 5, 6, 1.15 * Math.PI, 1.85 * Math.PI); g.strokePath();
  }
}

function healBar(g: Graphics, p: CreaturePose, x: number, top: number): void {
  if (p.healProgress <= 0) return;
  g.fillStyle(0xffd54a, .9);
  g.fillRect(x - p.w / 2, top, p.w * Math.min(1, p.healProgress), 5);
  g.lineStyle(1, 0x8a6a1a, .8);
  g.strokeRect(x - p.w / 2, top, p.w, 5);
}

/* ---- silhouettes ---- */

const mossling: Draw = (g, s, p, body, cx, baseY, vw, vh) => {
  const left = cx - vw / 2, top = baseY - vh;
  g.fillStyle(body, 1);
  g.fillRoundedRect(left, top, vw, vh, 15);
  g.fillTriangle(left + 8, top + 12, left + 13, top - 2, left + 19, top + 10);
  g.fillTriangle(left + 23, top + 9, left + 31, top - 1, left + 34, top + 14);
  g.fillStyle(s.accent, 1);
  g.fillCircle(left + 12, top + 7, 3.5); g.fillCircle(left + 29, top + 7, 3.5);
  g.lineStyle(4, body, 1);
  g.beginPath();
  g.moveTo(cx + p.face * 18, top + 25);
  g.arc(cx + p.face * 25, top + 22, 8, p.face > 0 ? .8 : -.2, p.face > 0 ? 5.2 : 4.2);
  g.strokePath();
  eyes(g, p, cx, top + 15, vw * .18, 5);
  blindfold(g, p, cx, top + 15, vw - 8);
  mood(g, p, cx, top + 26);
};

const gustchick: Draw = (g, s, p, body, cx, baseY, vw, vh) => {
  /* Cannot land: it hovers a little above the ground and never touches it. */
  const hover = Math.sin(p.t * 6) * 4 - 6, top = baseY - vh + hover;
  g.fillStyle(s.accent, .55);
  for (let k = 0; k < 2; k++) {
    const wing = Math.sin(p.t * 11 + k) * 9;
    g.fillEllipse(cx + (k ? 1 : -1) * (vw * .5), top + vh * .5 + wing, vw * .7, 10);
  }
  g.fillStyle(body, 1);
  g.fillEllipse(cx, top + vh * .52, vw, vh * .82);
  g.fillStyle(s.accent, 1);
  for (let k = 0; k < 2; k++) {
    const sway = Math.sin(p.t * 3 + k * 1.5) * 7;
    g.fillEllipse(cx - p.face * (vw * .55) + sway, top + vh * .78 + k * 7, vw * .8, 5);
  }
  g.fillStyle(body, 1);
  g.fillCircle(cx, top + vh * .2, vw * .38);
  g.fillStyle(0xf0a860, 1);
  g.fillTriangle(cx + p.face * vw * .3, top + vh * .2, cx + p.face * vw * .58, top + vh * .24, cx + p.face * vw * .3, top + vh * .3);
  eyes(g, p, cx, top + vh * .17, vw * .16, 3.6);
  blindfold(g, p, cx, top + vh * .17, vw * .78);
  mood(g, p, cx, top + vh * .3);
};

const glimmernewt: Draw = (g, s, p, body, cx, baseY, vw, vh) => {
  /* Long, low and eyeless — the one creature the dark does not frighten. */
  const undulate = Math.sin(p.t * 4) * 2.5;
  g.fillStyle(body, 1);
  g.fillEllipse(cx, baseY - vh * .5 + undulate, vw * .9, vh * .95);
  g.fillEllipse(cx + p.face * vw * .42, baseY - vh * .52, vw * .4, vh * .82);
  g.fillStyle(s.accent, .9);
  for (let k = -2; k <= 2; k++) {
    g.fillEllipse(cx + k * vw * .17, baseY - vh * .92 + Math.sin(p.t * 4 + k) * 2, 8, 5);
  }
  g.fillStyle(body, 1);
  for (let k = 0; k < 2; k++) {
    g.fillEllipse(cx + (k ? 1 : -1) * vw * .28, baseY - 4, 12, 7);
  }
  g.fillStyle(s.accent, 1);
  const tailX = cx - p.face * vw * .5;
  g.fillTriangle(tailX, baseY - vh * .7, tailX - p.face * vw * .22, baseY - vh * .45, tailX, baseY - vh * .2);
  if (p.state !== 'blind') {
    /* No eyes at all — two feeler dots instead, which is its whole character. */
    g.fillStyle(0xfff4c7, .9);
    g.fillCircle(cx + p.face * vw * .5, baseY - vh * .62, 2.4);
    g.fillCircle(cx + p.face * vw * .5, baseY - vh * .42, 2.4);
  }
  blindfold(g, p, cx + p.face * vw * .42, baseY - vh * .55, vw * .38);
  mood(g, p, cx + p.face * vw * .42, baseY - vh * .35);
};

const curlone: Draw = (g, s, p, body, cx, baseY, vw, vh) => {
  /* Reads as a chestnut husk until it opens. That deception is the point. */
  const r = Math.min(vw, vh) * .5;
  const open = p.state === 'happy' ? 1 : p.state === 'blind' ? .5 : 0;
  g.fillStyle(body, 1);
  g.fillCircle(cx, baseY - r, r);
  g.fillStyle(s.accent, 1);
  for (let k = 0; k < 14; k++) {
    const a = (k / 14) * Math.PI * 2 + p.t * .2;
    const len = r * (1.28 - open * .22);
    g.fillTriangle(
      cx + Math.cos(a - .12) * r * .9, baseY - r + Math.sin(a - .12) * r * .9,
      cx + Math.cos(a + .12) * r * .9, baseY - r + Math.sin(a + .12) * r * .9,
      cx + Math.cos(a) * len, baseY - r + Math.sin(a) * len,
    );
  }
  if (open > 0) {
    g.fillStyle(0x8a5a3a, 1);
    g.fillCircle(cx + p.face * r * .18, baseY - r + 2, r * .58 * open);
  }
  eyes(g, p, cx + p.face * r * .18, baseY - r, r * .2, 3.8);
  blindfold(g, p, cx, baseY - r, vw * .72);
  mood(g, p, cx + p.face * r * .18, baseY - r + 11);
};

const windlamb: Draw = (g, s, p, body, cx, baseY, vw, vh) => {
  /* Blown along and unable to stop: the wool streams, the legs stay stiff. */
  const stream = p.state === 'happy' ? 0 : Math.sin(p.t * 7) * 2 + 3;
  g.fillStyle(s.accent, 1);
  for (let k = -1; k <= 1; k += 2) {
    g.fillRect(cx + k * vw * .26 - 2, baseY - vh * .34, 4, vh * .34);
    g.fillRect(cx + k * vw * .1 - 2, baseY - vh * .3, 4, vh * .3);
  }
  g.fillStyle(body, 1);
  for (let k = -2; k <= 2; k++) {
    g.fillCircle(cx + k * vw * .19 - stream, baseY - vh * .6 + Math.sin(k * 1.7) * 4, vh * .3);
  }
  g.fillEllipse(cx, baseY - vh * .58, vw * .92, vh * .58);
  g.fillStyle(body, 1);
  g.fillEllipse(cx + p.face * vw * .44, baseY - vh * .68, vw * .3, vh * .34);
  g.fillStyle(s.accent, 1);
  g.fillTriangle(
    cx + p.face * vw * .38, baseY - vh * .82,
    cx + p.face * vw * .52, baseY - vh * .88,
    cx + p.face * vw * .42, baseY - vh * .7,
  );
  eyes(g, p, cx + p.face * vw * .46, baseY - vh * .68, 4, 3.2);
  blindfold(g, p, cx + p.face * vw * .44, baseY - vh * .68, vw * .3);
  mood(g, p, cx + p.face * vw * .44, baseY - vh * .58);
};

const sugarbird: Draw = (g, s, p, body, cx, baseY, vw, vh) => {
  /* Dizzy: it lists from side to side even when standing still. */
  const tilt = Math.sin(p.t * 2.2) * (p.state === 'happy' ? 1 : 4);
  const top = baseY - vh;
  g.fillStyle(0x8a6a4a, 1);
  g.fillRect(cx - 2 + tilt * .3, baseY - vh * .18, 4, vh * .18);
  g.fillStyle(body, 1);
  g.fillEllipse(cx + tilt, top + vh * .62, vw * .92, vh * .7);
  g.fillEllipse(cx + tilt - p.face * vw * .42, top + vh * .66, vw * .38, vh * .3);
  g.fillCircle(cx + tilt + p.face * vw * .22, top + vh * .28, vw * .3);
  g.fillStyle(0xf0b040, 1);
  g.fillTriangle(
    cx + tilt + p.face * vw * .44, top + vh * .28,
    cx + tilt + p.face * vw * .68, top + vh * .32,
    cx + tilt + p.face * vw * .44, top + vh * .36,
  );
  g.fillStyle(s.accent, 1);
  for (let k = -1; k <= 1; k++) {
    g.fillCircle(cx + tilt + p.face * vw * .2 + k * 7, top + vh * .08, 4.5);
  }
  eyes(g, p, cx + tilt + p.face * vw * .24, top + vh * .26, 4, 3.4);
  blindfold(g, p, cx + tilt + p.face * vw * .22, top + vh * .26, vw * .5);
  mood(g, p, cx + tilt + p.face * vw * .22, top + vh * .4);
};

const shorecrab: Draw = (g, s, p, body, cx, baseY, vw, vh) => {
  /* Wide, low, and permanently braced — it thinks your shadow is a gull. */
  const brace = p.state === 'angry' ? Math.sin(p.t * 9) * 2 : 0;
  g.fillStyle(body, 1);
  for (let k = -2; k <= 2; k++) {
    if (!k) continue;
    g.lineStyle(4, body, 1);
    g.beginPath();
    g.moveTo(cx + k * vw * .2, baseY - vh * .4);
    g.lineTo(cx + k * vw * .34, baseY - 2);
    g.strokePath();
  }
  g.fillStyle(body, 1);
  g.fillEllipse(cx, baseY - vh * .58, vw * .95, vh * .78);
  g.fillStyle(s.accent, .85);
  g.fillEllipse(cx, baseY - vh * .68, vw * .6, vh * .34);
  for (let k = -1; k <= 1; k += 2) {
    const clawX = cx + k * vw * .56, clawY = baseY - vh * .52 + brace;
    g.fillStyle(body, 1);
    g.fillEllipse(clawX, clawY, vw * .3, vh * .42);
    g.fillTriangle(clawX + k * 10, clawY - 8, clawX + k * 20, clawY - 12, clawX + k * 12, clawY);
  }
  /* Stalk eyes: the read at 40px. */
  if (p.state !== 'blind') {
    g.lineStyle(3, body, 1);
    for (let k = -1; k <= 1; k += 2) {
      g.beginPath();
      g.moveTo(cx + k * 7, baseY - vh * .8);
      g.lineTo(cx + k * 9, baseY - vh * 1.08);
      g.strokePath();
    }
    g.fillStyle(0xffffff, 1);
    g.fillCircle(cx - 9, baseY - vh * 1.1, 4); g.fillCircle(cx + 9, baseY - vh * 1.1, 4);
    g.fillStyle(0x33222a, 1);
    g.fillCircle(cx - 9 + p.face, baseY - vh * 1.1, 2); g.fillCircle(cx + 9 + p.face, baseY - vh * 1.1, 2);
  }
  blindfold(g, p, cx, baseY - vh * .78, vw * .5);
  mood(g, p, cx, baseY - vh * .5);
};

const mistdeer: Draw = (g, s, p, body, cx, baseY, vw, vh) => {
  /* Barely there: legs thin enough to see through, body a soft mass of fog. */
  const alpha = p.state === 'happy' ? 1 : .78;
  g.fillStyle(s.accent, alpha * .8);
  for (let k = -1; k <= 1; k += 2) {
    g.fillRect(cx + k * vw * .24 - 1.5, baseY - vh * .46, 3, vh * .46);
    g.fillRect(cx + k * vw * .1 - 1.5, baseY - vh * .43, 3, vh * .43);
  }
  g.fillStyle(body, alpha);
  g.fillEllipse(cx, baseY - vh * .6, vw * .82, vh * .34);
  const headX = cx + p.face * vw * .38, headY = baseY - vh * .86;
  g.lineStyle(6, body, alpha);
  g.beginPath(); g.moveTo(cx + p.face * vw * .28, baseY - vh * .66); g.lineTo(headX, headY + 6); g.strokePath();
  g.fillStyle(body, alpha);
  g.fillEllipse(headX, headY, vw * .3, vh * .18);
  g.lineStyle(3, s.accent, alpha);
  for (let k = -1; k <= 1; k += 2) {
    g.beginPath();
    g.moveTo(headX - p.face * 4, headY - 6);
    g.lineTo(headX - p.face * 8 + k * 4, headY - 20);
    g.moveTo(headX - p.face * 8 + k * 4, headY - 20);
    g.lineTo(headX - p.face * 14 + k * 8, headY - 26);
    g.strokePath();
  }
  eyes(g, p, headX, headY, 5, 3);
  blindfold(g, p, headX, headY, vw * .3);
  mood(g, p, headX, headY + 12);
};

const reedheron: Draw = (g, s, p, body, cx, baseY, vw, vh) => {
  /* Tall, narrow, on one leg. Startles upward rather than fleeing sideways. */
  const startled = p.state === 'angry' ? Math.abs(Math.sin(p.t * 5)) * 5 : 0;
  const top = baseY - vh - startled;
  g.fillStyle(s.accent, 1);
  g.fillRect(cx - 2, baseY - vh * .42, 4, vh * .42);
  g.fillStyle(body, 1);
  g.fillEllipse(cx, top + vh * .68, vw * .9, vh * .42);
  g.fillStyle(s.accent, .7);
  g.fillEllipse(cx - p.face * vw * .3, top + vh * .72, vw * .5, vh * .22);
  g.lineStyle(6, body, 1);
  g.beginPath();
  g.moveTo(cx, top + vh * .55);
  g.lineTo(cx + p.face * vw * .12, top + vh * .3);
  g.lineTo(cx + p.face * vw * .04, top + vh * .12);
  g.strokePath();
  const headX = cx + p.face * vw * .06, headY = top + vh * .08;
  g.fillStyle(body, 1);
  g.fillEllipse(headX, headY, vw * .36, vh * .12);
  g.fillStyle(0xf0c060, 1);
  g.fillTriangle(headX + p.face * vw * .14, headY - 2, headX + p.face * vw * .52, headY + 1, headX + p.face * vw * .14, headY + 4);
  eyes(g, p, headX, headY - 1, 3.5, 2.8);
  blindfold(g, p, headX, headY - 1, vw * .32);
  mood(g, p, headX, headY + 10);
};

const echoling: Draw = (g, s, p, body, cx, baseY, vw, vh) => {
  /* Wears the shapes of creatures already met — it cycles slowly through the
     roster's masses so the child half-recognises it without ever placing it. */
  const phase = (p.t * .35) % 3;
  const morph = phase < 1 ? phase : phase < 2 ? 1 : 3 - phase;
  const top = baseY - vh;
  g.fillStyle(body, 1);
  g.fillRoundedRect(cx - vw / 2, top + vh * (.1 * morph), vw, vh * (1 - .1 * morph), 14 + morph * 8);
  g.fillStyle(s.accent, .9);
  for (let k = -1; k <= 1; k++) {
    g.fillCircle(cx + k * vw * .3, top + vh * .06 + morph * 5, 6 - morph * 1.5);
  }
  g.fillStyle(s.accent, .5);
  g.fillEllipse(cx, top + vh * .52, vw * (.6 + morph * .3), vh * .3);
  eyes(g, p, cx, top + vh * .3, vw * .2, 4.4);
  blindfold(g, p, cx, top + vh * .3, vw * .78);
  mood(g, p, cx, top + vh * .46);
};

export const SILHOUETTE: Record<string, Draw> = {
  mossling, gustchick, glimmernewt, curlone, windlamb,
  sugarbird, shorecrab, mistdeer, reedheron, echoling,
};

/** Draw a creature. `pose` is in world coordinates; the 40x40 collision box is
 *  never used for anything but placement. */
export function drawCreature(g: Graphics, species: Species, pose: CreaturePose): void {
  const cx = pose.x + pose.w / 2;
  const vw = pose.w * species.visual.w, vh = pose.h * species.visual.h;
  const body = species.palette[pose.state];
  const bob = pose.state === 'happy' ? Math.sin(pose.t * 7 + pose.x) * 2 : 0;

  g.fillStyle(0x173e35, .16);
  g.fillEllipse(cx, pose.ground + 2, vw * .82, 8);
  if (pose.state === 'happy') {
    g.fillStyle(0x9fe6a9, .2 + Math.sin(pose.t * 4) * .06);
    g.fillCircle(cx, pose.ground - vh * .5, vw * .66);
  }
  (SILHOUETTE[species.silhouette] || mossling)(g, species, pose, body, cx, pose.ground + bob, vw, vh);
  healBar(g, pose, cx, pose.ground - vh - 14);
}
