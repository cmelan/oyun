/* SOUNDSCAPE — per-biome sonic identity, as data.

   The score had three moods for ten biomes, and `startLevel` set every level to
   the same one, so only two were ever reachable in gameplay: the cave sounded
   exactly like the orchard. There was also no per-biome timbre of any kind —
   BIOME carries eleven colour fields and nothing about sound.

   Pure data, no WebAudio dependency, so it is testable headless. Frequencies
   are in Hz; the renderer transposes and voices them. */

/** What the music is doing right now. A mood is a musical intention, not a
 *  track: the same biome scale is re-voiced for each. */
export type Mood =
  | 'menu'        /* title: open, unhurried */
  | 'explore'     /* the default walking-around state */
  | 'discovery'   /* something has been noticed */
  | 'tension'     /* a frightened creature is near */
  | 'healing'     /* the empathy beat, the thesis of the game */
  | 'restored'    /* a chapter's payoff */
  | 'complete';   /* the chapter is finished */

export interface MoodShape {
  /** Scale degrees (indices into the biome's scale), looped. */
  phrase: number[];
  /** Bass degrees, one per two melody notes. */
  bass: number[];
  /** Milliseconds per note. */
  pace: number;
  /** Peak gain of a melody note. */
  air: number;
  /** Octave offset applied to the melody. */
  octave: number;
}

export const MOODS: Record<Mood, MoodShape> = {
  menu: { phrase: [0, 2, 3, 4, 2, 1], bass: [0, 2, 1], pace: 620, air: .025, octave: 0 },
  explore: { phrase: [0, 1, 2, 4, 2, 1, 3, 0], bass: [0, 1, 3, 1], pace: 430, air: .032, octave: 0 },
  discovery: { phrase: [2, 4, 5, 4, 2, 1], bass: [2, 0, 3], pace: 360, air: .038, octave: 1 },
  tension: { phrase: [0, 1, 0, 3, 1, 0], bass: [0, 0, 1], pace: 300, air: .030, octave: -1 },
  healing: { phrase: [0, 2, 4, 5, 4, 2], bass: [0, 3, 2], pace: 340, air: .040, octave: 1 },
  restored: { phrase: [0, 2, 4, 5, 6, 5, 4, 2], bass: [0, 2, 4, 2], pace: 330, air: .045, octave: 1 },
  complete: { phrase: [0, 2, 4, 6, 5, 4], bass: [0, 4, 2], pace: 300, air: .048, octave: 1 },
};

export type Timbre = 'glass' | 'wood' | 'reed' | 'bell' | 'breath';

export interface BiomeSound {
  /** Seven pitches. The first is the tonic; a mood indexes into these. */
  scale: number[];
  timbre: Timbre;
  /** Ambient bed: how often a soft noise wash plays, and how bright it is. */
  ambience: { every: number; cut: number; gain: number };
  /** Long decay reads as a large space. */
  decay: number;
}

/* Modes chosen so each region has an unmistakable colour:
   major-pentatonic reads open and safe; the lowered third reads cool and
   cavernous; the raised fourth reads bright and airy. */
export const BIOME_SOUND: Record<string, BiomeSound> = {
  /* C major pentatonic — warm, safe, home. */
  meadow: { scale: [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33], timbre: 'wood', ambience: { every: 8, cut: 2800, gain: .018 }, decay: .72 },
  /* D suspended, thin air, long decay. */
  peaks: { scale: [293.66, 329.63, 392.00, 440.00, 493.88, 587.33, 659.25], timbre: 'glass', ambience: { every: 6, cut: 4200, gain: .014 }, decay: 1.15 },
  /* A minor pentatonic, low and very long — a big dark room. */
  cave: { scale: [220.00, 261.63, 293.66, 329.63, 392.00, 440.00, 523.25], timbre: 'bell', ambience: { every: 5, cut: 900, gain: .022 }, decay: 1.6 },
  /* G mixolydian-ish, autumnal. */
  forest: { scale: [196.00, 220.00, 246.94, 293.66, 329.63, 392.00, 440.00], timbre: 'wood', ambience: { every: 7, cut: 1800, gain: .020 }, decay: .85 },
  /* A wide-open fourth-heavy set for the plateau. */
  toros: { scale: [246.94, 293.66, 329.63, 369.99, 440.00, 493.88, 587.33], timbre: 'reed', ambience: { every: 4, cut: 3600, gain: .026 }, decay: 1.25 },
  /* F major pentatonic, sweet and close. */
  orchard: { scale: [174.61, 196.00, 220.00, 261.63, 293.66, 349.23, 392.00], timbre: 'bell', ambience: { every: 9, cut: 2400, gain: .015 }, decay: .78 },
  /* Bright lydian fourth — hard Mediterranean light. */
  coast: { scale: [261.63, 293.66, 329.63, 369.99, 440.00, 493.88, 587.33], timbre: 'glass', ambience: { every: 5, cut: 5000, gain: .020 }, decay: .95 },
  /* Low, humid, close-miked. */
  rainforest: { scale: [164.81, 196.00, 220.00, 246.94, 293.66, 329.63, 392.00], timbre: 'breath', ambience: { every: 4, cut: 1200, gain: .026 }, decay: 1.05 },
  /* Still water: a clean pentatonic with a long tail. */
  lakeside: { scale: [233.08, 261.63, 311.13, 349.23, 392.00, 466.16, 523.25], timbre: 'glass', ambience: { every: 7, cut: 3000, gain: .016 }, decay: 1.35 },
  /* Everything learned, in golden light. */
  mastery: { scale: [293.66, 329.63, 369.99, 440.00, 493.88, 587.33, 659.25], timbre: 'wood', ambience: { every: 8, cut: 2600, gain: .018 }, decay: .9 },
};

export const DEFAULT_SOUND = BIOME_SOUND.meadow;
export function soundFor(biome: string | undefined): BiomeSound {
  return (biome && BIOME_SOUND[biome]) || DEFAULT_SOUND;
}

/** Resolve a mood's scale degree into a frequency for a biome. */
export function pitchAt(sound: BiomeSound, degree: number, octave = 0): number {
  const n = sound.scale.length;
  const wrapped = ((degree % n) + n) % n;
  const shift = Math.floor(degree / n) + octave;
  return sound.scale[wrapped] * Math.pow(2, shift);
}
