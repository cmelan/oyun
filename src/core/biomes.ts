/* Biome palettes — v1's four ported verbatim, six new for B5–B10.
   Each biome: sky gradient, parallax hills, platform soil/grass, ambient particle look. */
export interface BiomePalette {
  skyTop: string; skyMid: string; skyBot: string;
  cloudFar: string; cloudNear: string;
  hillsFar: string; hillsMid: string; bushes: string;
  soil: string; soilDark: string; grass: string; grassLight: string;
  ambientA: string; ambientB: string; ambientShape: 'leaf' | 'wisp' | 'mote' | 'petal' | 'snow';
  dark?: boolean;
}

export const BIOME: Record<string, BiomePalette> = {
  meadow: {
    skyTop: '#daf4e4', skyMid: '#8fdcca', skyBot: '#55c0ba',
    cloudFar: 'rgba(255,255,255,.5)', cloudNear: 'rgba(255,255,255,.66)',
    hillsFar: '#abe0d0', hillsMid: '#7ccfad', bushes: '#5abd8c',
    soil: '#9a6b43', soilDark: '#85593a', grass: '#5fc77f', grassLight: '#74d692',
    ambientA: '#8fdc9b', ambientB: '#ffd9a6', ambientShape: 'leaf',
  },
  peaks: {
    skyTop: '#dff6f0', skyMid: '#a9e6dc', skyBot: '#4fb3ad',
    cloudFar: 'rgba(255,255,255,.55)', cloudNear: 'rgba(255,255,255,.7)',
    hillsFar: '#bfe9e2', hillsMid: '#8fd0c6', bushes: '#3f8c7e',
    soil: '#6b7a78', soilDark: '#57645f', grass: '#eef7f5', grassLight: '#ffffff',
    ambientA: '#eaf7ff', ambientB: '#cfeeff', ambientShape: 'wisp',
  },
  cave: {
    skyTop: '#241d3a', skyMid: '#1c1733', skyBot: '#0e0b1e',
    cloudFar: 'rgba(111,208,255,.4)', cloudNear: 'rgba(181,140,240,.4)',
    hillsFar: '#2a2242', hillsMid: '#201936', bushes: '#160f2a',
    soil: '#3c365a', soilDark: '#2a2440', grass: '#4a4470', grassLight: '#5d5688',
    ambientA: '#8fd8ff', ambientB: '#cbb0f5', ambientShape: 'mote', dark: true,
  },
  forest: {
    skyTop: '#fbe8c8', skyMid: '#f0c68a', skyBot: '#d99a5c',
    cloudFar: 'rgba(255,244,222,.55)', cloudNear: 'rgba(255,238,205,.7)',
    hillsFar: '#e0a866', hillsMid: '#c9863f', bushes: '#a5672e',
    soil: '#6b4a30', soilDark: '#573a25', grass: '#b5772f', grassLight: '#d99a4a',
    ambientA: '#e8b25a', ambientB: '#c96b3a', ambientShape: 'leaf',
  },
  /* --- v2 biomes --- */
  toros: { /* high plateau: thin bright air, cedar greens, snow motes */
    skyTop: '#eef8ff', skyMid: '#bfe2ef', skyBot: '#7cb8c4',
    cloudFar: 'rgba(255,255,255,.6)', cloudNear: 'rgba(255,255,255,.75)',
    hillsFar: '#cfe4e8', hillsMid: '#9cc4bd', bushes: '#4f7a62',
    soil: '#7a6a58', soilDark: '#645648', grass: '#8fae7a', grassLight: '#aac592',
    ambientA: '#ffffff', ambientB: '#dff0f5', ambientShape: 'snow',
  },
  orchard: { /* warm orchard: blossom pinks, honey light, petals */
    skyTop: '#fff3e0', skyMid: '#ffd9b0', skyBot: '#f0a87a',
    cloudFar: 'rgba(255,250,240,.6)', cloudNear: 'rgba(255,245,230,.75)',
    hillsFar: '#f5cf9e', hillsMid: '#dba368', bushes: '#8faf5c',
    soil: '#8a5f3a', soilDark: '#744e2f', grass: '#7cc257', grassLight: '#98d675',
    ambientA: '#ffd7e4', ambientB: '#fff0f4', ambientShape: 'petal',
  },
  coast: { /* Mediterranean: turquoise sea sky, sandy soil, bright */
    skyTop: '#e8fbff', skyMid: '#9fe4f0', skyBot: '#3fb8d0',
    cloudFar: 'rgba(255,255,255,.55)', cloudNear: 'rgba(255,255,255,.7)',
    hillsFar: '#bfeaf0', hillsMid: '#7ccfd8', bushes: '#5aa87c',
    soil: '#d9b98a', soilDark: '#c2a271', grass: '#e8d9a8', grassLight: '#f5ecc4',
    ambientA: '#ffffff', ambientB: '#cef4ff', ambientShape: 'wisp',
  },
  rainforest: { /* Karadeniz: deep greens, mist, humid dusk */
    skyTop: '#dceee2', skyMid: '#9cc4a8', skyBot: '#5c8a6a',
    cloudFar: 'rgba(240,250,244,.6)', cloudNear: 'rgba(240,250,244,.75)',
    hillsFar: '#a8c9b2', hillsMid: '#6f9a7c', bushes: '#3f6a4c',
    soil: '#5c4a35', soilDark: '#4a3b2a', grass: '#4f8a5c', grassLight: '#63a870',
    ambientA: '#e8f5ec', ambientB: '#cfe8d8', ambientShape: 'wisp',
  },
  lakeside: { /* still water blues, reeds, dragonfly light */
    skyTop: '#e4f2fb', skyMid: '#aed4ec', skyBot: '#6da8cc',
    cloudFar: 'rgba(255,255,255,.55)', cloudNear: 'rgba(255,255,255,.7)',
    hillsFar: '#c2dcea', hillsMid: '#8fb8d0', bushes: '#5f8a68',
    soil: '#6f5f45', soilDark: '#5c4e38', grass: '#74b268', grassLight: '#8fc982',
    ambientA: '#dff2ff', ambientB: '#bfe4f5', ambientShape: 'mote',
  },
  mastery: { /* golden hour of everything learned */
    skyTop: '#fff7dc', skyMid: '#ffe2a8', skyBot: '#e8ae6a',
    cloudFar: 'rgba(255,250,235,.6)', cloudNear: 'rgba(255,246,222,.75)',
    hillsFar: '#f5d9a2', hillsMid: '#d9b371', bushes: '#8f9a5c',
    soil: '#8a6a43', soilDark: '#745837', grass: '#a8c25f', grassLight: '#c2d67c',
    ambientA: '#ffe9a8', ambientB: '#fff6d0', ambientShape: 'leaf',
  },
};
