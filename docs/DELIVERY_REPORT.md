# Delivery report

Branch `agent/award-game-transformation`, 19 commits on top of `3330301`.
Sessions of 2026-07-29 and 2026-07-30.

**This is not a finished transformation.** It is five of six MUST milestones, six
real defects fixed, and a test suite that more than doubled. What is missing is
listed in §6 and is substantial.

---

## 1. Headline numbers

| | before | after |
| --- | --- | --- |
| Tests | 84 | **180** |
| Test files | 7 | **15** |
| Distinct objective bars across 10 chapters | 2 | **10** |
| Creatures in the whole game | 1 | **10** |
| Boss silhouettes | 1 rounded rectangle | **2 purpose-drawn archetypes** |
| Biome horizons | 1 shape in 10 colours | **10 distinct** |
| Biome soundscapes | 3 moods, 2 reachable | **10 scales × 7 moods** |
| Widest generated gap | 170px (of ~198px reach) | **140px** |
| Last checkpoint in generated levels | ~48% through | **at the arena door** |
| Bundle | 137.5 kB / 46.9 kB gzip | 176.6 kB / 58.7 kB gzip |
| Frame rate (headless, widest level) | 60 | **60** |
| Console errors over a 10-level sweep | 0 | **0** |

Evidence: `docs/evidence/before/` and `docs/evidence/after/`, both produced by
`npm run qa:levels`. Summary table in `docs/evidence/README.md`.

---

## 2. Defects found and fixed

Ordered by how much damage each was doing.

1. **The free chapter could not be completed twice.** `prepLevel` pre-woke any
   tree in the journal, and Level 1's ending *is* waking the Ancient Oak. Once a
   child learned `meşe`, the Meadow had no card to open, no goal and no boss —
   nothing that could end it. Reached by playing the free chapter twice, which is
   exactly what a competition judge does. Fixed with an explicit `finale` flag,
   which also retired the `x > 2800` positional sentinel that caused it.

2. **Creatures stood on jump landing zones.** Generated patrols ran from
   `p.x + 16` with `lo = p.x - 14`, so a frightened creature could stand exactly
   where an incoming jump lands. The child crossed the gap, touched it on
   touchdown, was knocked back into the pit, and lost the chapter to three deaths
   in eight seconds. **This is why nine of ten chapters were unplayable.** Fixed
   with a 96px landing zone in the generator plus seven hand-authored patrols.

3. **The invisible assist could never fire.** It started at `deaths - 2`; with
   three hearts the third death *is* the game over, and the retry rebuilt the
   scene with the count reset to zero. It has never helped anybody. Now starts
   after one heart and accumulates across retries of the same chapter.

4. **Gaps widened with tier toward the physical limit.** `GAP + min(30, tier*6)`
   reached 170px against a full-speed perfect jump of ~198px — about a tenth of a
   second of timing margin, on the one axis a five-year-old cannot improve at.

5. **Hints leaked across chapters.** A queue built in the Meadow kept playing over
   the next level: "go back to the frightened creature" in a chapter with no
   frightened creature.

6. **No checkpoint in the back half of generated levels.** Losing to the boss
   rewound the child through half the chapter.

Also tuned: coyote time and jump buffering moved from the adult precision-platformer
band (0.10 / 0.13) to the casual/touch band (0.16 / 0.17), after playthroughs showed
pits as the overwhelming cause of lost hearts.

---

## 3. What was built

| Milestone | Module | Test file |
| --- | --- | --- |
| M1 Procedural biome scenery | `src/core/scenery.ts`, `src/game/environment.ts` | `scenery.test.ts` (14) |
| M3 Creature roster | `src/core/creatures.ts`, `src/game/creatureArt.ts` | `creatures.test.ts` (12) |
| M4 Boss identity | `src/game/bossArt.ts` | `boss.test.ts` (6) |
| M5 Chapter scripts | `src/core/chapters.ts` | `chapters.test.ts` (14) |
| M6 Audio identity | `src/core/soundscape.ts` | `soundscape.test.ts` (12) |
| Traversal safety | `src/core/generator.ts` | `traversal.test.ts` (18) |
| Completability | `src/core/world.ts` | `completability.test.ts` (6) |

Every system is data-driven, and Level 1 — the one chapter that was already
award-quality — was migrated onto each new system first. That migration is the
acceptance test in each case.

---

## 4. Tests catching real problems

Recorded because it is the argument for the tests existing at all. Each of these
was a defect in work done *this session*, caught before it shipped:

- 13 ridge colours invisible against their sky, then 10 more that passed a
  `skyBot` check and still vanished — the check itself was measuring the wrong
  thing.
