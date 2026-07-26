# Development Agent Prompt — Meadow Vertical Slice

You are continuing **oyun-game**, a non-violent puzzle-platformer
for children aged 5–8.

## Start here

1. Read `docs/PROJECT_INSTRUCTIONS.md`, `docs/REBUILD_PLAN.md`, and
   `docs/MEADOW_VISUAL_SYSTEM.md` completely.
2. Run `npm test && npm run build` from the repository root.
3. Report any pre-existing failure before changing code.

## Current state

- Core gameplay, physics, puzzles, saves and tests are working.
- `src/game/engine.ts` now supports raster draws, tiled image fills and
  horizontal tiled sprites.
- `src/game/assets.ts` preloads Meadow art with failure-safe fallbacks.
- Level 1 uses the raster far background, soil tile and grass edge.
- Every other biome remains on the procedural renderer.
- Do not migrate to Phaser, PixiJS or another engine in this task.

## Goal

Turn Level 1 into a polished five-minute vertical slice while preserving all
game rules. The target experience is:

1. The Guardian enters a quiet meadow.
2. Blue power freezes the stream.
3. Green power grows roots that stabilize the bridge.
4. A confused creature is healed and becomes a helper.
5. The helper activates a pressure stone.
6. A tree-recognition card wakes the ancient oak.
7. The meadow visibly changes from quiet to restored.

The level must remain non-violent, readable by pre-readers, and playable with
the existing four action buttons.

## Implementation order

### 1. Renderer structure

- Keep `src/core/` framework-free.
- Move visual-only LevelScene code toward small render helpers rather than
  adding more gameplay state to `engine.ts`.
- Add spritesheet frame drawing only when the first real spritesheet exists.
- Preserve procedural fallbacks in tests and when an asset fails to load.

### 2. Environment

- Add the midground and foreground assets defined in
  `MEADOW_VISUAL_SYSTEM.md`.
- Use 3–4 depth bands: far, mid, gameplay, foreground.
- Decorative art must never change collision.
- Avoid excessive glow, blur or particles; target stable 60 FPS.

### 3. Stateful puzzle art

- Give water, ice and roots visually distinct before/after states.
- Make cause and effect readable without instructional text.
- Persist restored visual state when the level is revisited.

### 4. Characters

- Add Guardian sprite animation without changing its collision box.
- Preserve all five eye colours exactly.
- A healed creature must visibly change posture and expression, then perform
  one helpful action.

### 5. Restoration moment

- Implement a short, skippable awakening sequence using camera ease, colour
  interpolation, restrained particles and layered audio.
- Never block controls for more than necessary.
- Respect muted state and invisible assist mode.

## Acceptance criteria

- `npm test` and `npm run build` pass.
- Add tests for every new state transition and asset invariant.
- Missing or failed images leave the procedural game playable.
- No existing biome changes visually.
- Level 1 maintains 60 FPS at 960×540 and on the smallest device profile.
- All tap targets remain at least their current size.
- Produce before/after screenshots at identical camera positions.
- Report exact assets, code files, bundle-size change and remaining risks.

Work one feature at a time. Stop after the Meadow vertical slice is verified;
do not batch-generate the remaining biomes.
