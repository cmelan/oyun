# Çok Kalpli Koruyucu — Project Instructions
*Canonical doc as of repo migration. Supersedes every prior "Fundamentals" file —
those went stale (were still listing sand-limit/fullscreen as to-dos after both
shipped in v1). This file lives in the repo now; keep it in sync with `git log`,
not by re-pasting an old copy.*

> **v2 rebuild in progress (2026-07-06):** A modern Phaser 3 + TypeScript + Vite rebuild
> lives in `v2/`. It ports all logic below, adds B5–B10 (10 bölümler total, 26 species),
> real-photo card art (CC0 pipeline), new boss archetypes, clue tiers, and iOS via
> Capacitor. See `docs/REBUILD_PLAN.md`. This v1 file remains the canonical description of
> the *game design & ground rules*, which the rebuild preserves. The single-file game
> below (`game/cok-kalpli-koruyucu.html`) still runs and its tests still pass.

## The Game
- Non-violent puzzle-platformer for children ~5–8
- Five-eyed "Guardian" — colored eye powers solve environmental puzzles
- Never fights: blinds confused monsters with sand, then heals them → earns a heart
- Bilge Ağaçlar (Sleeping Trees): a parallel "healing by naming" loop — match a leaf
  to the right tree by picture+name (with 🔊 listen, no reading required) → tree wakes,
  name spoken in the active language, card added to Doğa Günlüğü
- Target languages: Turkish (primary, fully written), English/German (UI chrome +
  tree names done; descriptions/facts still TR-only, pending a dedicated translation pass).
  *Arabic was removed from v2 on 2026-07-11 by owner request (old `lang:'ar'` saves are
  coerced to `tr`); the frozen v1 archive below still carries its original 4-language tables.*
- Apple Arcade is an aspirational platform target (see Platform Decisions below)

## Ground Rules (non-negotiable)
- Empathy over combat, always. No dark patterns, no violence, minimal reading
- Quality over speed. Child playtest feedback overrides theory
- Every bölüm needs ≥3 tree challenges — structurally guaranteed by the generator, not a checklist
- Sections/bölümler unlock strictly by completing the previous one — no skips
- Decisive expert recommendations, one feature at a time
- **Concise, gradual delivery** — this is a standing user preference, not a per-session note

## Status (already shipped — do not re-do)
- Sand throw budget = monster count + 2, refills at checkpoints, badge shows remaining
- Fullscreen (⛶ button + auto-request on Yeni Oyun/Devam Et)
- 4 bölümler playable end-to-end (Çayır Vadisi, Zümrüt Zirveler, Kristal Mağaralar, Kestane Korusu)
- 13 tree species, each with a botanically-distinct vector leaf silhouette + bark texture,
  visually verified at real card size (not just "looks fine in isolation")
- A section **generator** (`makeSection`) that turns a ~10-line recipe into a full playable
  bölüm — platforms, puzzles, monsters, checkpoints, trees, boss — with tree/puzzle placement
  conflict-free by construction (alternating calm/puzzle platforms + fixed gap), not by
  post-hoc checking
- Reusable boss template (cage vs. shrink finisher, same engine, data-driven identity)
- 4-language tree names + locale-matched Web Speech playback + 🔊 listen buttons everywhere
  a name appears (choice cards, celebration, journal) — listening never triggers a selection
- `photo` slot on every TREES entry for real photos (base64 data-URL) — falls back to vector
  art if absent. **Decision made**: we do not embed web-sourced photos (licensing risk for
  commercial/Arcade distribution + file-size explosion against the offline single-file
  constraint at 20+ trees). Only the project owner's own/licensed photos go in this slot.
- Formal regression suite in `tests/` (see below) — replaces the "run an ad-hoc Node script in
  chat and eyeball the output" workflow used throughout early development.

## Architecture (`game/cok-kalpli-koruyucu.html`)
Single file, sectioned: CONFIG → ENGINE → ENTITIES → SYSTEMS → LEVELS → RENDER → UI → BOOT.

- **WORLD/region schema**: `WORLD=[{id,nameKey,biome,treeSet,levels}]`. Region owns biome +
  native tree set (geography is the single source of truth); `LEVELS`/`LEVEL_META` are
  flattened from it automatically. Adding a region = one object, no engine change.
- **Section generator**: `makeSection(recipe)` where recipe = `{name,biome,treeIds,tier,
  puzzleTypes,cageEye,finisher,hint}`. `SECTION_RHYTHM` + fixed `GAP=140` are the *proven*
  B1 platform/gap values — generated levels never produce an unfair/impossible jump.
  `PUZZLE_FACTORY` has one entry per `INTERACT_TYPES` key (freeze/thorn/grow/bridge/rock/
  mush/torch), each a `(x, groundY) → full data object` factory calibrated against the
  hand-built B1-3 levels' proportions.
