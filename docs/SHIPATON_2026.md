# Shipaton 2026 submission kit

This is the operational source of truth for the competition release. Target
categories, in priority order: **Best Game**, **RevenueCat Design Award**, and
**RevenueCat Peace Prize**. Do not dilute the pitch by targeting unrelated
categories.

## Eligibility gate

- Release a brand-new iOS or Android app between August 1 and September 30,
  2026, available in the United States.
- Configure the native RevenueCat SDK with bundle ID
  `com.cagatay.cokkalplikoruyucu` and at least one real in-app purchase.
- Publish the repository publicly, keep `LICENSE` visible, and verify a clean
  clone with `npm ci && npm test && npm run build`.
- Supply a public store URL, a public demo video under two minutes, the 1024px
  icon, and at least one frameless 1179×2556 screenshot.
- Offer a free trial or give judges a promo code that unlocks the full journey.
- Submit all copy, testing instructions, and video narration in English.

Official references: [rules](https://www.shipaton.com/rules),
[how Shipaton is judged](https://www.shipaton.com/blog/how-we-judge-shipaton),
and [2026 announcement](https://www.shipaton.com/blog/announcing-shipaton-2026).

## RevenueCat product contract

The monetization is intentionally legible and child-safe:

- Free: the complete, polished Meadow chapter. It has a beginning, empathy
  mechanic, cooperative helper, logic gate, and restoration ending.
- Purchase: one non-consumable lifetime unlock for the remaining journey.
- RevenueCat entitlement: `full_journey`.
- Suggested product ID: `com.cagatay.cokkalplikoruyucu.fulljourney`.
- Suggested offering: `default`, containing the lifetime package.
- No subscription, ads, artificial scarcity, energy system, or child-facing
  upsell. The native paywall is reached only through a grown-up check.
- The hosted web demo stays fully unlocked for judges and press.

Before an App Store build, copy `.env.example` to `.env.local` and replace the
placeholder with the RevenueCat **public Apple SDK key**. Never put a secret
RevenueCat API key in this repository.

## Two-minute demo script

Aim for 1:42–1:50, leaving margin for title and upload timing.

1. **0:00–0:12 · Identity.** Entrance screen. “A child sees a frightened
   world. A Guardian sees a world asking to be understood.” State the three
   target awards on screen: Best Game, Design, Peace.
2. **0:12–0:32 · Wordless onboarding.** Walk, meet the blocked stream, select
   the blue eye, and freeze a safe path. Let one musical response breathe.
3. **0:32–0:58 · Empathy loop.** Calm the Mossling with sand, then heal it.
   Show its posture, palette, face, and music change—explicitly say there are
   no enemies to defeat.
4. **0:58–1:20 · Cooperation and logic.** The healed Mossling follows, stands
   on its pressure stone, and opens the root gate. Explain that observation
   and trust, not combat, produce progress.
5. **1:20–1:38 · Emotional payoff.** Approach the ancient oak; show the full
   dormant-to-awakened crossfade, heart light, meadow motes, and musical bloom.
6. **1:38–1:50 · Product integrity.** Briefly show EN/DE, reduced motion,
   touch controls, Nature Journal, and the grown-up-gated lifetime unlock.

Record direct device footage in landscape. Avoid copyrighted music, device
frames, long logos, menus, or narration that repeats visible text.

## Ready-to-paste category answers

### Best Game

*Çok Kalpli Koruyucu* is a non-violent puzzle-platform adventure for children
aged 5–8. Its core verb is not attack but understand: observe the environment,
choose one of five nature abilities, calm a frightened creature, heal it, and
then cooperate with it to restore the Meadow. Every action changes animation,
colour, particles, and an adaptive musical layer, culminating in the ancient
oak remembering its heart. The free chapter is complete and replayable. A
single grown-up-gated lifetime purchase unlocks the wider journey, matching
the premium family-game genre without ads, subscriptions, or pressure loops.

### RevenueCat Design Award

Watch the first 30 seconds and the final 20 seconds of the Meadow chapter. The
entrance illustration establishes the ancient oak as the visual promise; the
level later returns to the same silhouette in dormant and awakened authored
states. Environmental depth, character poses, interaction reveals, camera
settling, particle restraint, and adaptive sound all make cause and effect
readable without text. The interface supports touch, keyboard, three languages,
safe areas, small landscape phones, and reduced motion while preserving one
cohesive warm, botanical identity.

### RevenueCat Peace Prize

The game teaches a small but concrete social idea: frightened behavior is not
the same as bad character. Children cannot defeat the Mossling. They must slow
down, calm it, offer care, and eventually trust it as the partner that opens
the path. Nature knowledge is reinforced through audio-first tree recognition
and a persistent journal. The design is feasible at family scale—offline-first,
readable before fluent literacy, localized in Turkish, English, and German—and
turns empathy into a practiced game system instead of a message pasted onto a
conventional combat loop.

## Media and store checklist

- Icon: `public/icons/icon-1024.png`.
- Frameless required image: `docs/submission/media/shipaton-1179x2556.png`.
- Supporting stills: `docs/submission/media/01-entrance.png` through
  `03-oak-awake.png`.
- Privacy URL after deployment: `https://oyun-xovq.onrender.com/privacy.html`.
- Regenerate media with `npm run submission:media` while Vite is running.
- App Store Connect privacy disclosure: Purchase History collected for app
  functionality; no tracking. RevenueCat uses an anonymous app user ID because
  the game has no account system.

## Human-owned final steps

1. Register the App ID and app record in App Store Connect.
2. Create the non-consumable product and RevenueCat entitlement/offering.
3. Add the public SDK key, run `npm run native:sync:ios`, and sandbox-test buy,
   cancel, restore, offline launch, and reinstall.
4. Select an Apple Development Team, archive, and upload to TestFlight.
5. Submit early after August 1, then issue at least one polish update before
   September 30.
6. Upload the public video and promo code, complete every targeted category
   answer, and verify all links from a signed-out US storefront session.
