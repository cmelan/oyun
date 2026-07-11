# Çok Kalpli Koruyucu — Designer Brief & Asset Pack

*Generated 2026-07-11. Regenerate screenshots any time with
`cd v2 && node scripts/design-pack-shots.mjs` (dev server running).*

## The game in one paragraph
A non-violent puzzle-platformer for children aged 5–8 (core audience 6–7,
pre-readers). The five-eyed **Guardian** never fights: it calms confused
monsters with sand and heals them with a love beam, and wakes Sleeping Wise
Trees by recognising their leaf/bark/silhouette. Tone: warm, soft, kind —
rounded shapes, no sharp danger, no dark patterns. Languages: TR (primary),
EN, DE. Ships to web + iOS/Android (Capacitor).

**Every current visual is drawn by code** — there are no source art files.
The `screens/` folder is the authoritative reference for how the game looks
today (18 shots: menu, journey map, all 10 biomes, all 3 quiz tiers, wake
card, journal, character close-up).

## What we need designed (phase 1 — the journey map)
The opening hub is an adventure map: a winding footpath through 10 zones,
one tappable node per region (see `screens/02-journey-map.jpg` for the
procedural placeholder that ships today).

| # | Deliverable | File to return | Size / format |
|---|-------------|----------------|---------------|
| 1 | Map background — one landscape illustration, 10 recognisable zones in journey order (below), path optional (we draw it if absent) | `bg.webp` | 2048×1152, WebP or layered source + flat export |
| 2 | Region node icons — one motif per region (its signature tree / landscape element), readable at 88px | `node_<regionId>.webp` ×10 | 256×256, transparent background |
| 3 | *(optional)* Path texture, star, padlock, cloud sprites | `path.webp`, `star.webp`, `lock.webp`, `cloud.webp` | 256px, transparent |

**Drop-in contract (zero code changes):** files placed in `v2/public/map/`
are picked up automatically — `bg.webp` covers the procedural backdrop,
`node_<regionId>.webp` replaces that node's icon. Keep the safe margins below.

### The 10 regions, in journey order
| regionId | Name | Biome / mood | Key colours (sky-mid · grass) |
|----------|------|--------------|-------------------------------|
| cayir | Çayır Vadisi | spring meadow valley | `#8fdcca` · `#5fc77f` |
| zirveler | Zümrüt Zirveler | airy emerald peaks, snowy grass | `#a9e6dc` · `#eef7f5` |
| magara | Kristal Mağaralar | dark crystal cave, glowing motes | `#1c1733` · `#4a4470` |
| kestane | Kestane Korusu | golden autumn chestnut grove | `#f0c68a` · `#b5772f` |
| toros | Toros Yaylası | high cedar plateau, thin bright air, snow | `#bfe2ef` · `#8fae7a` |
| meyve | Meyve Bahçesi | warm orchard, blossom pinks, honey light | `#ffd9b0` · `#7cc257` |
| akdeniz | Akdeniz Kıyısı | turquoise Mediterranean coast, sandy soil | `#9fe4f0` · `#e8d9a8` |
| karadeniz | Karadeniz Ormanı | deep misty rainforest | `#9cc4a8` · `#4f8a5c` |
| gol | Göl Kenarı | still lakeside blues, reeds | `#aed4ec` · `#74b268` |
| usta | Usta Bahçıvan | golden-hour mastery garden | `#ffe2a8` · `#a8c25f` |

Full 12-colour palette per biome lives in `v2/src/core/biomes.ts` (hex,
commented) — treat those as the canonical colour world.

### UI palette (chrome & cards)
| Use | Hex |
|-----|-----|
| Card / cream surfaces | `#fff7ec` |
| Primary text (deep teal) | `#1f4d4a` |
| Secondary text | `#37635f` |
| Primary button (warm orange) | `#ffb27a` (shadow `#d98a52`, text `#5a2c12`) |
| Accent / listen button (sun yellow) | `#ffd54a` (text `#5a4400`) |
| Success green | `#5fc77f` |
| Page backdrop (letterbox) | `#0f2b29` |

### Character (for reference, not redesign in phase 1)
See `screens/18-character-and-icons.jpg`. Guardian: saturated purple rounded
body `#7a52c8`, outline `#3a2470`, head sheen `#9a78e0`, five eyes (blue
`#3fa9f5`, red `#ff6b4a`, green `#54c97a`, yellow `#ffcc3a`, purple `#b07ad8`),
pink smile `#ffb3c8`. Eye colours are gameplay-meaningful (they match the five
puzzle powers) — never recolour them.

## Technical constraints
- Design canvas 960×540 (16:9), scaled with letterboxing to any screen; the
  map is composed in that frame, so keep all 10 node areas inside a 5% safe
  margin and don't put anything essential in the outer 5%.
- Node tap targets are 88px wide at design size — icons must read at that size
  (we check everything at real size; see `v2/scripts/legibility-sheet.mjs`).
- Audience is pre-readers: meaning must come from picture + colour, never text.
- Files: WebP preferred (or PNG); keep bg ≤ 400 KB if possible (offline game).
- **Licensing: original work or fully licensed for commercial + App Store
  distribution; no stock/AI-sourced elements with unclear rights.**

## Node states the design must survive
Each node is shown in three states (we apply these programmatically):
**done** (⭐ badge), **next** (pulsing warm glow, Guardian avatar standing on
it), **locked** (greyscale + 🔒). Icons should stay readable when greyscaled.
