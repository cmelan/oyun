/* WebAudio synth — v1 port (tiny, offline-safe, no asset files). */
let audio: AudioContext | null = null;
let masterGain: GainNode | null = null;
let muted = false;

export function initAudio(startMuted: boolean): void {
  muted = startMuted;
  if (audio) return;
  try {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    audio = new AC();
    masterGain = audio.createGain();
    masterGain.gain.value = muted ? 0 : .5;
    masterGain.connect(audio.destination);
    audio.resume?.();
  } catch { audio = null; }
}
export function setMuted(m: boolean): void {
  muted = m;
  if (audio && masterGain) masterGain.gain.setTargetAtTime(m ? 0 : .5, audio.currentTime, .02);
}
export function isMuted(): boolean { return muted; }

function beep(f: number, dur: number, type: OscillatorType, vol: number, slideTo?: number): void {
  if (!audio || !masterGain || muted) return;
  const t0 = audio.currentTime;
  const o = audio.createOscillator(), g = audio.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(.0001, t0); g.gain.linearRampToValueAtTime(vol, t0 + .012);
  g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
  o.connect(g); g.connect(masterGain); o.start(t0); o.stop(t0 + dur + .03);
}
function noise(dur: number, vol: number, cut: number): void {
  if (!audio || !masterGain || muted) return;
  const t0 = audio.currentTime;
  const b = audio.createBuffer(1, Math.floor(audio.sampleRate * dur), audio.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = audio.createBufferSource(); src.buffer = b;
  const f = audio.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cut;
  const g = audio.createGain(); g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
  src.connect(f); f.connect(g); g.connect(masterGain); src.start(t0);
}
function seq(a: number[], dur: number, gap: number, type: OscillatorType, vol: number): void {
  a.forEach((f, i) => setTimeout(() => beep(f, dur, type, vol), i * gap));
}

export type SfxName = 'jump' | 'freeze' | 'burn' | 'grow' | 'cut' | 'sand' | 'shrink' | 'boing' | 'puff' | 'ding'
  | 'heal' | 'thud' | 'cage' | 'bosshurt' | 'hurt' | 'clear' | 'win' | 'sad' | 'wake' | 'land';

export function sfx(n: SfxName, extra?: number): void {
  if (!audio || muted) return;
  switch (n) {
    case 'jump': beep(300, .12, 'sine', .25, 560); break;
    case 'freeze': beep(950, .28, 'sine', .25, 420); break;
    case 'burn': noise(.25, .22, 600); beep(160, .2, 'sawtooth', .1, 90); break;
    case 'grow': beep(280, .3, 'sine', .22, 680); break;
    case 'cut': noise(.14, .22, 3200); beep(820, .12, 'sawtooth', .1, 260); break;
    case 'sand': noise(.12, .2, 1600); break;
    case 'shrink': beep(720, .26, 'sine', .24, 170); break;
    case 'boing': beep(280, .18, 'sine', .3, 760); break;
    case 'puff': noise(.16, .18, 900); break;
    case 'ding': beep(880, .14, 'sine', .28); beep(1320, .18, 'sine', .2); break;
    case 'heal': seq([523, 659, 784], .3, 90, 'sine', .22); break;
    case 'thud': beep(120, .18, 'triangle', .3, 70); noise(.12, .16, 500); break;
    case 'cage': seq([330, 494, 659], .28, 70, 'sine', .2); break;
    case 'bosshurt': beep(300, .25, 'square', .18, 140); break;
    case 'hurt': beep(400, .2, 'sine', .24, 200); break;
    case 'clear': seq([523, 659, 784, 1047], .3, 110, 'sine', .24); break;
    case 'win': seq([523, 659, 784, 1047, 1319], .34, 120, 'sine', .26); break;
    case 'sad': seq([440, 392, 330, 262], .3, 150, 'sine', .2); break;
    case 'wake': seq([392, 523, 659, 880], .28, 90, 'sine', .24); break;
    case 'land': { const fall = extra ?? .5; beep(190 - fall * 70, .09, 'triangle', .22, 140); noise(.08, .1 + fall * .08, 400); break; }
  }
}

/* Gentle looping melody (v1 port), ticked from outside. */
const MEL = [523.25, 587.33, 659.25, 783.99, 659.25, 587.33, 659.25, 880, 783.99, 659.25, 587.33, 523.25];
let mi = 0;
let musicOn = true;
export function setMusicOn(on: boolean): void { musicOn = on; }
export function startMusic(): void {
  setInterval(() => {
    if (!audio || !masterGain || muted || !musicOn) return;
    const t0 = audio.currentTime;
    const o = audio.createOscillator(), g = audio.createGain();
    o.type = 'sine'; o.frequency.value = MEL[mi % MEL.length] / 2;
    g.gain.setValueAtTime(.0001, t0); g.gain.linearRampToValueAtTime(.05, t0 + .05);
    g.gain.exponentialRampToValueAtTime(.0001, t0 + .55);
    o.connect(g); g.connect(masterGain); o.start(t0); o.stop(t0 + .6);
    if (mi % 4 === 0) {
      const ob = audio.createOscillator(), gb = audio.createGain();
      ob.type = 'triangle'; ob.frequency.value = 130.81;
      gb.gain.setValueAtTime(.045, t0); gb.gain.exponentialRampToValueAtTime(.0001, t0 + .85);
      ob.connect(gb); gb.connect(masterGain); ob.start(t0); ob.stop(t0 + .9);
    }
    mi++;
  }, 360);
}

/* Locale-matched speech (v1 port) — listening never triggers selection. */
import { SPEECH_LOCALE, getLang } from '../core/i18n';
export function speak(text: string): void {
  try {
    if (!('speechSynthesis' in window)) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = SPEECH_LOCALE[getLang()] || 'tr-TR';
    u.rate = .85;
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  } catch { /* no speech support: silent */ }
}
