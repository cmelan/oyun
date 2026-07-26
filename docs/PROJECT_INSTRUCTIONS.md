# oyun-game — Project Instructions

The active game is the TypeScript/Vite application at the repository root.
There is no nested application directory.

## Working rules

- Preserve the non-violent, empathy-first design for children aged roughly 5–8.
- Keep Turkish as the primary language, with English and German support.
- Keep sequential level unlocking and the tree-recognition learning loop.
- Add or update regression coverage with every behavior change.
- Run `npm test` and `npm run build` before deployment.
- Treat `archive/v1/` as read-only historical reference; never deploy from it.

## Architecture

- `src/core/` contains data, generation, localization, progression, and save logic.
- `src/game/` contains the canvas engine, scene, UI, audio, and rendering code.
- `public/` contains runtime assets copied into the production build.
- `tests/` contains the Vitest logic, scene, asset, engine, and render suites.

The rebuild history and design roadmap are documented in `docs/REBUILD_PLAN.md`.
The active Meadow rendering contract is documented in
`docs/MEADOW_VISUAL_SYSTEM.md`.

## Commands

```bash
npm ci
npm test
npm run build
npm run dev
```

Render must use the repository root, run `npm ci && npm run build`, and publish
`dist`. The matching Blueprint is `render.yaml`.
