/* Soundscape regression.

   The score had three moods for ten biomes and every level was set to the same
   one, so only two were ever reachable in gameplay and the crystal cave sounded
   exactly like the orchard. These tests keep each biome sonically distinct and
   keep the mood table coherent. */
import { describe, it, expect } from 'vitest';
import { BIOME_SOUND, MOODS, soundFor, pitchAt, DEFAULT_SOUND, type Mood } from '../src/core/soundscape';
import { BIOME } from '../src/core/biomes';
import { WORLD } from '../src/core/world';

const ALL_MOODS = Object.keys(MOODS) as Mood[];

describe('per-biome sound', () => {
  it('every biome in the world has a soundscape', () => {
    for (const region of WORLD) {
      expect(BIOME_SOUND[region.biome], `no soundscape for "${region.biome}"`).toBeDefined();
    }
    expect(Object.keys(BIOME_SOUND).sort()).toEqual(Object.keys(BIOME).sort());
  });

  it('an unknown biome falls back rather than throwing', () => {
    expect(soundFor(undefined)).toBe(DEFAULT_SOUND);
    expect(soundFor('not-a-biome')).toBe(DEFAULT_SOUND);
  });

  it('no two biomes share a scale', () => {
    /* Same pitches = same music in a different colour, which is the thing this
       system exists to end. */
    const seen = new Map<string, string>();
    for (const [id, s] of Object.entries(BIOME_SOUND)) {
      const sig = s.scale.map(f => f.toFixed(2)).join(',');
      const clash = seen.get(sig);
      expect(clash, `${id} uses the same scale as ${clash}`).toBeUndefined();
      seen.set(sig, id);
    }
  });

  it('the roster spans several timbres and room sizes', () => {
    const timbres = new Set(Object.values(BIOME_SOUND).map(s => s.timbre));
    expect(timbres.size, 'every biome uses the same instrument').toBeGreaterThanOrEqual(4);
    const decays = Object.values(BIOME_SOUND).map(s => s.decay);
    expect(Math.max(...decays) / Math.min(...decays), 'every biome is the same size room')
      .toBeGreaterThan(1.8);
  });

  it('the cave is the darkest room and the coast the brightest', () => {
    /* A concrete identity check rather than a generic one. */
    const cave = BIOME_SOUND.cave, coast = BIOME_SOUND.coast;
    expect(cave.decay, 'the cave should ring longer than the coast').toBeGreaterThan(coast.decay);
    expect(cave.ambience.cut, 'the cave bed should be darker than the coast').toBeLessThan(coast.ambience.cut);
    expect(cave.scale[0], 'the cave should sit lower than the coast').toBeLessThan(coast.scale[0]);
  });

  it('every scale is seven ascending, audible pitches', () => {
    for (const [id, s] of Object.entries(BIOME_SOUND)) {
      expect(s.scale, `${id}`).toHaveLength(7);
      for (let i = 1; i < s.scale.length; i++) {
        expect(s.scale[i], `${id} scale is not ascending at ${i}`).toBeGreaterThan(s.scale[i - 1]);
      }
      expect(Math.min(...s.scale), `${id} has a sub-audible pitch`).toBeGreaterThan(80);
      expect(Math.max(...s.scale), `${id} has a piercing pitch`).toBeLessThan(2000);
    }
  });
});

describe('moods', () => {
  it('covers the states the game actually reaches', () => {
    for (const mood of ['menu', 'explore', 'discovery', 'tension', 'healing', 'restored', 'complete'] as Mood[]) {
      expect(MOODS[mood], `missing mood ${mood}`).toBeDefined();
    }
  });

  it('no two moods are the same shape', () => {
    const seen = new Map<string, string>();
    for (const mood of ALL_MOODS) {
      const m = MOODS[mood];
      const sig = `${m.phrase.join('')}/${m.bass.join('')}/${m.pace}/${m.octave}`;
      const clash = seen.get(sig);
      expect(clash, `${mood} is identical to ${clash}`).toBeUndefined();
      seen.set(sig, mood);
    }
  });

  it('tension is faster and lower than exploring; restoration is higher', () => {
    expect(MOODS.tension.pace).toBeLessThan(MOODS.explore.pace);
    expect(MOODS.tension.octave).toBeLessThan(MOODS.explore.octave);
    expect(MOODS.restored.octave).toBeGreaterThan(MOODS.explore.octave);
    expect(MOODS.restored.air).toBeGreaterThan(MOODS.explore.air);
  });

  it('every mood stays quiet enough for a child\'s device', () => {
    for (const mood of ALL_MOODS) {
      expect(MOODS[mood].air, `${mood} is too loud`).toBeLessThanOrEqual(0.06);
      expect(MOODS[mood].pace, `${mood} is frantic`).toBeGreaterThanOrEqual(280);
    }
  });
});

describe('pitch resolution', () => {
  it('wraps degrees into octaves instead of running off the scale', () => {
    const s = BIOME_SOUND.meadow;
    expect(pitchAt(s, 0)).toBeCloseTo(s.scale[0], 2);
    expect(pitchAt(s, 7)).toBeCloseTo(s.scale[0] * 2, 2);
    expect(pitchAt(s, -7)).toBeCloseTo(s.scale[0] / 2, 2);
    expect(pitchAt(s, 3, 1)).toBeCloseTo(s.scale[3] * 2, 2);
  });

  it('never produces a non-finite or inaudible pitch, for any mood or biome', () => {
    for (const sound of Object.values(BIOME_SOUND)) {
      for (const mood of ALL_MOODS) {
        const shape = MOODS[mood];
        for (const degree of [...shape.phrase, ...shape.bass]) {
          for (const oct of [shape.octave, shape.octave - 2]) {
            const f = pitchAt(sound, degree, oct);
            expect(Number.isFinite(f)).toBe(true);
            expect(f).toBeGreaterThan(20);
            expect(f).toBeLessThan(4000);
          }
        }
      }
    }
  });
});
