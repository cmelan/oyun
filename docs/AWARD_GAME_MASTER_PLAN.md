# Award game master plan

*Çok Kalpli Koruyucu* — transformation plan toward a Shipaton 2026 Best Game entry.
Written 2026-07-30 by the lead, from the audit in `docs/audit/FINDINGS.md` (111 findings)
and `docs/audit/LEVEL_MATRIX.md`. Baseline evidence: `docs/evidence/before/`.

---

## 0. The one-sentence diagnosis

The game already contains an award-quality vertical slice — and then repeats a
placeholder nine more times.

Level 1 has authored art, a bespoke chapter script, a cooperation finale and a
restoration payoff. Levels 2–10 share one skin, one creature, one boss silhouette,
one platform rhythm and one objective line. A judge who plays for two minutes sees
excellence; a judge who plays for six sees the seam. Closing that seam is the whole
job.

---

## 1. Decisions taken (and why)

These resolve genuine disagreements between the audit agents. Each is a decision,
not a survey.

### D1 · Biome identity is **procedural**, not authored. *(forced, and also correct)*

The art analyst ranked authored raster plates highest for raw fidelity and costed
them at ~63 plates across nine biomes (`F-…/upgrade ranking / authored assets`, XL).
The same analyst ranked *procedural* work highest on quality-per-unit-effort and
recommended completing it first.

**Decision: procedural, and no authored plates for biomes 2–10.**

Two reasons, one hard and one good:

- **Hard.** This agent cannot generate images. There is no path by which 63 painted
  plates come into existence from here. A plan that depends on them is a plan that
  does not ship.
- **Good.** The audit found the non-Meadow renderer is not merely unpainted, it is
  *unfinished*: five of fifteen `BiomePalette` fields are dead, including both cloud
  colours; the ambient-particle spec is fully authored and wired to nothing; the two
  parallax hill layers sit at 1.03–1.11:1 contrast against their own sky and are
  therefore invisible; and every biome's horizon is the same two rows of ellipses.
  There is a large amount of quality available before authored art is even the
  constraint.

The target is not "looks painted". It is **one coherent, deliberate, hand-drawn-
feeling visual system** where each biome is unmistakably itself. Meadow keeps its
authored plates; the raster path stays and is generalised, so authored art can be
dropped in later per biome with no code change.

**Consequence for the owner:** if painted plates for other biomes are wanted, that
is a human/commissioned step. The manifest built in M2 is the drop-in point.

### D2 · Fix what is broken before adding what is missing.

Two shipped defects outrank every content idea, and both are already fixed and
committed:

- **The free chapter could not be completed twice.** `prepLevel` pre-woke journal
  trees; Level 1's ending *is* waking the oak; so once a child learned `meşe` the
  Meadow had no card, no goal and no boss. A judge replaying the free chapter hit an
  unwinnable level. (`64168e8`)
- **Hints leaked across chapters.** A queue built in the Meadow kept playing over
  the next level. (`1bbe883`)

### D3 · Systems before content, and the same system must serve all ten levels.

Every per-level identity feature is built once, as data-driven infrastructure, and
then populated. No level gets a bespoke `if (idx === N)` branch. The existing
`idx === 0` Meadow special-casing is migrated onto the same system it introduces —
that migration is the proof the system is real.

### D4 · Wind belongs to Level 5, not Level 2.

The two design bands independently proposed a wind mechanic for Emerald Peaks (L2)
and Toros Highlands (L5). Highland plateau is wind's natural home and L5's proposal
is the stronger one (the boss is *shivering*, not attacking — the gusts are its
distress). L2 takes verticality instead: updrafts and one-way cloud platforms.

### D5 · Scope is cut to what can be finished to a polished standard.

The brief is explicit that a smaller set of completely polished features beats
unfinished sprawl. The MUST set below is a coherent, shippable, award-credible game
on its own. Everything else is marked and may be dropped without leaving a seam.

---

## 2. Rejected, and why

| Proposal | Verdict | Reason |
| --- | --- | --- |
| Authored raster plates for 9 biomes (~63 images) | **Rejected** | Cannot be produced by this agent; see D1. Manifest built so a human can add them later. |
| Engine migration (Phaser/Pixi) | **Rejected** | The 325-line engine is not the constraint. Migration risks the one thing that is already excellent (Meadow) to fix nothing that is actually broken. Brief forbids it absent proof. |
| Streaming audio assets for per-biome music | **Rejected** | Bundle is 137 kB today. Audio files would multiply it, add licensing records, and break offline-first. Per-biome identity is achievable in WebAudio via mode/timbre/ambience data. |
| Full `LevelScene.ts` decomposition into 6 modules | **Deferred** | The audit is right that it does six jobs, but a 1128-line rewrite risks game feel and the 84-test suite for zero player-visible gain. Extract only what a new system genuinely needs. |
| Per-level bespoke boss attack scripts | **Cut to SHOULD** | Distinct boss *silhouettes and restorations* deliver nearly all the perceived variety; distinct attack cadences deliver much less per unit of risk. |
| Colour-only power matching kept as-is | **Rejected** | Five eye colours are load-bearing for puzzle solving; red/green confusion is a functional block, not cosmetic. Powers gain a shape/glyph channel. |
| Portrait lockout kept as-is | **Kept for now** | Real accessibility problem (`F-…/portrait / one-handed`), but a portrait layout is a second UI. Recorded, not scheduled. |

