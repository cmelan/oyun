/* CREATURES — the roster.

   Until this existed there was exactly one creature in the game: the Meadow's
   painted Mossling, drawn unconditionally for every monster in every biome, so
   the same woodland animal appeared in a crystal cave and on a Mediterranean
   beach.

   A species owns how a creature LOOKS and how it MOVES. It deliberately does
   not own its collision box: every species keeps the proven 40x40 hitbox, so
   adding creature variety cannot change the difficulty of a single jump. The
   silhouette is drawn around that box at whatever size reads best.

   Every creature obeys the same emotional grammar, because that grammar is the
   game's whole thesis: angry is frightened, not evil; blind is calmed, not
   defeated; happy is restored, and a restored creature helps you. */

/** Which silhouette the renderer draws. One per biome, plus the boss forms. */
export type SilhouetteKind =
  | 'mossling'    /* meadow     — round, leaf-eared, fern tail */
  | 'gustchick'   /* peaks      — a fledgling that cannot land */
  | 'glimmernewt' /* cave       — blind, long and low, unafraid of dark */
  | 'curlone'     /* forest     — a chestnut husk that turns out to be alive */
  | 'windlamb'    /* toros      — cloud-wool, blown along, cannot stop */
  | 'sugarbird'   /* orchard    — dizzy on fermented windfall */
  | 'shorecrab'   /* coast      — mistakes your shadow for a gull */
  | 'mistdeer'    /* rainforest — visible only as displaced fog */
  | 'reedheron'   /* lakeside   — one-legged, startled by noise */
  | 'echoling';   /* mastery    — wears the shape of creatures you have met */

export type CreatureBehaviour = 'walker' | 'flipper' | 'hopper' | 'drifter';

export interface Species {
  id: string;
  silhouette: SilhouetteKind;
  /** Body colours for the three emotional states. */
  palette: { angry: number; blind: number; happy: number };
  /** Secondary colour — ears, fins, wool, shell markings. */
  accent: number;
  behaviour: CreatureBehaviour;
  /** Drawn silhouette size as a multiple of the 40x40 collision box. Visual
   *  only: it never reaches the hitbox. */
  visual: { w: number; h: number };
  /** Optional painted sprite. Only the Mossling has one. */
  art?: 'character.mossling';
}

export const SPECIES: Record<SilhouetteKind, Species> = {
  mossling: {
    id: 'mossling', silhouette: 'mossling', behaviour: 'walker',
    palette: { angry: 0xb87977, blind: 0x9e9aaa, happy: 0x70bd83 },
    accent: 0xd69a91, visual: { w: 1.0, h: 1.0 }, art: 'character.mossling',
  },
  gustchick: {
    id: 'gustchick', silhouette: 'gustchick', behaviour: 'drifter',
    palette: { angry: 0xd8cfa8, blind: 0xb8b6c0, happy: 0xa8dcc0 },
    accent: 0xf0e4bc, visual: { w: .72, h: 1.35 },
  },
  glimmernewt: {
    id: 'glimmernewt', silhouette: 'glimmernewt', behaviour: 'walker',
    palette: { angry: 0xd88ea8, blind: 0x9a93b0, happy: 0x8fd8ff },
    accent: 0xf0bcd0, visual: { w: 1.55, h: .62 },
  },
  curlone: {
    id: 'curlone', silhouette: 'curlone', behaviour: 'hopper',
    palette: { angry: 0x8a9a4a, blind: 0x9a9a8a, happy: 0xb5c25c },
    accent: 0x5e6b2c, visual: { w: 1.05, h: .95 },
  },
  windlamb: {
    id: 'windlamb', silhouette: 'windlamb', behaviour: 'walker',
    palette: { angry: 0xe0dcd0, blind: 0xc0bdc4, happy: 0xf2efe4 },
    accent: 0x8a7f6c, visual: { w: 1.3, h: .92 },
  },
  sugarbird: {
    id: 'sugarbird', silhouette: 'sugarbird', behaviour: 'flipper',
    palette: { angry: 0xd88a6a, blind: 0xb0a6a8, happy: 0xf0a8c0 },
    accent: 0xffd7e4, visual: { w: 1.0, h: 1.05 },
  },
  shorecrab: {
    id: 'shorecrab', silhouette: 'shorecrab', behaviour: 'flipper',
    palette: { angry: 0xd0705a, blind: 0xa8a0a0, happy: 0xf0a070 },
    accent: 0xf5c9a0, visual: { w: 1.35, h: .72 },
  },
  mistdeer: {
    id: 'mistdeer', silhouette: 'mistdeer', behaviour: 'walker',
    palette: { angry: 0x8fa898, blind: 0xa8b0ae, happy: 0xc4e4d0 },
    accent: 0x5f7a68, visual: { w: 1.0, h: 1.4 },
  },
  reedheron: {
    id: 'reedheron', silhouette: 'reedheron', behaviour: 'walker',
    palette: { angry: 0xbcc8d4, blind: 0xa8adb8, happy: 0xe4f0f8 },
    accent: 0x5f8a68, visual: { w: .78, h: 1.55 },
  },
  echoling: {
    id: 'echoling', silhouette: 'echoling', behaviour: 'flipper',
    palette: { angry: 0xa88ac8, blind: 0xa8a4b4, happy: 0xd8c48f },
    accent: 0xe8d9a8, visual: { w: 1.05, h: 1.05 },
  },
};

/** Each biome's native creature. This is what gives a level its own face
 *  without any per-level data entry. */
export const BIOME_SPECIES: Record<string, SilhouetteKind> = {
  meadow: 'mossling',
  peaks: 'gustchick',
  cave: 'glimmernewt',
  forest: 'curlone',
  toros: 'windlamb',
  orchard: 'sugarbird',
  coast: 'shorecrab',
  rainforest: 'mistdeer',
  lakeside: 'reedheron',
  mastery: 'echoling',
};

export function speciesFor(biome: string | undefined, override?: string): Species {
  if (override && override in SPECIES) return SPECIES[override as SilhouetteKind];
  const kind = (biome && BIOME_SPECIES[biome]) || 'mossling';
  return SPECIES[kind];
}
