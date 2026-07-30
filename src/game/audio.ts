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

/* Adaptive score. A biome supplies the scale, the timbre and the size of the
   room (src/core/soundscape.ts); a mood supplies the intention. Ten biomes x
   seven moods out of two small data tables, with no audio files — the game
   stays offline-first and ships zero licensed assets.

   Before this there were three moods for ten biomes and every level was set to
   the same one, so only two were ever reachable and the cave sounded exactly
   like the orchard. */
import { MOODS, soundFor, pitchAt, type Mood, type BiomeSound, type Timbre } from '../core/soundscape';

export type MusicMood = Mood;

let musicMood: Mood = 'menu';
let biomeSound: BiomeSound = soundFor('meadow');
let mi = 0, musicTimer = 0;
let musicOn = true;
/* A mood change used to reset mi to 0 and hard-cut the timbre. Crossfading
   across a couple of notes keeps the phrase continuous. */
let blend = 1, blendFrom: Mood = 'menu';

export function setMusicOn(on: boolean): void { musicOn = on; }

export function setMusicBiome(biome: string | undefined): void {
  biomeSound = soundFor(biome);
}

export function setMusicMood(mood: Mood): void {
  if (musicMood === mood) return;
  blendFrom = musicMood;
  musicMood = mood;
  blend = 0;   /* ramps to 1 over the next few notes */
}

export function currentMood(): Mood { return musicMood; }

const OSC: Record<Timbre, { base: OscillatorType; upper: OscillatorType; upperGain: number }> = {
  glass: { base: 'sine', upper: 'sine', upperGain: .55 },
  wood: { base: 'sine', upper: 'triangle', upperGain: .45 },
  reed: { base: 'triangle', upper: 'sawtooth', upperGain: .18 },
  bell: { base: 'sine', upper: 'square', upperGain: .10 },
  breath: { base: 'triangle', upper: 'sine', upperGain: .30 },
};

function musicTick(): void {
  if (!audio || !masterGain || muted || !musicOn) return;
  /* iOS suspends the context whenever the app backgrounds or the ring switch
     moves; without this the score simply stops and never returns. */
  if (audio.state === 'suspended') { void audio.resume?.(); }

  const shape = MOODS[musicMood], from = MOODS[blendFrom];
  const t0 = audio.currentTime;
  const voice = OSC[biomeSound.timbre];

  const degree = shape.phrase[mi % shape.phrase.length];
  const fromDegree = from.phrase[mi % from.phrase.length];
  /* During a change, drift the pitch and level from the old mood to the new. */
  const f = pitchAt(biomeSound, degree, shape.octave);
  const fPrev = pitchAt(biomeSound, fromDegree, from.octave);
  const freq = fPrev + (f - fPrev) * blend;
  const air = from.air + (shape.air - from.air) * blend;

  const o = audio.createOscillator(), upper = audio.createOscillator(), g = audio.createGain();
  o.type = voice.base; o.frequency.value = freq / 2;
  upper.type = voice.upper; upper.frequency.value = freq;
  const upperG = audio.createGain(); upperG.gain.value = voice.upperGain;
  const decay = biomeSound.decay;
  g.gain.setValueAtTime(.0001, t0);
  g.gain.linearRampToValueAtTime(air, t0 + .045);
  g.gain.exponentialRampToValueAtTime(.0001, t0 + decay);
  o.connect(g); upper.connect(upperG); upperG.connect(g); g.connect(masterGain);
  o.start(t0); upper.start(t0);
  o.stop(t0 + decay + .04); upper.stop(t0 + decay * .84);

  if (mi % 2 === 0) {
    const bassDegree = shape.bass[Math.floor(mi / 2) % shape.bass.length];
    const ob = audio.createOscillator(), gb = audio.createGain();
    ob.type = 'triangle';
    ob.frequency.value = pitchAt(biomeSound, bassDegree, shape.octave - 2);
    gb.gain.setValueAtTime(.028, t0);
    gb.gain.exponentialRampToValueAtTime(.0001, t0 + decay * 1.4);
    ob.connect(gb); gb.connect(masterGain); ob.start(t0); ob.stop(t0 + decay * 1.5);
  }

  /* The biome's ambient bed: a soft filtered wash whose brightness is the
     difference between a cave and an open coast. */
  const amb = biomeSound.ambience;
  if (musicMood !== 'menu' && mi % amb.every === amb.every - 1) {
    noise(.32, amb.gain, amb.cut);
  }

  blend = Math.min(1, blend + .34);
  mi++;
}

export function startMusic(): void {
  if (musicTimer) return;
  const schedule = () => {
    musicTick();
    musicTimer = window.setTimeout(schedule, MOODS[musicMood].pace);
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