---

## 3. Milestones

> **Status as of 2026-07-30.** MUST: 5 of 6 done (M2 outstanding). SHOULD/STRETCH:
> none started. An unplanned milestone was added — **traversal safety** — after an
> end-to-end playthrough harness found three defects that made nine of ten
> chapters unplayable. See `docs/AUTONOMOUS_PROGRESS.md`.

Dependency-ordered. Each states what is mechanically verifiable — a test name, a
build output, or a screenshot comparison — so "done" is never a judgement call.

### M0 · Baseline and shipped-defect repair — **MUST** — ✅ done

Baseline evidence harness (`npm run qa:levels`), before-shots for all 10 levels,
the two defects in D2.
*Verified:* `tests/completability.test.ts` (6), `tests/ui.test.ts` (5); 96 tests green;
browser replay of the free chapter reaches `ended: true`.

### M1 · Procedural biome scenery system — **MUST** — ✅ done (2 passes)

The single largest perceived-quality lever, and the foundation every later visual
milestone builds on.

*Create* `src/core/scenery.ts` (per-biome scenery data next to `BIOME`) and
`src/game/environment.ts` (the renderer).

A `SceneryProfile` carries: a celestial body with halo; haze band; cloud bands with
shape and parallax; **ridge layers rendered as deterministic value-noise silhouettes**
(`rolling`, `peaks`, `cliffs`, `dunes`, `canopy`, `spires`) instead of ellipses;
platform surface pattern; ground-cover dressing; a foreground fringe at parallax > 1;
and ambient particles — finally consuming the `ambientA`/`ambientB`/`ambientShape`
fields that have been authored and unused since the biomes were written.

Noise must be hash-based and camera-derived so silhouettes never shimmer or swim.

*Tests:* `tests/scenery.test.ts` — every biome has a profile; ridge sampling is
deterministic for a given world x; no NaN geometry across all ten biomes; contrast
ratio between each ridge layer and its sky exceeds the 1.11:1 the audit measured.
*Acceptance:* `npm run qa:levels` shows ten visually distinct horizons; before/after
screenshot pairs per biome.
*Budget:* ≤ 220 recorded ops/frame added; 60 fps retained.

### M2 · Biome art manifest — **MUST** — ⬜ not started

Removes the seven `biome === 'meadow'` literals from `draw()`; raster art becomes a
data lookup, so Meadow keeps its plates and any biome can gain them later without
touching the gameplay file.
*Tests:* Meadow renders byte-identically (op-count equality); a biome with no
manifest entry falls back to procedural.

### M3 · Creature roster — **MUST** — ✅ done

`src/core/creatures.ts`: a species registry supplying box, palette, behaviour,
silhouette drawing and restoration behaviour. `MonsterData.type` — a dead slot today,
read only to toggle patrol flipping — becomes a real `species` that reaches the
renderer. Each biome gets its own creature.
*Tests:* no two species share a silhouette signature; every level's species resolve;
`makeMonster` boxes come from the registry; the 40×40 default is preserved so
`tests/render.test.ts` keeps its meaning.

### M4 · Boss identity — **MUST** — ✅ done

Procedural distinct silhouettes per archetype within existing primitives. Splits
`BossData.kind` into `finisherKind` (what ✨ does) and `species` (what it looks like),
which today are the same two-valued field.
*Acceptance:* the final boss is no longer a rounded rectangle with two dots
(`docs/evidence/before/L10-3.png` is the before).

### M5 · Chapter script system — **MUST** — ✅ done

Per-level objective steps, openings and beats as data. Level 1's inline seven-branch
script migrates onto it unchanged — that migration is the acceptance test. Kills the
identical "Follow the glowing path" across nine levels.
*Tests:* ten distinct objective step-arrays; Meadow's step sequence identical to today.

### M6 · Audio identity — **MUST** — ✅ done

Per-biome mode/timbre/ambience data beside the palettes; crossfaded mood changes
instead of `mi = 0` hard cuts; AudioContext resume on every gesture (iOS suspends it);
the SFX gaps the audit found (footsteps, checkpoint, dead-press, power acquisition,
boss telegraph).

