# Çok Kalpli Koruyucu v2 — Rebuild Plan
*Agreed 2026-07-06. Companion to PROJECT_INSTRUCTIONS.md (ground rules there still apply:
empathy over combat, minimal reading, playtest-gated batches, one feature at a time,
tests before/after every change).*

## Goal
Top-tier web game, iOS-ready via Capacitor. ≥10 bölümler. Real photos (leaf + trunk/bark
+ full tree) for every species — this **reverses** the earlier no-photos decision.
Consequences accepted:
- Single-file constraint is dropped → real build (Vite) with an asset pipeline.
- Photos come only from vetted public-domain/CC0 sources (Wikimedia Commons PD/CC0,
  USDA, etc.). Every image gets a license log entry in `assets/photos/LICENSES.md`.
  No scraped/unvetted web images, ever.

## Stack
- **TypeScript + Vite**, rendered on a **thin vanilla-Canvas engine**
  (`v2/src/game/engine.ts`). *Originally built on Phaser 3; Phaser was dropped
  2026-07-11 — the game used only its immediate-mode Graphics + camera, not
  sprites/physics, so a ~250-line engine replaced it. Bundle 1.5 MB → 89 KB
  (gzip 30 KB); `node_modules` shed ~115 MB. `src/core/` was already
  framework-free; only `engine.ts` (new), `LevelScene.ts` + `main.ts` changed.*
- **Capacitor** for iOS/Android wrap (App Store OK; Apple Arcade remains a separate,
  later decision — historically wants native engines).
- **Vitest** for the test suite — port `tests/smoke.test.js` coverage 1:1, keep growing it.