- Every ridge peaking *below* the platform line, i.e. drawn for nobody.
- Emerald Peaks and Toros showing identical objective icons.
- Mastery duplicating Meadow's ground treatment.
- Two harness bugs that produced **false passes**, which is worse than failures:
  the playthrough treated `scene.ended` as success when it is also set by game
  over (reporting 10/10 complete while the player died in a pit), and the
  traversal probe demanded `grounded`, so a successful jump landing on a bounce
  pad read as a failure.

Three pre-existing tests asserted broken behaviour and were corrected, not
weakened: the generated gap test called the tier-scaled value "adil … asla riskli
üretim yok" (fair, never risky); the assist test was named "2 ölüme kadar devreye
girmez" (does not engage until two deaths); and a render test asserted monsters
are visible via an exact 40×40 rect, a proxy that only held while every creature
in the game was the same Mossling.

---

## 5. How to verify

```bash
npm ci && npm test && npm run build
```

Then, with a server running:

```bash
npm run dev
GAME_URL=http://127.0.0.1:5173 npm run qa:levels        # before/after evidence
GAME_URL=http://127.0.0.1:5173 npm run qa:meadow        # free chapter, end to end
GAME_URL=http://127.0.0.1:5173 npm run qa:progression   # recovery on all 10
GAME_URL=http://127.0.0.1:5173 npm run qa:devices       # device matrix
node scripts/playthrough-all.mjs                        # every chapter, end to end
```

---

## 6. What is NOT done

- **M2 (biome art manifest), M7 (learning that transfers), M8 (wordless play),
  M9 (per-level mechanics), M10 (submission)** — not started. None of the ten
  per-level mechanics, creatures-with-roles or surprises from the master plan's
  §4 exist as gameplay; the creatures are visual identities only.
- **No child playtest.** The master plan calls for it and it has never happened.
  Everything here is agent-verified, which is not the same thing.
- **No independent art review.** All three critique agents died to the account
  spend limit. The scenery has had two passes by the same author who wrote it.
- **Only 1 of 10 chapters completes end-to-end under the bot.** But see §8: the
  failure mode moved decisively, and the bot is a smoke test, not a player.
- **The competition scorecard is unverified.** `docs/audit/SCORECARD.md` carries
  a safety-classifier warning; confirm every claim about Shipaton rules against
  the live pages before relying on it.

## 7. What needs the owner

1. **The account spend limit is still active.** Two workflows were cut short by
   it; multi-agent work is unavailable.
2. **Authored art for biomes 2–10** cannot be produced by this agent. The
   procedural system is the shipped answer; commissioning plates is the
   alternative, and M2 is the drop-in point.
3. **Store record, RevenueCat product, demo video, promo code, TestFlight** —
   human-only, per `docs/SHIPATON_2026.md`.
4. **Nothing has been merged or deployed.** All work is on
   `agent/award-game-transformation`.


---

## 8. What the playthroughs actually measured

`scripts/playthrough-all.mjs` drives the real keyboard and card UI. It decides
every ~60ms, so it cannot time a jump the way continuous human input can. It is
a smoke test, not a player — where it fails, that is evidence of difficulty, not
proof of impossibility.

What it measured is still the most useful signal in this whole effort, because
the **failure mode moved**:

| Run | Where hearts were lost | How far the bot got |
| --- | --- | --- |
| Baseline | `pit` at x≈470–504, in every chapter | ~12% in, dead in 8s |
| After landing-zone fix | `pit`, same place | ~12–35% in |
| After gap + checkpoint + forgiveness + gentle falls | **`boss` at x≈3100–3148, nowhere else** | **42–78% in** |

**Not a single heart is lost to a pit in any chapter.** That was the dominant
failure mode and it is gone. Of the nine chapters the bot does not finish, four
(L4, L5, L7, L9) reach the boss arena and lose hearts only there; the other five
stall mid-level with hearts still intact, which is the bot failing to solve
something rather than the game taking anything from it.

Final run, per chapter (L1 completed in 28.0s):

| | L2 | L3 | L4 | L5 | L6 | L7 | L8 | L9 | L10 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| reached | 67% | 66% | 78% | arena | 42% | arena | 55% | 74% | *invalid* |
| hearts lost to pits | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

L10's row is void: the preview server was stopped while that chapter was still
running, so its 6% is an artefact of my own tooling, not a measurement.

The remaining failures are two different things:

1. **The boss fight.** The bot loses both hearts to the boss at x≈3100 in
   several chapters. Whether that is unfair *for a child* is a real open
   question — the arena is sealed, holds no creature to heal for a heart, and
   needs three sand-then-power cycles. It deserves a look.
2. **The bot getting stuck.** Several "stalls" are the bot running out of sand
   and then retreating from a creature forever, because its combat rule has no
   "walk past" branch. A child would jump over. That is a harness limitation,
   not a game defect.

Neither is settled by this harness. A child playtest is still the gate.
