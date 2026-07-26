# Çok Kalpli Koruyucu

> A child sees a frightened world. A Guardian sees a world asking to be
> understood.

A non-violent nature puzzle-platformer for ages 5–8, built for Shipaton 2026.
The award slice is a complete Meadow story: observe, calm, heal, cooperate, and
restore an ancient oak. [Play the live build](https://oyun-xovq.onrender.com/).

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
in `render.yaml` and publishes that directory. The `npm start` command also
serves the production build for compatibility with an existing Render web
service.

## iOS and RevenueCat

The native shell is committed under `ios/`. The free Meadow chapter remains
complete; native builds use RevenueCat for one grown-up-gated, non-consumable
`full_journey` unlock. Configure the public SDK key from `.env.example`, then:

```bash
npm run native:sync:ios
npx cap open ios
```

See [docs/SHIPATON_2026.md](docs/SHIPATON_2026.md) for the exact store,
monetization, media, judging, and release checklist.

## Project layout

- `src/` — game and core logic
- `public/` — production art and photo assets
- `tests/` — Vitest regression suite
- `scripts/` — asset and screenshot utilities
- `docs/` — current design, deployment, and platform notes
- `ios/` — Capacitor iOS 15+ shell with RevenueCat plugins
- `archive/v1/` — frozen legacy single-file edition and its tests

The archived edition is kept for reference only. Do not use it for development
or deployment.

## License

MIT. See [LICENSE](LICENSE).