## What ports (the valuable IP)
- WORLD/region schema (region owns biome + native treeSet; levels flattened from it)
- `makeSection(recipe)` generator + SECTION_RHYTHM/GAP invariants (conflict-free by construction)
- TREES registry (add `photos: {leaf, bark, tree}` alongside existing fields)
- Boss template (data-driven identity, cage/shrink finishers)
- STR/S() + locale-matched Web Speech + fallback-to-TR guarantee (tr/en/de — Arabic removed 2026-07-11 by owner request)
- Save format (migrate `ckk2_save_v1` → v2 with an upgrade path, don't wipe progress)

## Recognition logic (deepened)
- Core loop unchanged: see leaf → pick tree → 🔊 name → tree wakes → Doğa Günlüğü
- Cards use **real photos** at ≥56px; legibility check at real card size stays mandatory
  (pixel-preview script, now on photo crops — similar species must be distinguishable)
- Difficulty tiers across 10 levels: leaf-photo match (B1–B4) → bark-only (B5–B7) →
  silhouette-only + spaced-repetition review (B8–B10)
- **Shipped 2026-07-11:** audio-first card flow (question auto-spoken, every tapped
  choice speaks its name, confetti + first-try streak chime, kind retry on wrong),
  tree/mimic cards unified into one component; adventure journey map hub (designer
  drop-in via `public/map/`, brief in `docs/design-pack/`); soft cave light halo +
  B3 render regression tests; mobile hardening (gesture-proofing, safe areas,
  portrait rotate overlay, device screenshot matrix); Arabic removed (owner request).
  Photo sourcing automated (`scripts/source-photos.mjs`) — fetching still needs a
  networked machine.

## Content: 10 bölümler
| # | Bölüm | Biome | Trees |
|---|-------|-------|-------|
| 1–4 | Port of B1–B4 | existing | existing 13 species |
| 5 | Toros Yaylası | peaks | Toros Sediri, Ardıç, Sekoya |
| 6 | Meyve Bahçesi | orchard (new) | Elma, Kiraz, Ceviz |
| 7 | Akdeniz Kıyısı | coast (new) | Palmiye, İncir, Limon |
| 8 | Karadeniz Ormanı | rainforest (new) | TBD (e.g. Kayın, Ladin, Fındık) |
| 9 | Göl Kenarı | lakeside (new) | TBD |
| 10 | Usta Bahçıvan | mastery | all learned trees, hard clue tiers |

## Engagement & Difficulty (v2 design review, 2026-07-06)
Problems identified in v1: bosses are one behavior with cosmetic differences (cageEye
color + finisher anim); `tier` only nudges numbers, never adds new demands; one fixed
SECTION_RHYTHM makes every level the same shape; journal is the only meta.

Fixes:
- **Boss archetypes** (mechanics, not skins; all non-violent; each boss = exam of its
  level's teaching):
  - *Fırlatıcı* (thrower) — current pace/telegraph/throw loop, B1–B2 only
  - *Taklitçi* (mimic) — hides among real trees; child uses tree recognition to find it
  - *Kalkanlı* (shield) — an arena puzzle must be solved before sand works
  - *Fırtına* (storm) — darkens arena; torch eye reveals safe ground
  - *Büyüyen* (grower) — arena platforms shift each phase
- **Difficulty axes**, ramped independently over 10 levels: platforming (static →
  moving/one-way → vertical), puzzles (single → two-step chains), monster variety,
  recognition tier (leaf photo → bark → silhouette → audio-only), sand budget tightening
- **Invisible assist mode** — repeated failure quietly widens timings/gaps; no labels
- **Level shape variety** — per-biome rhythm patterns (cave vertical, coast flowing),
  flow segments (ice-slide, mushroom bounce) as joy-injections, hidden hearts as
  optional exploration
- **Reward meta** — botanical-family stars, optional per-level goals (hidden heart,
  first-try tree wakes), scaled celebrations

## Charm targets
Animated Guardian sprite (idle blink, run, eye-glow), squash-and-stretch tweens,
particle celebrations on tree wake, per-biome ambient soundscape + gentle music,
parallax depth, touch-first controls sized for small hands.

## Phases (each gate = tests green; content gates = child playtest)
- **Phase 0 ✅** — Scaffold Vite+Phaser+TS; engine logic ported headless (WORLD, TREES,
  generator, save+migration, i18n); Vitest green.
- **Phase 1 ✅** — B1 Çayır Vadisi rebuilt in Phaser (movement, empathy loop, freeze
  puzzle, recognition cards, animated 5-eyed Guardian, particles, WebAudio + speech).
- **Phase 2 ✅** — B2–B4 ported (thorn/bridge/grow/rock/mush/torch puzzles, both boss
  finishers, 4 biomes).
- **Phase 3 ✅** — B5–B7 built (Toros Yaylası, Meyve Bahçesi, Akdeniz Kıyısı) + 3 new biomes.
- **Phase 4 ✅** — B8–B10 built + bark/silhouette clue tiers, Taklitçi (mimic) boss,
  invisible assist mode, journal family stars, B10 journal-driven mastery.
- **Phase 5 ✅ (config)** — Capacitor `capacitor.config.json` + `docs/IOS.md`. `npx cap add ios`
  runs on the Mac with Xcode.
- **Photos** — 9 CC0/PD sources vetted for B1 (leaf+bark+tree × meşe/çınar/ıhlamur);
  `scripts/fetch-photos.mjs` + `photo-manifest.json` + `public/photos/LICENSES.md`.
  Game uses vector art until `npm run fetch-photos` runs on the Mac, then swaps to
  photos automatically (no code change).

**⚠️ Playtest gates were consciously skipped per owner instruction (2026-07-06) to build
ahead.** Every biome/tree batch above is built but NOT yet child-validated. Before ship,
each still needs a real playtest; treat current content as "ready for testing," not "done."

## How to run
```
cd v2 && npm install
npm test          # 36 tests (logic + runtime smoke across all 10 levels)
npm run dev       # play in browser
npm run fetch-photos   # (optional) pull real CC0 photos — needs `npm i -D sharp` + network
npm run build && npx cap sync ios   # iOS
```

## Non-negotiables carried forward
- No violence, no dark patterns, minimal reading
- ≥2 tree challenges per bölüm, guaranteed by generator structure (relaxed from v1's ≥3 per owner decision 2026-07-06; generator's current floor of 3 stays until a recipe actually needs 2)
- Strict sequential unlock
- Add a test for every feature; never verify by eyeball alone
