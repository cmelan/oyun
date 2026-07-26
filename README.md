# oyun-game

The current game is a TypeScript/Vite canvas application. It lives directly at
the repository root so local development and Render use the same build.

## Development

```bash
npm ci
npm test
npm run dev
```

## Production

```bash
npm run build
```

The production output is written to `dist/`. Render configuration is committed
in `render.yaml` and publishes that directory.

## Project layout

- `src/` — game and core logic
- `public/` — production art and photo assets
- `tests/` — Vitest regression suite
- `scripts/` — asset and screenshot utilities
- `docs/` — current design, deployment, and platform notes
- `archive/v1/` — frozen legacy single-file edition and its tests

The archived edition is kept for reference only. Do not use it for development
or deployment.
