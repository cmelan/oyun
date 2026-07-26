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
  | 'heal' | 'thud' | 'cage' | 'bosshurt' | 'hurt' | 'clear' | 'win' | 'sad' | 'wake' | 'land' | 'hmm' | 'streak';

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
    /* quiz feedback: kind, never harsh */
    case 'hmm': beep(330, .18, 'sine', .16, 290); break;              /* gentle "try again" */
    case 'streak': seq([784, 988, 1319, 1568], .22, 70, 'sine', .2); break; /* first-try streak sparkle */
  }
}

/* Adaptive pentatonic score. The same five-note identity is reharmonised across
   menu → exploration → restoration, so actions feel like part of one world. */
export type MusicMood = 'menu' | 'meadow' | 'restored';
const SCORE: Record<MusicMood, { melody: number[]; bass: number[]; pace: number; air: number }> = {
  menu: { melody: [392, 523.25, 587.33, 659.25, 523.25, 440], bass: [98, 130.81, 110], pace: 620, air: .025 },
  meadow: { melody: [523.25, 587.33, 659.25, 783.99, 659.25, 587.33, 440, 523.25], bass: [130.81, 146.83, 110, 130.81], pace: 430, air: .035 },
  restored: { melody: [523.25, 659.25, 783.99, 880, 1046.5, 880, 783.99, 659.25], bass: [130.81, 164.81, 196, 164.81], pace: 330, air: .045 },
};
let musicMood: MusicMood = 'menu';
let mi = 0, musicTimer = 0;
let musicOn = true;
export function setMusicOn(on: boolean): void { musicOn = on; }
export function setMusicMood(mood: MusicMood): void { if (musicMood !== mood) { musicMood = mood; mi = 0; } }
function musicTick(): void {
  if (!audio || !masterGain || muted || !musicOn) return;
  const score = SCORE[musicMood], t0 = audio.currentTime;
  const f = score.melody[mi % score.melody.length];
  /* Soft glass-and-wood pairing: a round fundamental with a quiet harmonic. */
  const o = audio.createOscillator(), shimmer = audio.createOscillator(), g = audio.createGain();
  o.type = 'sine'; o.frequency.value = f / 2;
  shimmer.type = 'triangle'; shimmer.frequency.value = f;
  g.gain.setValueAtTime(.0001, t0); g.gain.linearRampToValueAtTime(score.air, t0 + .045);
  g.gain.exponentialRampToValueAtTime(.0001, t0 + .72);
  o.connect(g); shimmer.connect(g); g.connect(masterGain); o.start(t0); shimmer.start(t0);
  o.stop(t0 + .76); shimmer.stop(t0 + .6);
  if (mi % 2 === 0) {
    const ob = audio.createOscillator(), gb = audio.createGain();
    ob.type = 'triangle'; ob.frequency.value = score.bass[Math.floor(mi / 2) % score.bass.length];
    gb.gain.setValueAtTime(.028, t0); gb.gain.exponentialRampToValueAtTime(.0001, t0 + 1.05);
    ob.connect(gb); gb.connect(masterGain); ob.start(t0); ob.stop(t0 + 1.1);
  }
  if (musicMood !== 'menu' && mi % 8 === 5) noise(.32, .018, 2800); /* distant leaf hush */
  mi++;
}
export function startMusic(): void {
  if (musicTimer) return;
  const schedule = () => {
    musicTick();
    musicTimer = window.setTimeout(schedule, SCORE[musicMood].pace);
  };
  schedule();
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