### M7 · Learning that transfers — **SHOULD** — ⬜ not started

The audit's sharpest finding: knowing a tree never helps you solve anything, every
species is quizzed exactly once, and the clue and the answer are drawn from the same
vector path (so it is picture-matching, not botany). Make recognition load-bearing in
at least one puzzle per region, and re-quiz across regions.

### M8 · Wordless play — **SHOULD** — ⬜ not started

Menu operable by a non-reader; hint bar spoken; objective bar legible at iPhone SE
size; powers gain a shape channel alongside colour.

### M9 · Per-level mechanics and surprises — **SHOULD / STRETCH** — ⬜ not started

Populate the M1–M6 systems with the identities in §4. Each level is independently
droppable; none is load-bearing for another.

### M10 · Submission polish — **STRETCH**, partly human-only — ⬜ not started

Store record, RevenueCat product, demo video, promo code, TestFlight. Marked
human-only in `docs/SHIPATON_2026.md`; no agent can perform these.

---

## 4. The ten identities

No two share a mechanic or a creature. Rows 1–6 come from the design auditors
(D4 applied to L2); rows 7–10 are the lead's, written after the audit run was cut
short.

| # | Chapter | Unique mechanic | Creature | Surprise | Restoration |
| --- | --- | --- | --- | --- | --- |
| 1 | Çayır Vadisi | A healed friend becomes a step you can stand on | Mossling | The dormant oak opens one eye early, and watches | Meadow blooms; oak wakes |
| 2 | Zümrüt Zirveler | Updrafts and one-way cloud platforms — rising, not pushing | Gust-chick, a fledgling that cannot land | The summit is silent: wind stops, mix drops, camera pulls back | Cloud cover parts; peaks catch light |
| 3 | Kristal Mağaralar | A light economy — carry the lantern or plant glow-seeds | Glimmer-newt, blind and unafraid of dark | The crystals resolve into fossilised trees | Planted seeds stay lit; cave becomes a grove |
| 4 | Kestane Korusu | Weight — husks drop, land as solids, and can be shoved | Curled One, indistinguishable from a husk until it blinks | A husk you have been pushing blinks | Canopy fills; the grove drops fruit, not spikes |
| 5 | Toros Yaylası | Wind as a telegraphed force you shelter from | Wind Lamb, blown along, unable to stop | The boss is not throwing — it is shivering | Gusts settle; cedars straighten |
| 6 | Meyve Bahçesi | Grafting — carry one blossom, match it to its tree | Sugarbird, dizzy on fermented windfall | Four beautiful trees; one is the Mimic, found by the level's own rule | Orchard fruits in sequence |
| 7 | Akdeniz Kıyısı | Tide — a slow water level that opens and closes routes | Shore-crab that mistakes your shadow for a gull | The tide reveals a path that was underwater all along | Shore greens; dry roots drink |
| 8 | Karadeniz Ormanı | Fog that thins only where something living breathes | Mist-deer, visible only as displaced fog | The fog was a sleeping creature's breath | Forest clears; the sleeper wakes gently |
| 9 | Göl Kenarı | Reflection — the mirrored lake shows what the bank hides | Reed-heron standing on one leg, startled by noise | Your own reflection solves a puzzle the bank cannot | Lake stills; reeds re-seed |
| 10 | Usta Bahçıvan | Every earlier mechanic returns, one per garden bed | The Mimic wearing each creature you have met | It imitates *you* | Every biome you restored appears in one garden |

---

## 5. Risks

| Risk | Mitigation |
| --- | --- |
| Procedural biomes read as "programmer art" | Single style guide reverse-engineered from Meadow's authored plates; before/after screenshot review per biome; Meadow is the fixed quality bar |
| Perf regression from richer scenery on iPhone SE | Op-count budget per milestone; `qa:levels` reports fps; culling added before scenery, not after |
| Refactor breaks the one excellent level | Meadow migrates onto every new system first; op-count equality test guards its rendering |
| Scope exceeds available capacity | MUST set is self-contained; SHOULD/STRETCH droppable without seams |
| **Account spend limit** | **Active blocker.** Multi-agent work is unavailable; see `docs/AUTONOMOUS_PROGRESS.md`. Owner decision required to restore it. |

---

## 6. What needs the owner

1. **Account spend limit** — hit 2026-07-30 mid-audit; killed 5 of 11 agents including
   all three research agents and the synthesis. Multi-agent execution is unavailable
   until raised.
2. **Authored art for biomes 2–10** — out of reach for this agent (D1). Commission or
   accept procedural.
3. **Shipaton 2026 rules verification** — the competition-research agent never ran, so
   `docs/SHIPATON_2026.md`'s account of the rules is **unverified** against the live
   pages. Confirm before relying on it.
4. **Store, RevenueCat product, video, promo code, TestFlight** — human-only.
