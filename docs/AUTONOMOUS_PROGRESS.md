# Autonomous progress log

Resumable state for the award-quality transformation of *Çok Kalpli Koruyucu*.
Branch: `agent/award-game-transformation` (forked from `agent/meadow-visual-foundation`).

Newest entry at the top. Every entry records evidence, not intent.

---

## Baseline captured — 2026-07-29

**Repository state at fork point** (`3330301 fix: make progression recoverable across levels`)

| Check | Result |
| --- | --- |
| `npm test` | 84 passed / 7 files |
| `npm run build` | green — `dist/assets/index-*.js` 137.53 kB (gzip 46.88 kB) |
| `npm run typecheck` | green (part of build) |
| Console errors during a 10-level sweep | none |
| rAF frame rate, level 10, headless Chromium 960×540 | 60.0 fps |

**Visual/structural baseline** — all 10 levels captured at 4 camera positions each
plus menu and journey map. Screenshots and a machine-readable structural dump live
in the session scratchpad (`shots/L01-0.png` … `L10-3.png`, `level-report.json`);
they are the before-half of the required before/after evidence.

### What the baseline proves

1. **Level 1 (Çayır Vadisi) is genuinely award-quality.** Authored painted plates
   (far background, parallax treeline, three foreground foliage clusters, tiled soil
   + grass edge), a painted Guardian, a painted Mossling, a dormant→awake Ancient Oak
   crossfade, a bespoke 7-step objective bar, a cooperation finale and a restoration
   choreography.
2. **Levels 2–10 share one skin and one shape.** Flat colour palettes, procedural
   primitives, and — critically — *the same Mossling sprite is every creature in the
   game*, and *every boss is a rounded rectangle with two dots* (see `L10-3.png`: that
   is the final boss).
3. **Levels 4–10 are the same level.** All seven are one-line `makeSection()` recipes
   sharing `SECTION_RHYTHM` and a fixed `GAP`, so their platform layout is identical
   modulo total width.

### Bugs confirmed by observation (not yet fixed)

- **B-01 · Hint queue leaks across level changes.** `UI.showHint` queues messages and
  `LevelScene.create()` never drains them. Reproduced: three hints queued in level 1,
  then `startLevel(4)` — level 5 displays `LEVEL-ONE-HINT-A` immediately and
  `LEVEL-ONE-HINT-B` 3.4 s later. In real play this fires whenever a child restarts or
  advances while a hint is still on screen. `src/game/ui.ts:109-128`.
- **B-02 · Identical objective bar for nine of ten levels.** Levels 2–10 all render
  exactly `→ 🏖️ ✨ Follow the glowing path →`. `src/game/LevelScene.ts:262-266`.

### Not a bug, but recorded as architectural debt

- `LevelScene.solids()` pushes a hardcoded rect `{x:2640,y:188,w:34,h:164}` when
  `idx === 0`. It is correctly guarded (verified: absent at `idx = 4`), but it couples
  one level's geometry into shared collision code. `src/game/LevelScene.ts:182`.

### Status

- [x] Phase 1 — repository, build, test and gameplay baseline
- [ ] Phase 2 — audit matrix, design research, competition scorecard
- [ ] Phase 3 — master plan
- [ ] Phase 4+ — implementation milestones