- **INTERACT_TYPES registry**: `{solids,fx,draw}` per puzzle type. New puzzle type = new
  registry entry, no engine change.
- **Boss template**: `updateBoss`/`drawBoss` generic; identity from `L.boss` data
  (hp, cageEye, finisher, position/pacing). New boss = new data.
- **TREES registry**: `{name:{tr,en,de,ar}, family, desc, gift, fact, crown, photo?}`.
  Leaf silhouettes are `pathXLeaf(ctx,cx,cy,s)` canvas path functions — botanically shaped
  (not generic blobs), each visually verified via a Python/PIL pixel preview at the actual
  in-game card size (58px) before being committed, specifically checking that similarly-shaped
  species (e.g. cypress/birch/willow/olive were all "thin green blob" on the first pass) are
  actually distinguishable at a glance. **Keep doing this verification step for every new tree.**
- **Biome palettes** (`BIOME{}`): meadow, peaks, cave, forest — each with a 3-layer parallax
  background fn, a platform-style fn, and an ambient-particle look (leaves/wisps/motes).
- **Language**: `STR{tr,en,de,ar}` + `S(key)` (falls back to `tr` if a table is empty/missing
  a key — no UI string is ever blank). `lang` state drives `dir=rtl` for Arabic and
  `SPEECH_LOCALE` for Web Speech.
- **Save**: `localStorage` key `ckk2_save_v1`. `save.furthest` = unlock frontier (flat level
  index), `save.journal[]` = learned tree ids, `save.lang`/`save.muted` = prefs.

## Tests (`tests/`)
`npm test` runs `tests/smoke.test.js` — a dependency-free Node suite (DOM/canvas/localStorage/
speechSynthesis are stubbed in `tests/harness-helpers.js`, since the game expects a browser).
Covers: sand budget formula, sand→blind→heal→happy cycle, WORLD/LEVELS consistency, puzzle
auto-equip (incl. checking trees never hijack a puzzle zone), both boss finishers end-to-end,
all 13 tree icons generating without error, 4-language names + locale-matched speech, full
tree wake-and-journal-and-persist cycle, generator structural validity + zero tree/puzzle
conflict guarantee, a full generated-level playthrough (puzzles + trees + boss), map region
listing, language fallback, and a 30-frame render crash test across two biomes.
**Run this before and after every change.** Add a test when you add a feature — this suite
started as literally the ad-hoc scripts from chat sessions, consolidated; keep growing it that
way rather than reverting to eyeballing console output.

## Platform Decisions (discussed, not yet executed)
- **Repo migration**: happening now (this transfer). Reason: project outgrew single-file
  chat iteration — WORLD schema, generator, 13 trees, formal tests are real software, better
  served by git history + Claude Code locally than pasting whole files back and forth.
- **Engine**: staying on hand-rolled Canvas/vanilla JS for now. Phaser.js is the recommended
  next lever *if/when* graphics quality becomes the binding constraint (sprite/particle/
  lighting systems instead of hand-coded shapes) — not before further playtesting, since a
  rewrite now would outrun design validation.
- **Distribution**: Capacitor recommended for wrapping the web build into iOS/Android native
  shells (works with current stack or a future Phaser version) — near-zero code change, ships
  to both App Store and Play Store.
- **Apple Arcade caveat**: if Arcade specifically (not just App Store) stays a hard target,
  that program has historically expected a native engine, not a wrapped web app. Treat this as
  a separate, later decision — do not let it block current progress.

## Content Roadmap (agreed, not yet built)
- B5 · Toros Yaylası (peaks) — Toros Sediri, Ardıç, Sekoya
- B6 · Meyve Bahçesi (new warm orchard biome) — Elma, Kiraz, Ceviz
- B7 · Akdeniz Kıyısı (new coast biome) — Palmiye, İncir, Limon
- B8 · Usta Bahçıvan (mastery/replay) — all learned trees, harder clue tiers (bark-only →
  silhouette-only), spaced-repetition style
- Journal → botanical-family completion stars (meta-goal layer, not yet built)
- Flow-movement segments + hidden hearts (B1 ice-slide, B3 mushroom chain) — proposed early,
  deprioritized in favor of the tree-system work; still open
- Full EN/DE translation pass for tree descriptions/facts and any remaining literal-Turkish UI strings (AR dropped 2026-07-11)

## Working Agreement
- One feature at a time, gradual delivery, concise updates
- Child playtest feedback overrides design theory — always ask for it before batch-producing
  more content (e.g. don't generate B5-B8 before B4's generator output is playtested)
- When resuming work (in Claude Code or otherwise): read this file, then run `npm test` to
  confirm the baseline is green before making changes
