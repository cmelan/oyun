# Design research

Principles extracted by two research agents on 2026-07-30. Principles only — no
characters, artwork, music, names or level layouts are copied from any source.

The L07-L10 design rows and all three art-critique passes were killed by the
account spend limit and are still missing.

---

## Game design & feel

*25 principles.*

### 1. Interpret intent, not input: size the forgiveness windows for the hand actually holding the phone.

**Reference.** Coyote-time / input-buffering primers (gamejuice.co.uk "Coyote Time, Input Buffering, and the Art of Forgiving Controls"; gamineai.com timing primer). Published tuning bands: precision platformer 70–110 ms, action 90–150 ms, casual mobile 110–180 ms.

**Why it works.** The frame a finger lands is a noisy sample of intent — reaction-time variance, display lag, touch-panel latency. A five-year-old's variance is several times an adult's. Widening the window deletes failures the child cannot perceive as their own, without making any jump look easier.

**Here.** src/core/config.ts:4 ships COYOTE 0.10 / JBUF 0.13 — an adult action-platformer setting, consumed at src/game/LevelScene.ts:455-458. Move to ~0.15 / 0.16 for touch. Add the third window the game lacks: a ledge-nudge that snaps the player up when they land within ~6 px short of a platform edge. Wire all three into assistFactors (src/core/logic.ts) so they widen further after repeated deaths rather than being fixed constants.

### 2. Spend the juice budget on the verb the game is about, not the verb it inherited.

**Reference.** Jonasson & Purho, "Juice It or Lose It" (2012); Vlambeer's "Art of Screenshake" — juice as excess output relative to input; the DiGRA "empirically grounded framework for juicy design".

**Why it works.** Feedback volume is how a game states its values. Whatever gets the largest response is what the player concludes the game is for. If jumping is louder than kindness, the child learns this is a jumping game with a kindness chore attached.

**Here.** A bounce pad gets sfx('boing') + squash 1.4 + shake(3,.12) + 8 particles (LevelScene.ts:475); a hard landing gets shake up to 5 and 9 particles (:478). A creature becoming happy — the thesis of the whole game — gets 26 particles, sfx('heal'), shake(2,.12) (:512). Invert that ordering: give the heal completion a ~0.12 s hitstop (skip one physics step, keep rendering), a radial bloom via the existing Graphics.fillRadial (engine.ts:156), a palette push on the creature, a rising three-note motif, and one bar of music ducking. ~20 lines, and it is the largest single change to how the game feels to be about.

### 3. The camera is a second designer. A pure centring lerp is a camera that never says anything.

**Reference.** Itay Keren, "Scroll Back: The Theory and Practice of Cameras in Side-Scrollers" (GDC 2015) — dual anchors / lookahead, dead zones, platform snapping, held anchors.

**Why it works.** Lookahead buys reaction time (you see the gap before you are over it). A dead zone stops the frame swimming under small corrections, which matters enormously for motion-sensitive young players. A held anchor is how a game points at something without a finger or a sentence.

**Here.** LevelScene.ts:622-625 centres the player every frame (cam += (target - cam) * dt * 6). Add (a) a face-biased target pcx - W/2 + p.face * ~70 on a slower lerp, (b) a ±40 px dead zone, (c) a camHold field a chapter can set — the single most valuable hook to build into M5's Chapter interface. Hard constraint to design around: Camera.scrollY exists (engine.ts:220) but the renderer only translates X (engine.ts:329), so there is no vertical camera at all. L2's 'verticality' must be composed inside one 540 px screen unless engine.ts gains a Y translate first.

### 4. Kishōtenketsu: introduce, develop, twist, conclude — then throw the idea away.

**Reference.** Nintendo's four-step stage design as documented by Game Maker's Toolkit and gamedeveloper.com ("The secret to Mario level design"); kishōtenketsu four-act structure.

**Why it works.** Four beats is the shortest structure in which an idea is learned, owned, surprised and completed. Discarding the mechanic afterwards is what keeps the next chapter free to be about something else — it is the structural answer to 'ten levels, ten identities'.

**Here.** src/core/generator.ts SECTION_RHYTHM is a rhythm of platform widths, not of ideas: six entries cycled with a fixed GAP, one PUZZLE_FACTORY instance per puzzle platform, no beat relating to the one before it. Add beats: ('introduce'|'develop'|'twist'|'conclude')[] to Recipe and let makeSection place the chapter's ONE signature mechanic at escalating stakes across the four, with the boss as 'conclude'. This is what stops 'L5 and L6 are the same level' from being a property of the generator.

### 5. Introduce a new idea in a place where it is the only thing that can go wrong.

**Reference.** The 'safe space' rule in the four-step teaching framework: present the mechanic in isolation, with minor consequences for failure, before adding pressure.

**Why it works.** A child cannot build a mental model of a mechanic while simultaneously managing a pit, a chase and a resource. Isolation is not hand-holding — it is the precondition for the later twist to read as a twist rather than as noise.

**Here.** L2 does the exact opposite: gentle flips to false, a boss appears, monster count goes 1→6, and the red 🔥 eye debuts around x=1170 while the first intros entry sits at x=2332. Encode the rule in makeSection: the first instance of any puzzleTypes entry new to this level must sit on a calm platform, with no monster in the same segment and no pit on the approach, and its intro must fire before it. Cheap to test — assert it over all ten generated levels in tests/core.test.ts.

### 6. Rest beats are content; empty corridor is not. Compose the valleys.

**Reference.** Pacing peaks-and-valleys practice — Pete Ellis, "Single Player Level Design Pacing and Gameplay Beats" (WorldOfLevelDesign); Stepico's difficulty-pacing guide (warm-up / build / peak / cool-down / climax).

**Why it works.** Intensity exists only as contrast, so troughs are load-bearing. But a trough must be authored — a vista, a look back at what you fixed, a creature doing something — or it degrades into padding, which is exactly the audit's '600 px of pure walking' and '4,196 px of identical ground'.

**Here.** makeSection already alternates calm (tree + checkpoint) and puzzle platforms — the right skeleton — but every calm platform is identical. Add vista?: { atSegment: number; kind: string } to Recipe and let the M1 scenery system fill it: widen the platform, drop the tree, locally raise Fringe.stride (src/core/scenery.ts) so the foreground parts, and let the new camHold pin the frame. Data, not code.

### 7. For ages 5–8, escalate cognitive load, not dexterity — and design the session, not just the level.

**Reference.** Children's UX guidance (Ungrammary; AufaitUX): simplified uncluttered layouts for 5–8, attention spans of roughly 8–10 minutes at 4–6, short interactions with frequent completion points.

**Why it works.** Fine motor control at five is near floor; asking for tighter timing produces failure that teaches nothing and reads as unfairness. Asking the child to hold one more thing in mind produces growth they can actually feel, and it is the axis on which this game's empathy verb can carry difficulty.

**Here.** Tier does almost nothing today: L4→L5→L6 differ by spd 102→112→112 and gap 152→158→158 (the Math.min(30, tier*6) term in generator.ts), which is imperceptible on both axes. Repoint tier at chaining instead: tier 1 = one power per puzzle; tier 2 = a puzzle whose solution enables the next; tier 3 = puzzles that must be ordered. Also give each 4,200 px chapter one internal 'you could stop here' beat — checkpoints exist, but nothing tells a parent where a natural break is.

### 8. The wordless tutorial is a creature performing the verb first.

**Reference.** Wordless teaching in the four-step framework (demonstrate the requirement through placement) combined with children's-UX findings that 3–6 year-olds reason in icons and imitation rather than language.

**Why it works.** A pre-reader cannot be told and will not decode an emoji row, but will copy a living thing. Demonstration also costs zero localisation — which matters when ~13 intro strings currently render raw Turkish to EN and DE children (recipes carry literal hint strings, generator.ts:99).

**Here.** The game already owns the one asset this needs: a creature with a 'happy' state and an AI step. Before the first instance of each mechanic, script a healed creature to perform the interaction on a loop — step onto the leaf-step, bounce the mush pad, shelter behind the windbreak — until the child does it. Put it on M5's Chapter.update hook so it is per-level data, never another idx === N branch in LevelScene.

### 9. Guaranteed-discovery geometry: make the space impossible to cross without using the knowledge.

**Reference.** Platformer level-design practice that obstacles should demonstrate their own requirement (RetroStyleGames level-design guide); the 'conclude' step of the four-step model, where the level's final challenge integrates the lesson.

**Why it works.** Optional learning is skipped learning. If recognising a tree never unlocks anything, a child correctly classifies botany as an interruption — which is precisely the audit's sharpest finding about this game's core promise.

**Here.** This is M7's brief, and the cheapest version touches almost nothing: gate one grow/bridge interact per region on journal.includes(<region species>) rather than on the eye alone, and put that species' clue in the same screen. Interact is already an open record (`[k: string]: unknown`, src/core/generator.ts:8-11), so a needsTree?: string field costs one condition in LevelScene.doUse. Re-quizzing across regions (kayın appears in both kestane and karadeniz treeSets, src/core/world.ts) then becomes meaningful rather than silently skipped.

### 10. Every affordance must survive greyscale and stillness — two channels minimum.

**Reference.** Shape-language and readability practice (80.lv, "Character Design: Shape Language and Readability"; the squint test), applied to interface as well as characters.

**Why it works.** Red/green is the standard confusion pair and both are load-bearing in this game's power system. Separately, a cue that exists only as a pulse vanishes in a screenshot, in a trailer, and for a child who happens to be looking elsewhere — so motion can be a second channel but never the only one.

**Here.** eyeMark draws three concentric circles in TOOLS[eye].col and nothing else (LevelScene.ts:1042-1047), while the button carries the emoji (ui.ts:104-108). Give each of the five eyes a distinct ring silhouette — hexagon, flame, leaf, spiral, diamond — using primitives already present in engine.ts (fillPolygon, fillTriangle, strokeCircle), plus a dark halo so it holds on the pale coast/mastery grass. Add a CI check that renders the three objective-step states (index.html:99) to greyscale and asserts they differ.

### 11. Silhouette first: if it is not identifiable filled black at gameplay size, it is not designed.

**Reference.** Silhouette / squint-test practice in character design (80.lv; Pixune on shape language) — a well-designed character is recognisable in complete shadow.

**Why it works.** At 40 px on a phone, colour and interior detail are noise; outline is the only channel with bandwidth. It is also the only creature-variety strategy that is genuinely achievable procedurally — outlines are cheap in canvas, rendering is not.

**Here.** Make the silhouette the primary field of M3's species registry, not the palette. Make the distinctness test real: rasterise each species at 40 px as a single-colour fill and compare an aspect-ratio band, an appendage count and a coarse occupancy-grid hash — not a hand-written 'signature' string, which can pass while two creatures look identical. makeMonster hardcodes w: 40, h: 40 (src/core/logic.ts:18-27); take the box from the registry but keep 40×40 as the default so tests/render.test.ts keeps its meaning.

### 12. Shape language, inverted for a game with no enemies: angularity means distress, and the silhouette softens when you help.

**Reference.** Standard shape-language conventions — rounded reads friendly and approachable, angular reads energetic or dangerous, triangular reads threatening (Pixune; vsquad.art).

**Why it works.** Children read the convention fluently, so a non-violent game gets an entire communication channel free — provided angularity is used to mean 'this one is hurting' and is then visibly resolved. A silhouette that changes on restoration makes the empathy loop legible from across the room and gives the payoff at creature scale, not only at level scale.

**Here.** drawMonster currently changes body colour by state and nothing else. Put a spikiness/pose scalar in the species record and lerp it across angry → blind → happy. empathyTick (src/core/logic.ts) already returns true on the exact frame the creature becomes happy, so there is a clean trigger. One number per species, and the whole roster gains a readable emotional arc — including the bosses, once M4 splits species from finisherKind.

### 13. Motion is read before shape — give each species a gait, not just a drawing.

**Reference.** Animation principles imported into game feel (squash-and-stretch, anticipation, follow-through as identity), as catalogued in the juice literature.

**Why it works.** At 40 px and in peripheral vision, a child identifies a creature by how it moves well before they resolve its outline. It is also the cheapest possible variety in a vanilla-canvas engine: the same body on a different sine is a different creature.

**Here.** MonsterData.type is a dead slot read only to set flip (src/core/logic.ts:24). Promote it to species and let the registry own behaviour: 'walker' | 'hopper' | 'drifter' | 'tumbler' | 'perched', driving both the AI step in LevelScene's monster loop and a per-species bob/rotation in the renderer. Three or four behaviours cover the whole ten-biome roster — the Curled One is a tumbler, the Gust-chick a drifter, the Reed-heron a perched.

### 14. Aerial perspective is the depth cue: value order must be monotonic from back to front.

**Reference.** Composition practice cited across platformer level-design guides (layered backgrounds, parallax and lighting for spatial clarity); the Meadow's authored plates are the in-project proof of the same rule.

**Why it works.** If a far layer is not both lower-contrast and correctly ordered in value against the sky and against the layer in front of it, the background advances and the frame goes flat. This was measured in the audit as toros mint hills lighter than their own sky and cave hillsMid at 1.03:1 — a depth cue running backwards.

**Here.** tests/scenery.test.ts is already the right battery — it asserts ridge-vs-sky contrast at the ridge's own peak height (via skyColorAt/ridgePeakY in src/core/scenery.ts) and back-to-front ordering. Add the missing assertion: adjacent ridge ranks must differ by a minimum ΔL, and in a light-sky biome the nearest rank must be the darkest and most saturated. toros (#a6bcc0 → #77958e → #5c7f68) already satisfies it; the fix, where needed, lands in SCENERY data, not in environment.ts.

### 15. A horizon must actually move, and must produce a shape more than once per screen.

**Reference.** Parallax practice generally; the specific numbers here are a measurement of this codebase, not a citation.

**Why it works.** Distant layers exist to report progress. If the far rank does not change across a level, walking right feels like a treadmill — which is exactly the '4,196 px of identical ground' complaint, and no amount of palette work fixes it.

**Here.** drawRidge samples wx = (sx + cameraX * parallax) / wavelength (src/game/environment.ts:107-118), so one feature equals one wavelength of SCREEN px. toros's far rank is wavelength 780 at parallax .07: that is ~1.2 features per 960 px viewport, and across a 4,244 px level the far horizon slides only ~230 px — under a third of one feature, i.e. one unchanging bump for the entire chapter. Same problem in coast (900 / .06) and mastery (700 / .07). Add two rules as a test: (levelWidth - 960) * parallax >= 2 * wavelength for the far rank, and at least one rank with wavelength <= 380 so every frame contains a silhouette event. Data edit in src/core/scenery.ts.

### 16. Environmental storytelling starts with the composition of the first frame.

**Reference.** Environmental storytelling practice — spatial design, atmosphere and visual cues carrying narrative without dialogue or cutscenes.

**Why it works.** With minimal reading and no cutscenes, the opening composition IS the exposition budget. Compare docs/evidence/before/L01-1.png — warm light, atmospheric depth, foreground foliage occluding the player — with the after-pass L05-1.png, which opens on a pale corridor with no foreground, no landmark and no value hierarchy.

**Here.** Give SceneryProfile an opening variant used for a chapter's first ~900 px: denser Fringe (a foreground the child physically walks out of), a lower haze.y, one authored silhouette landmark. drawFringe already takes stride/height/parallax (src/game/environment.ts:274), so this is a data field plus an x-lerp. Corollary for the game's own opening: agency before title — let the child move before any menu or name appears, the way a cold open puts you in the scene before the credits.

### 17. Consequence must travel across the space the player crossed.

**Reference.** Persistent-world-change practice in environmental storytelling (the world records what happened); reinforced by all six level rows of the project's own LEVEL_MATRIX restoration proposals.

**Why it works.** A payoff confined to one screen rewards the last five seconds. A wave that runs the length of the level rewards the last five minutes, and a five-year-old can literally watch their own effort re-colour ground they remember walking.

**Here.** completeLevel() (LevelScene.ts:433-436) fires particles and hands off to a DOM card; the world is unchanged. Add restoreWave: { t, speed } on the scene and have drawGroundCover and drawPlatformSurface (src/game/environment.ts:187, :122) read it as a per-x lerp between two CoverKind / palette states. Both already receive x and the palette, so this is one extra argument plus a mix() — and because it is in the shared renderer it serves all ten biomes at once, which is the D3 test of whether a feature is a real system or a special case.

### 18. Foreshadow the next chapter inside this one's frame.

**Reference.** Evocative worldbuilding / environmental storytelling — the world implies what is beyond it rather than a menu announcing it.

**Why it works.** It converts sequential unlock from a UI structure into a place. The child sees where they are going and wants to go, which is intrinsic pull rather than a locked node telling them they may not.

**Here.** SceneryProfile.ridges is already per-biome data carrying parallax and colour (src/core/scenery.ts). Add an optional far rank flagged as belonging to the next biome, rendered only once this chapter is restored, drawn in the next biome's far-ridge colour. No new rendering code — a data field and a boolean read in drawRidges. Level 1's proposed 'the mountains of Level 2 emerge from the haze' then costs nothing extra and works for every chapter.

### 19. Diegetic state beats HUD state for a non-reader.

**Reference.** Children's UX guidance (minimal text, large targets, familiar icons, no hidden functions — Ungrammary, AufaitUX, Ramotion), against this project's own F-018 and F-025.

**Why it works.** The objective bar is a row of 21–25 px pips distinguished by fill colour and explained by a sentence nobody reads to the child. A pre-reader will not parse it. They will parse a glowing thing in the world, because that is where they are already looking.

**Here.** Two moves needing no new UI. (a) The current objective step gets a world-space counterpart — a soft beacon on the relevant object drawn with Graphics.fillRadial (engine.ts:156), which is already used for the cave lantern. (b) Route every showHint through speak() and attach a mandatory 2–4 glyph strip to each hint key; the S() table in src/core/i18n.ts already has one entry per hint, so the glyph strip is one extra field per key and is language-independent by construction.

### 20. Secrets should reward looking, never inventory management.

**Reference.** Discovery-design practice — anomaly-based signposting, and the finding that the primary reward for exploration should be the revelation itself rather than a material bonus; optional content respects player autonomy.

**Why it works.** For 5–8, a counter ('3 of 7 found') converts curiosity into an obligation the child cannot discharge and a parent has to arbitrate. An anomaly a child noticed becomes a memory; a checklist becomes a chore, and a missable becomes a small grief.

**Here.** No counters, no completion percentages, no missable-forever content anywhere. Implement secrets as second reads of the same space rather than extra space: a Fringe cluster the child can walk behind that conceals a sleeping creature (fringe already renders at parallax > 1, so occlusion is free); a ridge shape that resolves into something at one camera position. Persist found-ness in src/core/save.ts only to avoid repeating a reveal — never to display a total.

### 21. Failure costs time, never progress — and the assist is invisible and persistent.

**Reference.** Forgiveness-mechanics framing (a game that honours intent feels fair even when it is hard) plus children's-UX guidance on frustration and short attention spans.

**Why it works.** For a five-year-old, redoing ten minutes of already-solved puzzles is indistinguishable from punishment, and no amount of gentleness elsewhere survives it. An assist that announces itself, meanwhile, teaches the child they were failing.

**Here.** Two live defects, both cheap and both already diagnosed. onRetry: () => startLevel(currentIdx) (src/main.ts:69) rebuilds the scene from spawn, clearing every interact.done, checkpoint and boss state on levels 3.5–4.5 k px wide — serialise the runtime and resume at the last checkpoint with hearts refilled, reserving full restart for the explicit ↻. And assistFactors (src/core/logic.ts) only leaves identity at deaths > 2 while hearts: 3 ends the run at deaths 3, and create() resets assist = { deaths: 0 } (LevelScene.ts:96) — so it can only ever help children who are already winning. Move deaths into SaveData keyed by level and threshold at deaths - 1.

### 22. Celebrate effort, unexpectedly. Never announce a contingent reward.

**Reference.** Intrinsic/extrinsic motivation research as summarised in children's-motivation writing: expected, contingent rewards reliably depress intrinsic motivation, while unexpected rewards and informational feedback on effort and strategy sustain or raise it.

**Why it works.** This game's intended reward is the world getting better. A visible meter counting toward a prize would substitute the prize for the world, and would also be the closest thing to a dark pattern a children's title can accidentally ship.

**Here.** streakAnswer (src/core/logic.ts) is already exactly right — three first-try answers fire an unannounced sparkle (sfx('streak')), and a wrong answer only resets the run with no penalty path. Protect that: never surface a streak counter in the HUD. Extend the same shape from accuracy to effort — an unheralded flourish the first time a child heals a creature they could have walked past, or returns to a creature they skipped. Effort-contingent and unannounced, both.

### 23. Adaptive music by vertical layering over one shared motif; crossfade, never hard-cut.

**Reference.** Vertical remixing vs horizontal re-sequencing in adaptive game audio (TheGameAudioCo; Splice's history of adaptive music) — layers gated by a gameplay parameter, all derived from one composition.

**Why it works.** Layering is how ten biomes become one world rather than ten soundtracks: the identity survives while the instrumentation changes. A hard cut, by contrast, reads to a child as something breaking rather than something changing.

**Here.** setMusicMood resets mi = 0 on every change (src/game/audio.ts:94), and startLevel sets 'meadow' unconditionally for all ten levels (src/main.ts:51), so a cave and an orchard are bit-identical in audio. Minimum viable: add BIOME_SOUND[biome] = { root, scale, pace, timbre, air } beside BIOME and derive melody/bass as scale degrees over root instead of hard-coded Hz arrays — ~30 lines, no architecture change, and all ten biomes become distinguishable. Then layer: one persistent tension bus whose gain rises near the boss and falls on restoration, crossfaded with setTargetAtTime. The node graph in audio.ts supports this today; it needs one long-lived bus instead of per-note gains.

### 24. Silence is the loudest cue you own — and it is free.

**Reference.** Pacing contrast applied to the mix (troughs are what make peaks register — Pete Ellis / Stepico), plus the adaptive-audio practice of treating layer removal as a state in its own right.

**Why it works.** A game whose entire audio budget is a WebAudio synth cannot get impressively louder, but it can stop. A full stop after four minutes of continuous texture is a bigger event than any stinger, and it costs no bytes and no licensing — which matters for a 137 kB offline-first bundle.

**Here.** The two best beats the design already wants — L2's summit and L5's wind ceasing — are both removals, and the plan currently has no mechanism for either. Add musicDuck(target, seconds) on the master bus in src/game/audio.ts and expose it to M5's Chapter interface. The same eight lines then also fix F-030(e): duck the music to ~28 % while speech is active, so the spoken tree name is not competing with the melody for the audience the feature exists for.

### 25. The ending is the opening, changed — and the theme returns transformed.

**Reference.** Thematic transformation and leitmotif practice: a motif returns at the emotional climax in a new mode, tempo or instrumentation, so recognition carries the meaning (DiGRA on leitmotifs in games; standard thematic-transformation technique).

**Why it works.** Recognition IS the emotion, and it needs no words — which is the exact constraint this game is under. A child who returns to the first meadow and hears the first melody slower and warmer understands what they did, and understands it about themselves.

**Here.** Two hooks, both partly built. Musically, SCORE.restored (src/game/audio.ts:88) is already a reharmonisation of SCORE.meadow — that instinct is correct; make it the rule by deriving every biome's melody from one shared interval set, so the finale can state the original in augmentation. Spatially, the mastery SceneryProfile (src/core/scenery.ts) should quote each restored biome's far-ridge colour in its own ranks, and Level 10's final beat should return the camera to a garden bed composed as the Meadow's opening frame, re-lit — which is also the strongest possible answer to the current final boss being a green rounded rectangle with two dots (after/L10-3.png).

**Notes.** SCOPE AND IP HYGIENE. Everything above is a transferable craft principle plus the reasoning for it. No character, artwork, music, name, level layout or protected visual identity from any existing title is proposed for reuse. Where a well-known game is the canonical demonstration of a principle (e.g. four-step stage design), the principle is stated abstractly and the citation points at the craft writing, not at assets. Two candidate principles were dropped for being inseparable from a specific IP's identity: a named-mascot "signature move" pattern, and a specific studio's collectible-taxonomy structure.

TOP FIVE BY LEVERAGE, given a vanilla-canvas engine, an empathy core verb and a 5–8 audience:
1. #2 — move the juice budget onto the heal. Highest perceived-quality-per-line change in the project; ~20 lines in LevelScene.ts; makes the game feel like what it says it is.
2. #21 — kind failure (checkpoint resume + persistent assist). Two shipped defects (F-001, F-002); the single least kind thing in the game today.
3. #23 + #24 — BIOME_SOUND derived from root/scale/pace, plus one duck/silence bus. ~40 lines total, fixes an audio blocker, an accessibility blocker and gives ten biomes an identity.
4. #15 — the far-horizon wavelength/parallax measurement. Purely a data edit in src/core/scenery.ts plus one test, and it is the reason the after-pass shots still read as a treadmill on toros/coast/mastery despite the new scenery system.
5. #9 — make recognition load-bearing via a needsTree?: string field on Interact. One condition in doUse; converts the game's stated purpose from trivia into a mechanic.

VERIFIED CODEBASE CONSTRAINTS THAT SHOULD SHAPE THE PLAN:
- No vertical camera. Camera.scrollY is declared (src/game/engine.ts:220) but Game.render only translates X (engine.ts:329). Every "verticality" proposal in the level matrix (L2 especially) must either fit inside one 540 px screen or be preceded by a small engine change. Worth deciding explicitly rather than discovering during M9.
- Ridge wavelength is in SCREEN pixels, not world pixels (src/game/environment.ts:112). This is why toros/coast/mastery horizons barely change across a whole level. It is not obvious from the data file and will bite again.
- tests/scenery.test.ts is a genuinely good model for how to make art direction mechanically verifiable — contrast measured at the ridge's own peak height rather than against skyBot, back-to-front ordering, no-two-biomes-share-a-signature. Two assertions are missing: adjacent-rank ΔL (principle #14) and horizon travel (#15). Extending that file is cheaper than any review process.
- streakAnswer, the finale-tree guard in prepLevel, and the sand-refill-at-checkpoint rule are already correct against best practice; they should be treated as protected, not as things to "improve".

Sources:
- [Coyote Time, Input Buffering, and the Art of Forgiving Controls — GameJuice](https://www.gamejuice.co.uk/articles/coyote-time-input-buffering)
- [Input Buffering and Coyote Time in 2D — a timing primer](https://gamineai.com/blog/input-buffering-and-coyote-time-in-2d-a-godot-4-and-unity-friendly-timing-primer)
- [Juice It or Lose It — GameJuice resource page](https://gamejuice.co.uk/resources/juice-it-or-lose-it)
- [An Empirically Grounded Framework for Juicy Design (DiGRA)](https://dl.digra.org/index.php/dl/article/download/936/936/933)
- [Scroll Back: The Theory and Practice of Cameras in Side-Scrollers — Itay Keren](https://www.gamedeveloper.com/design/scroll-back-the-theory-and-practice-of-cameras-in-side-scrollers)
- [The secret to Mario level design — Game Developer](https://www.gamedeveloper.com/design/the-secret-to-i-mario-i-level-design)
- [Nintendo's four-step stage design — Nintendo Life](https://www.nintendolife.com/news/2015/03/video_nintendos_four_step_stage_design_is_why_you_love_super_mario_games_so_much)
- [Learning pedagogical design patterns from Mario](https://dev.to/tttaaannnggg/learning-pedagogical-design-patterns-from-mario-1b8c)
- [Single Player Level Design Pacing and Gameplay Beats — Pete Ellis](https://www.worldofleveldesign.com/categories/wold-members-tutorials/peteellis/level-design-pacing-gameplay-beats-part2.php)
- [Video Game Level Design and Difficulty — Stepico](https://stepico.com/blog/video-game-level-design-and-difficulty-how-to-challenge-players-without-losing-them/)
- [Platformer Level Design Tips — RetroStyleGames](https://retrostylegames.com/blog/platformer-level-design-tips/)
- [Character Design: Shape Language and Readability — 80.lv](https://80.lv/articles/character-design-shape-language-and-readability)
- [Shape Language in Character Design Explained — Pixune](https://pixune.com/blog/shape-language-technique/)
- [Importance of Character Silhouettes in Game Design](https://salivity.github.io/game-development/article/importance-of-character-silhouettes-in-game-design)
- [Designing for Kids: UX Design Tips for Children Apps — Ungrammary](https://www.ungrammary.com/post/designing-for-kids-ux-design-tips-for-children-apps)
- [UI/UX Design for Children: Age-Appropriate App Guidelines — AufaitUX](https://www.aufaitux.com/blog/ui-ux-designing-for-children/)
- [UX Design for Kids: Principles and Recommendations — Ramotion](https://www.ramotion.com/blog/ux-design-for-kids/)
- [Environmental Storytelling in Game Design — crafting narrative without words](https://ultimategaming.substack.com/p/environmental-storytelling-in-game)
- [Unlocking Discovery in Game Design](https://www.numberanalytics.com/blog/ultimate-guide-to-discovery-in-game-design)
- [The Hidden Dangers of Extrinsic Motivation in Game Design](https://www.linkedin.com/pulse/hidden-dangers-extrinsic-motivation-game-design-raja-saha)
- [How to Build Intrinsic Motivation in Children — Collaborative for Children](https://collabforchildren.org/who-we-are/news/intrinsic-motivation-in-early-childhood/)
- [Vertical Layering vs. Horizontal Resequencing — The Game Audio Co](https://www.thegameaudioco.com/making-your-game-s-music-more-dynamic-vertical-layering-vs-horizontal-resequencing)
- [The history of adaptive music in video games — Splice](https://splice.com/blog/adaptive-music-video-games/)
- [How Musical Leitmotifs Enhance Narration and Evoke Emotion (DiGRA)](https://dl.digra.org/index.php/dl/article/download/1820/1820/1817)
- [How to Design the First Five Minutes of Your Game — Filament Games](https://www.filamentgames.com/blog/how-design-first-five-minutes-your-game)

---

## Children's learning & accessibility

*19 principles.*

### 1. Intrinsic integration — the learning must be the mechanic, not a card bolted on top of it

**Reference.** Habgood & Ainsworth (2011), 'Motivating Children to Learn Effectively: Exploring the Value of Intrinsic Integration in Educational Games', Journal of the Learning Sciences 20(2) — https://www.tandfonline.com/doi/abs/10.1080/10508406.2010.508029 ; Cutting & Iacovides (2022), 'Learning by Doing: Intrinsic Integration Directs Attention to Increase Learning in Games', PACM HCI 6 (CHI PLAY) — https://dl.acm.org/doi/10.1145/3549503

**Why it works.** Pre-registered replication (n=210) found intrinsically integrated games produce more learning at equal time-on-task, and the mechanism is attentional, not motivational and not cognitive-load: delivering the content through the most engaging part of play points attention at the content. A quiz interrupt is precisely the non-integrated control condition — the child's attention is on getting past the card, not on the leaf.

**Here.** F-036 is the audit's sharpest finding and this is its research backing. `LevelScene.resolveTreeAnswer()` (src/game/LevelScene.ts:299-312) terminates in `tr.awake = true` + 26 particles + a journal entry — knowing a tree opens no path, grants no power, changes no obstacle. Make the awake flag a world-state input: (a) `src/core/generator.ts` — `TreeData` gains an effect slot; (b) `LevelScene.solids()` (:182) and the interact gate in `doUse()` (:226-250) read `this.L.trees.find(t => t.awake && t.id === …)`; (c) at minimum one puzzle per region must be unsolvable until a named species is awake — LEVEL_MATRIX already specifies two concrete instances (row 2: waking a conifer builds a windbreak that kills the gust; row 6: grafting a carried blossom to the matching tree turns the branch into a platform). Note `computeEquip()` (:215-220) auto-equips the zone's own eye, so the five powers are never a choice either — the same fix applies. The mimic boss (`doUse()` :226-231 → `showMimicQuestion`) is today the *only* knowledge-gated action in the whole game, and it is the same three-option card.

### 2. Repeated spaced retrieval — one-shot quizzing produces no durable memory and no transfer

**Reference.** Haebig, Leonard et al., 'A multi-study examination of the role of repeated spaced retrieval in the word learning of children' — https://pmc.ncbi.nlm.nih.gov/articles/PMC8126157/ ; 'Retrieval Practice and Word Learning by Children: Does Expanding Retrieval Provide Additional Benefit?' JSLHR (2024) — https://pmc.ncbi.nlm.nih.gov/articles/PMC11087082/

**Why it works.** Repeated spaced retrieval beat repeated study for both word form and word meaning, the advantage held at a one-week delay (not just a 5-minute test), and — critically for a recognition game — it generalised to *new pictures* of the same referent, i.e. it built a category rather than an item memory. Expanding vs equal spacing converged; what matters is that retrieval happens repeatedly and spaced at all.

**Here.** F-005. `prepLevel()` (src/core/world.ts:49-53) sets `awake: !tr.finale && journal.includes(tr.id) && regionId !== 'usta'`, so every species already in the journal spawns pre-solved — each of the 26 species is retrieved exactly once in the entire game. Replace `SaveData.journal: string[]` (src/core/save.ts:5-10) with a review record `{ id, seenCount, firstTryCorrect, wrongCount, dueAtLevel }`; `recordTreeWake()` (save.ts:48-53) becomes `recordAnswer(save, id, firstTry)` with a v2→v3 migration alongside the existing v1→v2 path (save.ts:28-36). `prepLevel` then pre-wakes only when `dueAtLevel > idx`. Schedule reviews at +2 and +5 levels; immediately re-queue anything answered wrong. `src/core/levels.ts:169-170` (`pool = journal.slice(-6)`, `treeIds = pool.slice(0,4)`) must pull the *weakest* four by first-try rate — it currently re-tests the six most recently learned, exactly the ones needing review least. Free spacing already exists in the data and is actively suppressed: `kayın` appears in regions 4 and 8 and `söğüt` in regions 3 and 9 (world.ts:21,25,26).

### 3. You cannot retrieve what was never encoded — teach before you test

**Reference.** Every RSR protocol above begins with an exposure/encoding trial before any retrieval trial; IES, 'Prioritizing Play' — https://ies.ed.gov/learn/blog/prioritizing-play-importance-play-based-learning-early-education (brief direct instruction embedded inside play is the most effective balance); University of Cambridge / PEDAL guided-play evidence synthesis (~3,800 children aged 3–8) — https://www.cam.ac.uk/research/news/learning-through-guided-play-can-be-as-effective-as-adult-led-instruction

**Why it works.** Retrieval practice is only practice if there is something to retrieve. Presenting a clue plus three never-heard names is a coin flip, not a test — and it means the game's teaching surface fires only as a reward for guessing right.

**Here.** The card that actually teaches — `UI.showTreeWake()` (src/game/ui.ts:441-453: name, family, desc, fact) — is reachable only through `resolveTreeAnswer(correct = true)` (LevelScene.ts:299-312). First contact with a species is `doUse()` → `showTreeQuestion()` (LevelScene.ts:232-237 → ui.ts:429-438). Invert for first encounter: when the P2 record shows `seenCount === 0`, play a short spoken 'meet' beat (name + one diagnostic feature, ~4 s, skippable) and skip the quiz; quiz on the second and subsequent encounters, which is exactly what the review queue enables. The sleeping-tree beacon already drawn in `LevelScene.drawTree()` (:1039-1042 — the cream rounded rect with the yellow dot) is the natural attachment point, and `CONFIG.tree.wakeRadius: 70` (src/core/config.ts:17) already defines the trigger distance.

### 4. Contrastive, simultaneous comparison is what builds a perceptual category

**Reference.** Nature Scientific Reports (2024), 'Adaptively triggered comparisons enhance perceptual category learning: evidence from face learning' — https://www.nature.com/articles/s41598-024-70163-6 ; Namy & Gentner line, 'The differing roles of comparison and contrast in children's categorization', J. Experimental Child Psychology (2010) — https://www.sciencedirect.com/science/article/abs/pii/S0022096510001104

**Why it works.** Presenting two confusable exemplars *simultaneously* lets the learner find the diagnostic dimension without loading long-term memory, and error-triggered comparisons target exactly the categories being confused. In children, comparing perceptually similar exemplars is what pushes them off surface similarity and onto the relational/diagnostic properties that define the category.

**Here.** F-035 and F-003. `UI.showRecognition()` (src/game/ui.ts:399-427) never places two exemplars side by side; a wrong tap only adds `.dim` (ui.ts:421). On a wrong answer, animate the tapped species' clue art up beside `.clueBadge` and hold both for ~1.5 s with the differing feature (lobe count, tooth edge, needle cluster) ringed. This needs per-pair contrast data — add `contrast: Record<Lang, string>` keyed `${a}|${b}` next to `fact` in `TreeDef` (src/core/trees.ts:9-17). Add the same compare beat to `showTreeWake()` on a first-try-correct so success teaches too. The bark tier makes comparison literally impossible today: `drawBarkSwatch()` (src/game/art.ts:288-290) puts çam/servi/toros sediri/ardıç/ladin through one hard-coded branch with no species parameter, so in Toros Yaylası (world.ts:22, `clueTier: 'bark'`) the clues for `toros sediri` and `ardıç` are byte-identical images, and in Akdeniz (world.ts:24) `incir` and `limon` both hit the `else` default at art.ts:300-303. Give every species its own bark parameters as data in `TREES`, not an if-chain in art.ts.

### 5. The clue and the answer must not be rendered from the same source image

**Reference.** Direct corollary of the comparison/perceptual-learning literature above: if the discriminating information is identical in clue and target, no botanical feature is encoded. Reinforced by the plant-recognition finding that only feature-level, hands-on engagement produces durable knowledge — 'Trees in the Eyes of Young Learners' (2025) — https://pmc.ncbi.nlm.nih.gov/articles/PMC12569609/

**Why it works.** Bitmap matching is solvable by a visual-similarity heuristic that requires zero knowledge of the species. The child succeeds, the game records a learned tree, and nothing has been learned — the measurement and the learning evaporate together.

**Here.** F-034. `getTreeArt(id,'leaf',size)` → `getTreeIcon(id,size,false)` and `getChoiceArt(id,72)` → `getTreeIcon(id,72,true)` (src/game/art.ts:396-412) draw the same `LEAF_PATH[id]` with the same `LEAF_COLOR[id]` gradient (art.ts:246-266). It is worse for the three species that have photos: `PHOTOS` (src/core/photos.generated.ts) covers only meşe/çınar/ıhlamur — the free chapter's whole tree set — and there `getTreeArt` returns `photos.leaf` while `getChoiceArt` returns the *identical* `photos.leaf`, so the clue and the correct thumbnail are the same file. And `getTreeSilhouette()` (art.ts:340-350) renders the same leaf path in `#233a33`, so the supposedly hardest tier is an outline matched against the same outlines in colour — easier than bark, inverting the documented leaf→bark→silhouette ramp (world.ts:4) — while the copy says 'Bu gölge hangi ağacın?' / 'Which tree makes this silhouette?' (src/core/i18n.ts) over a leaf. Fix: make the silhouette tier a whole-tree crown — `LevelScene.drawTree()` (:976-1035) already renders six distinct crowns from `TreeDef.crown` ('broad'|'tall'|'oval'|'conifer'|'weeping'|'palm', trees.ts:15); extract it to an icon-scale renderer. For the leaf tier render the clue from a different exemplar than the thumbnail (rotation, two-leaf spray, or the photo). Add the pairwise-pixel-hash test F-003 asks for as `tests/clues.test.ts`.

### 6. Competitive, plausible distractors — a fixed 1-in-3 guess neither measures nor teaches

**Reference.** Little, Bjork, Bjork & Angello (2012), 'Multiple-Choice Tests Exonerated, At Least of Some Charges', Psychological Science — https://bjorklab.psych.ucla.edu/wp-content/uploads/sites/13/2016/07/Little_EBjork_RBjork_Angello_2012.pdf ; Learning Scientists summary of MC best practice — https://www.learningscientists.org/blog/2017/10/10-1

**Why it works.** The testing-effect benefit of multiple choice is contingent on distractor quality. Competitive alternatives force the learner to retrieve and reject information about the incorrect options, which is what produces transfer; easy distractors let the item be solved by elimination with no engagement of the content. Making the test easier actively undermines learning.

**Here.** F-004. `pick3(correctId, pool)` (src/core/logic.ts:62-72) is fed `regionTreePool()` (src/core/world.ts:57-61), which returns the region's `treeSet` — exactly 3 species for 7 of the 10 regions (world.ts:18-28). So `others.slice(0,2)` is deterministically *every* other tree in the region: zero distractor variance across the whole game, and the same three buttons every single time. Widen the pool to the whole journal and rank candidates by confusability — same `crown` (trees.ts:15) or same `family`, plus this child's own prior errors from the P2 save record. Keep three options (working-memory load) but vary which three. `pick3` already accepts an injectable `rng`, so the new selection stays unit-testable in `tests/core.test.ts`. Also fix `regionTreePool`'s live-array return for the 'usta' region (world.ts:59 returns `journal` itself — F-090).

### 7. Elaborated feedback, not knowledge-of-results — and never a fail state

**Reference.** Wisniewski, Zierer & Hattie (2020), 'The Power of Feedback Revisited: A Meta-Analysis of Educational Feedback Research', Frontiers in Psychology — https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2019.03087/full (elaborated feedback d≈0.49 vs knowledge-of-results d≈0.05; d≈0.59 for higher-order outcomes)

**Why it works.** 'Right/wrong' leaves the wrong mental model completely intact — a tenfold difference in effect size versus feedback that carries information about how to succeed. For a 5-year-old, the shake-and-buzz also risks reading as disapproval while conveying nothing.

**Here.** F-035. `resolveTreeAnswer()` (src/game/LevelScene.ts:300): `if (!correct) { this.shake(CONFIG.tree.wrongShake, .15); sfx('hmm'); return; }` is textbook knowledge-of-results — plus `btn.classList.add('dim')` (ui.ts:421) and the tapped species' name spoken (ui.ts:418, which is genuinely the best teaching decision in the codebase and should be kept). Pair it with the P4 comparison beat and one spoken contrast line. The card has no exit and unlimited retries (`showRecognition`, ui.ts:399-427), so a child tapping left-to-right always succeeds within three taps — expected taps to success is 2. After the second wrong answer, reveal and teach rather than letting them grind to a lucky tap. Keep the cost at zero: the correction is information, not punishment.

### 8. Modality principle — for pre-readers the instruction channel is audio, and every instruction must use it

**Reference.** Mayer & Moreno, modality principle / cognitive theory of multimedia learning — https://pressbooks.pub/learningenvironmentsdesign/chapter/mlt-article-2/ ; Nielsen Norman Group, 'UX Design for Children (Ages 3–12)' (Nielsen & Gilutz) — https://www.nngroup.com/reports/children-on-the-web/ (recorded audio for non-readers; keep clips short — long directive audio irritates and slows children)

**Why it works.** Narration plus graphic beats on-screen text plus graphic because the two channels have separate limited capacity; the effect is strongest when material is complex and the pace is fast and not learner-controlled — an exact description of a side-scroller hint bar on a 2.2 s timer. And the stated audience cannot read the text at all.

**Here.** F-018 and F-068. All 17 `showHint` call sites push full sentences through `UI.showHint`/`playHint` (src/game/ui.ts:123-143) as `el.textContent` with no `speak()` anywhere in the path and no `aria-live` on `#hintBar` (index.html:97) — e.g. 'Kökler bir dostun kalbini bekliyor. Korkmuş canlıya dön! ← 🏖️ 💛' (i18n key `meadow.friendRequired`), visible unread in docs/evidence/before/L05-1.png. Route every hint through `speak()` (throttled, cancel-on-new) and add `aria-live="polite"`. `showTreeWake()` (ui.ts:441-453) calls `speak(nm)` only — the family line (ui.ts:447) and the `fact` (ui.ts:448), i.e. the actual botany payload, are never spoken, and are `display:none` on short-landscape phones (index.html:156,162), so on the primary device the teaching text is removed rather than replaced. Speak name → family → fact as one short utterance. Add a persistent 🔊 replay on the objective bar (`UI.setObjective`, ui.ts:144-150) that re-speaks the current objective on demand — that single control is the highest-leverage accessibility fix available.

### 9. A load-bearing audio channel needs an explicit failure model and a visible fallback

**Reference.** Game Accessibility Guidelines (Basic), 'Ensure no essential information is conveyed by sounds alone' and 'Provide separate volume controls or mutes for effects, speech and background/music' — https://gameaccessibilityguidelines.com/basic/ ; Web Speech API platform behaviour (async `voiceschanged`; iOS first-utterance gesture requirement)

**Why it works.** Making speech the primary instruction channel for pre-readers is correct — and it makes speech a single point of failure. Four known failure modes with no handling means an unknown fraction of children get a silent game with unreadable text and dead 🔊 buttons.

**Here.** F-029, F-030, F-026, F-008. `speak()` (src/game/audio.ts:127-135) has no `getVoices()` resolution, no `u.voice`, no `onerror`, and does `speechSynthesis.cancel(); speechSynthesis.speak(u)` back to back (a known Chrome drop race). Prime it inside the existing one-shot gesture at src/main.ts:88 (`window.addEventListener('pointerdown', () => initAudio(!!save.muted), { once: true })`) with a zero-length utterance — this unlocks iOS for the session; today the first auto-read fires from `doUse()` inside the rAF loop (LevelScene.ts:465 `if (i.useEdge) { this.doUse(); … }`), outside any gesture, so on iOS the very first spoken question is reliably dropped. Resolve voices once behind `voiceschanged` with a 1 s timeout; on failure set `speechAvailable = false` and hide the 🔊 affordances (`UI.sayBtn`, ui.ts:176-178) rather than shipping dead controls. Mute does not mute speech: `setMuted()` (audio.ts:18-21) ramps `masterGain` only while `speak()` bypasses the graph — add `if (muted) return;` plus `speechSynthesis.cancel()`, and split `SaveData.audio = { music, sfx, speech }` (src/core/save.ts:5-10) so a parent can kill the melody and keep the instruction. `wireSayButtons` is bound twice on the same nodes (ui.ts:166 via `show()` and again at ui.ts:425), so each 🔊 tap fires two utterances and the second cancels the first. And on iOS the Capacitor shell never sets an AVAudioSession category (ios/App/App/AppDelegate.swift), so the ringer switch silences the entire instruction channel while the in-game 🔊 still claims sound is on.

### 10. Never let colour alone carry a game rule — add a shape/glyph channel

**Reference.** WCAG 2.2 SC 1.4.1 Use of Color (Level A) — https://www.w3.org/WAI/WCAG21/Understanding/use-of-color.html ; Xbox Accessibility Guideline 103, 'Additional channels for visual and audio cues' — https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/103 ; Game Accessibility Guidelines (Basic), 'Ensure no essential information is conveyed by a fixed colour alone'

**Why it works.** XAG 103 states it plainly: anything critical to understanding gameplay that is expressed through colour also needs at least one additional signifier — shape, pattern, iconography or text. Around 1 in 12 men has a colour-vision deficiency, and red/green is the deutan/protan confusion pair. A second channel costs almost nothing and removes the dependency outright.

**Here.** F-024, F-025 — and the master plan's own D-decision ('Powers gain a shape/glyph channel'). `TOOLS` (src/core/config.ts:21-27) carries only `{ col, emoji }`; red `#ff6b4a` and green `#54c97a` are two of the five. Add `shape: 'hex'|'flame'|'leaf'|'spiral'|'diamond'`. The in-world marker `eyeMark()` inside `LevelScene.drawInteract()` (src/game/LevelScene.ts:1044-1048) draws three concentric `fillCircle`s in `TOOLS[eye].col` and nothing else — visible in docs/evidence/before/L05-1.png as a bare purple ring above the rock puzzle — while `UI.setPower()` (ui.ts:104-108) puts the emoji on the button it must be matched to. Render the glyph and a distinct ring silhouette inside every `eyeMark`, plus a dark halo (yellow `#ffcc3a` sits on coast grass `#e8d9a8` and mastery `#a8c25f` at very low luminance contrast, src/core/biomes.ts:56-62,77-83). Land this **before** M9 adds any puzzle requiring a *choice* between adjacent zones — `computeEquip()` (LevelScene.ts:210-220) auto-selecting the zone's own eye is the only reason this is currently major rather than blocker. Objective steps are the same defect at UI level: `.objectiveStep.done{background:#5fc77f}` vs `.current{background:#ffd36b}` on 21–25 px targets differing only in hue (index.html:99) — add ✓ on done, scale current 1.25× with a solid outline, keep pending outline-only, and add a greyscale-screenshot assertion to `npm run qa:levels`.

### 11. Figure-ground contrast is a playability requirement, not an aesthetic preference

**Reference.** WCAG 2.2 SC 1.4.11 Non-text Contrast (3:1 for graphical objects required to understand content); Xbox Accessibility Guideline 102 (Contrast) — https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/102

**Why it works.** If a child cannot see where the floor ends, none of the learning design matters — they are failing on perception, not on skill or knowledge, and a 5-year-old will not be able to say why. Under-contrast in a dark biome is a functional block.

**Here.** F-022 and F-077. Measured from src/core/biomes.ts:27-33: cave soil `#3c365a` vs skyBot `#0e0b1e` = 1.72:1, cave grass `#4a4470` vs its own soil = 1.26:1 (the standable top edge is invisible against the platform it caps), cave hillsMid vs skyMid = 1.03:1, Guardian purple `#7a52c8` vs cave soil = 2.07:1. Mostly a data edit — raise cave soil to ~`#4d4570` and grass to ~`#6f66a0`; plus a 2 px `grassLight` top-edge highlight in the platform pass of `LevelScene.draw()` (:674-680) so the standable surface is the brightest thing in a dark frame. The `dark: true` overlay (LevelScene.ts:737-739, `0x0a0718` at .62 alpha) composites on an already-crushed range and must be tuned to *reveal* that edge. Verify at 667×375 in daylight, not on a calibrated monitor. This dovetails with the contrast assertion already scoped for M1 in the master plan.

### 12. Respect flash thresholds and reduced-motion, and observe the setting live

**Reference.** WCAG 2.2 SC 2.3.1 Three Flashes or Below Threshold (Level A) — https://w3c.github.io/wcag21/understanding/three-flashes-or-below-threshold.html (children's shows and games are explicitly named as common offenders); CSS `prefers-reduced-motion`

**Why it works.** Photosensitive seizures can be triggered by content flashing above three times per second for more than a few flashes. Separately, for a five-year-old, strobing their own character off-screen at the moment of being hurt removes the one thing they are tracking, exactly when they are most confused.

**Here.** F-084 and F-085. `LevelScene.drawPlayer()` (:756-757): `const flick = p.iframe > 0 && Math.floor(this.t * 14) % 2 === 0; if (flick) return;` is a ~7 Hz on/off strobe of the player for the full `CONFIG.player.IFRAME: 1.2` s window (src/core/config.ts:5), above the three-flash threshold and not gated by reduced motion. Replace with a steady ~55 % opacity plus a bright outline. `reducedMotion` is sampled once in `create()` (LevelScene.ts:97) with no `change` listener, so toggling the OS setting does nothing until the next level, and the 24-circle restoration mote field (:728-733) ignores the flag entirely. Convert to `const mq = matchMedia('(prefers-reduced-motion: reduce)'); mq.addEventListener('change', e => this.setReducedMotion(e.matches))`. Extend it into audio as a 'Sakin mod' per F-085 (cap simultaneous voices, lengthen sfx attack to ~40 ms, high-pass the sfx bus) and surface it as an explicit in-game toggle — most parents will not have the OS setting on. Third piece: an 'angry' creature has no danger cue at all in the raster branch of `drawMonster()` (:899-917) — blind gets a blindfold bar and happy gets a glow, angry gets nothing — so the child cannot tell a creature that will hurt them from one that will not until contact. The vector fallback (:937-939) already draws an angry brow; port it.

### 13. Children's touch targets must be larger than the adult minimum, and interactive elements must never nest

**Reference.** Vatavu, Cramariuc & Schipor (2015), 'Touch interaction for children aged 3 to 6 years', Int. J. Human-Computer Studies — https://mintviz.usv.ro/publications/ijhcs2015.pdf (children miss Android's 9 mm targets ~1 in 6 attempts, and misses persist into the teens; taps land 3.4–4.5 mm off centre) ; NN/G, 'Design for Kids Based on Their Stage of Physical Development' — https://www.nngroup.com/articles/children-ux-physical-development/ ; WCAG 2.2 SC 2.5.5/2.5.8 as the adult floor

**Why it works.** 44 px is the *adult* minimum. A 5–8-year-old's motor precision is measurably worse and does not reach adult accuracy for another decade. In this build an under-size target does more than frustrate: it produces wrong answers.

**Here.** F-031 and F-074. `UI.sayBtn()` (src/game/ui.ts:176-178) emits `<span class="sayBtn" role="button">` **inside** `<button class="treeChoice">` (ui.ts:409-412). The span is 30 px (25 px on short-landscape phones, index.html:91/156) inside a 100 px parent (index.html:155), so a near-miss on 'listen' lands on the parent and registers as an answer — dimming a choice and forfeiting the streak. It is also invalid ARIA and, with no `tabindex`, keyboard-unreachable. Emit it as a sibling `<button type="button">` beneath the choice, or make the whole card speak on first tap and select on second. Other sub-44 px controls: `.top` 42 px (index.html:28), `.ghost` ≈31 px / ≈25 px under 720 px (:52,:141), `#rescueBtn` ≈33 px (:101), `.family-answer` ≈36 px (:56), `.mNode .sayBtn` 22 px (:118), `.langBtn` ≈30×26 px (:69). `.mNode` is a fixed 88 px positioned by percentage (:114) with no rule in the small-landscape media block (:145-166), so nodes crowd and overlap at 667 px. Target ≥48 px for anything a child taps during play.

### 14. Pre-reader navigation: pictogram plus short audio label plus text — never text alone

**Reference.** Nielsen Norman Group, 'UX Design for Children (Ages 3–12)' and 'Children's UX: Usability Issues in Designing for Young People' — https://www.nngroup.com/articles/childrens-websites-usability-issues/ (clear recorded audio for non-readers; abstract icons alone are insufficient for preschoolers, so pair icon with a short label; avoid long directive audio clips)

**Why it works.** The 3–5 and 6–8 bands need different treatment, and text-only differentiation excludes the younger half of the stated audience entirely. Icon-plus-label-plus-audio serves the pre-reader, the emerging reader and the reading adult from one component.

**Here.** F-019, F-069, F-100. `UI.showMenu()` (src/game/ui.ts:196-228) renders five or six buttons differentiated only by a text label, three of them identically styled `.ghost` pills ('Bölümler', 'Doğa Günlüğü', 'Nasıl Oynanır?') at ~25 px on phones, with no pictogram and no 🔊 — so a 5-year-old handed the phone cannot start the game. The fix already exists in the file: `sayBtn()` (ui.ts:176) is used correctly for map nodes (ui.ts:304) and tree names (ui.ts:412). Apply it plus a large pictogram (▶ / 🗺️ / 📖 / ❓ / 🌿) to every menu action at ≥56 px, and to `showPause` (:362), `showGameOver` (:369) and `showLevelComplete` (:376). Objective steps render emoji at sub-16 px (`.objectiveStep` 25 px / 21 px, index.html:99,146) — in docs/evidence/before/L05-1.png the middle step is an indistinct blob; raise to ≥34 px, use the project's own vector glyphs, let `#objectiveText` wrap instead of `white-space:nowrap; text-overflow:ellipsis` (index.html:100), and make every step in a sequence unique — the meadow's 7-step bar (LevelScene.ts:254) uses 💛 twice for two different actions, and levels 2–10 share one `['→','🏖️','✨']` (LevelScene.ts:263).

### 15. Plant knowledge sticks when it is relational, hands-on and habitat-honest

**Reference.** 'Trees in the Eyes of Young Learners: A Study on Knowledge and Educational Methods' (2025) — https://pmc.ncbi.nlm.nih.gov/articles/PMC12569609/ (knowledge is strongest for species tied to personal, hands-on, family-context experience; formally introduced species are not salient unless reinforced by lived interaction) ; Parsley (2020), 'Plant awareness disparity: a case for renaming plant blindness', Plants People Planet — https://nph.onlinelibrary.wiley.com/doi/full/10.1002/ppp3.10153

**Why it works.** PAD has four components — attitude, attention, knowledge, relative interest — and children default to grouping plants into an undifferentiated green mass. Anthropomorphising plants measurably raises interest and reduces PAD. This game's premise (trees with faces that you wake and that give you something) is already an unusually strong intervention; the failure is that the knowledge is decorative, and in one region factually wrong.

**Here.** F-036, F-087, and LEVEL_MATRIX row 3. Each species' `gift` string (src/core/trees.ts:9-17) is already written like a mechanic spec — 'Palamutlarıyla sincapları besler', 'Kökleriyle dere kenarlarını sağlamlaştırır', 'Rüzgardan koruyan sık bir duvar oluşturur'. Bind them to affordances the child uses (acorns feed a squirrel that carries a vine across a gap; willow roots knit a crossing; cedar's dense wall is the windbreak), then source the gate question from `gift`/`fact` with shape-matched distractors, so picture-matching fails and understanding succeeds. Fix the habitat lie: `src/core/world.ts:20` teaches `söğüt` (riverbank willow) and `zeytin` (Mediterranean olive) inside a cave — a game that promises 'learn trees and where they live' is currently mis-teaching habitat to five-year-olds. Fix the taxonomy: `huş` is `family: 'Kayıngiller'` (trees.ts:25) but is Betulaceae, and 'Huşgiller' already exists correctly on `fındık`/`kızılağaç` (trees.ts:45-46) — this also corrupts `familyStars()` (src/core/logic.ts:106-115), which is the journal's only structural learning surface. `sekoya` (Californian) is placed in Toros Yaylası (world.ts:22); `ıhlamur`'s 'Ihlamurgiller' is a deprecated family. All 26 family strings need a human botanical sign-off before submission — they are the game's factual claims.

### 16. Failure should cost time, never progress, and never be permanent

**Reference.** Game Accessibility Guidelines (Basic): 'Offer a wide choice of difficulty levels', 'Ensure controls are as simple as possible, or provide a simpler alternative' — https://gameaccessibilityguidelines.com/basic/ ; ICO Age Appropriate Design Code, standard 13 (nudges may be used to support wellbeing, including providing means to save progress) — https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services/

**Why it works.** Redoing content already solved is not practice, it is punishment — and it displaces exactly the spaced retrieval the game wants. For a 5-year-old, converting one bad minute into a ten-minute repeat is the reliable path to abandonment, and abandonment ends the learning.

**Here.** F-002, F-033, F-001, F-032. `onRetry: () => startLevel(currentIdx)` (src/main.ts:69) removes and rebuilds the scene, so `create()` (LevelScene.ts:84-98) resets `respawn` to `L.spawn`, clears every `interact.done`, every checkpoint and all boss state — on levels 3.5k–4.5k px wide with 3–4 checkpoints (src/core/levels.ts:38-76). Resume from the last checkpoint with hearts refilled and puzzle progress intact; reserve the full restart for the explicit ↻ button. Make pit falls always non-lethal: `this.L.gentle` is true on level 1 only (levels.ts:7; LevelScene.ts:595 `if (this.L.gentle) { reposition } else this.loseLife(true)`), and level 1 already proves it reads fine. The invisible assist can never fire on a real run: `assistFactors()` (src/core/logic.ts:96-103) needs `deaths > 2`, but `hearts: 3` (config.ts:11) ends the run at deaths 2, and `create()` resets `assist = { deaths: 0 }` (LevelScene.ts:94) — persist per level in `SaveData` and lower the threshold to `deaths - 1`. Drive the 12 s rescue off *lack of progress* rather than `engaged = left || right || healHeld || …` (LevelScene.ts:282-287), because a stuck child stops pressing; and make `rescueToSafety()` (:141-149) move them toward the objective instead of to `lastSafe`, which is wherever they already stand. Finally, unlock is strictly sequential (`canAccessLevel`, main.ts:76) with no bypass — auto-offer a skip after three game-overs on the same level.

### 17. Keep the pressure-free surfaces pressure-free

**Reference.** ICO Age Appropriate Design Code, standard 13 'Nudge techniques' — https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services/ (design features that lead users down the designer's preferred path; the Code permits only nudges that support the child's wellbeing) — and the accompanying prohibition on engagement-extending reward loops in services likely accessed by children

**Why it works.** Streaks, timers, completion percentages and star ratings are the standard engagement levers and the standard harms. This build has none of them, which is a genuine design achievement and is the easiest thing to lose during a polish pass by someone who has not read this note.

**Here.** F-110 — protect, do not 'improve': `UI.showJournal()` (src/game/ui.ts:341-360) has no counters, no completion percentage, no daily streak, no timers and no loss framing; the first-try streak in `streakAnswer()` (src/core/logic.ts:83-91) is session-only, never persisted, has no visible counter and no penalty; `over.body` in `src/core/i18n.ts` is kind ('Kalplerin tükendi — sorun yok, Koruyucu pes etmez!'); and `gainHeart` on empathy success (LevelScene.ts:424-426) means kindness gives back a life. The only defensible change is to surface the streak *wordlessly at the moment it lands* — three leaf tokens filling on the card inside `UI.confetti()` (ui.ts:180-193), the third bursting — or delete it, since as built it motivates nothing because the child cannot connect the extra confetti to anything they did. Do not persist it, and do not add daily streaks, timers, star ratings or completion percentages.

### 18. Never open a purchase surface from a child's success — and make the parental gate a real gate

**Reference.** Apple App Review Guidelines 1.3 (Kids Category) and 5.1.4 — https://developer.apple.com/app-store/review/guidelines/ : apps in the Kids Category must not include purchasing opportunities or other distractions unless reserved for a designated area behind a parental gate ; ICO Children's Code standard 13

**Why it works.** A gate whose answer is always in the same position teaches the pattern instead of blocking it. And routing a child from the emotional peak of the free content straight to a paywall is the textbook manipulative nudge the Children's Code names — a compliance risk as well as a design one, because it fronts a live RevenueCat paywall.

**Here.** F-017 and F-067. `UI.showFamilyGate()` (src/game/ui.ts:236-245): `const answers = [12, 15, 18];` rendered in array order, correct answer 15 always the middle button, and a wrong tap costs nothing — no disable, no delay, no reshuffle, no attempt limit (`if (Number(...) !== 15) { sfx('hmm'); this.showHint(...); return; }`). Randomize the operands per open, shuffle positions, spell the numbers as words so they cannot be pattern-matched against the digits in `family.question` (src/core/i18n.ts), add a 3 s cooldown and 3-attempt back-off; assert answer-index variance across opens in `tests/ui.test.ts`. Separately: `onNextLevel: () => hasFullJourney() ? startLevel(currentIdx + 1) : ui.showFamilyGate()` (src/main.ts:70) sends the level-complete card's biggest, brightest primary button — labelled 'Zümrüt Zirveler'e Geç →' and shown at the emotional peak of the free chapter — straight to the gate, and all nine locked map nodes do the same on a single tap (ui.ts:331-333) while wearing a gold glow ring that reads as reward, not lock (ui.ts:298; index.html:120). Land the celebration on the journey map; make a premium node say (spoken + pictogram) that a grown-up can open this path, and require a deliberate second action through a quieter 'Aile Alanı' entry; reserve the gold ring for the next *playable* node.

### 19. The learning payload must exist in the language the child is playing in

**Reference.** Dual-coding/modality principle (Mayer) requires a verbal code the learner can decode — https://pressbooks.pub/learningenvironmentsdesign/chapter/mlt-article-2/ ; NN/G children's UX guidance on age-appropriate recorded audio — https://www.nngroup.com/reports/children-on-the-web/

**Why it works.** Every principle above that routes through language — spoken names, elaborated feedback, contrast lines, family grouping — silently fails if the string is in a language the child does not speak. It is worse than absent, because `speak()` sets `u.lang` from the UI language and hands Turkish text to an English voice.

**Here.** F-023. `TreeDef.family`, `desc`, `gift` and `fact` are plain `string` while `name` is already `Record<Lang, string>` (src/core/trees.ts:9-17), so an English child who wakes the Oak reads 'Palamut ağacı', 'Aile: Kayıngiller' and '🌱 Bir meşe 500 yıldan uzun yaşayabilir!' (rendered at src/game/ui.ts:446-448). `familyStars()` keys are used directly as display labels (ui.ts:344), so the EN/DE journal is a list of Turkish taxonomy — and family grouping is the journal's only structural learning mechanic. Level names are Turkish literals (src/core/levels.ts:7,38,80,124) interpolated into localized cards (ui.ts:383). Roughly 13 intro hints render raw `intro.text` rather than through `S()` (LevelScene.ts:614; default at src/core/generator.ts:99). Promote the four fields to `Record<Lang, string>` or move them into the STR tables as `tree.<id>.fact` keys so the existing per-key TR fallback in src/core/i18n.ts applies; give levels a `nameKey`; route generated intros through `S()`. `speak()` sets `u.lang = SPEECH_LOCALE[getLang()]` (src/game/audio.ts:130), so this is an audio bug too. Add the test F-023 asks for: no rendered string in EN/DE mode matches a Turkish-only character class outside brand names.

**Notes.** SEQUENCING. The 19 principles are not equal-cost. Three tiers:

(1) DEPENDENCY-FIRST, do before anything else in M7 — the save-schema change in P2 (`SaveData.journal: string[]` → a review record, src/core/save.ts:5-10, with a v2→v3 migration beside the existing v1→v2 path at save.ts:28-36). P4's error-weighted distractors, P3's compare-beat targeting, P19's teach-before-test, and level 10's "weakest four" (src/core/levels.ts:169-170) all read from it. It is also a data migration, so it gets strictly more expensive the more saves exist in the wild. M5 (chapter scripts) and M9 (per-level mechanics) both want to ask "does this child know species X" — building them before the record exists means retrofitting both.

(2) CHEAP AND HIGH-VALUE, hours not days — `if (muted) return;` in `speak()` (audio.ts:127); the `huş` family typo, one string (trees.ts:25); the i-frame strobe, two lines (LevelScene.ts:756-757); `syncMuteIcon()` in `bindChrome()`, two lines (ui.ts:65); the `shape` field on TOOLS plus glyph rendering in `eyeMark` (config.ts:21-27 + LevelScene.ts:1044-1048); speech priming in the existing gesture listener (main.ts:88); the double `wireSayButtons` bind (drop ui.ts:425). Every one of these is a blocker- or major-severity audit finding closed for under an hour.

(3) STRUCTURAL — P1 (intrinsic integration) and P5/P14 (real clue art). These are the two that decide whether this is an award game or a platformer with a quiz. P14 in particular is cheap relative to its impact: `LevelScene.drawTree()` (:976-1035) already renders six distinct crowns from `TreeDef.crown`, so the honest silhouette tier is an extraction, not a new renderer.

DISAGREEMENT WITH THE MASTER PLAN, flagged not relitigated. M7 ("Learning that transfers") is marked SHOULD and M8 ("Wordless play") SHOULD, while M1–M6 (all visual/audio identity) are MUST. For a game whose stated purpose is tree recognition for pre-readers, the two droppable milestones are the two that contain the product's actual thesis. I am not asking to reorder the visual work — D1/D3 are sound and the seam the plan describes is real. I am asking that the *save-schema slice of M7* and the *shape-channel slice of M8* be promoted into the MUST set, because both are dependencies of later MUST work rather than polish on top of it, and both are small. Everything else in M7/M8 can stay SHOULD.

ALSO WORTH THE OWNER'S ATTENTION. The portrait lockout (F-028) is "kept for now, recorded not scheduled" in the plan. From a children's-accessibility standpoint that is the weakest of the plan's decisions: a kids' tablet with rotation lock engaged is an extremely common configuration, and the block is wordless (📱 ↻🔄↻, index.html:130-135,193), has no "play anyway", no adult-readable line, and pauses any running level from main.ts. An iPad at 768×1024 is blocked even though the 960×540 canvas would letterbox comfortably. A single adult-readable sentence plus a "play anyway" button is a fraction of the cost of a second UI and removes the hard exclusion.

VERIFICATION I WOULD ADD TO CI, all mechanical. (a) Greyscale-screenshot assertion in `npm run qa:levels` — the three objective-step states and the five eye marks must be distinguishable with hue removed (P8, P10). (b) `tests/clues.test.ts` — pairwise pixel-hash inequality at 128 px for every species within every region's clue tier, plus clue-vs-choice-thumbnail inequality for all 26 species (P14; this test alone would have caught the byte-identical bark swatches and the identical photo pair). (c) Parental-gate answer-index variance across N opens, in `tests/ui.test.ts` (P17). (d) No Turkish-only character class in any rendered EN/DE string outside brand names (P18). (e) A review-schedule unit test: a species answered wrong is re-queued before a species answered right (P2). (f) The existing 109-test suite has zero coverage of audio, mute, or speech — P7 and P9 need their first tests.

WHAT I COULD NOT ESTABLISH. Everything above is from the literature and from reading the code; none of it is from this game's players. No child playtesting appears anywhere in docs/. Before submission I would want five children aged 5–8, twenty minutes each, unassisted, with two specific measures: can they start the game from the menu without an adult (tests P12), and one week later can they name three species they woke (tests P2 and P19 — and gives the only honest answer to whether the recognition loop teaches anything at all). Separately, the 26 family strings in src/core/trees.ts need a Turkish primary-science or botanical sign-off; F-087 found two errors by inspection in a dataset nobody had checked, which is not a reassuring hit rate for the game's factual claims.

ONE THING TO PROTECT. The single best teaching decision in the codebase is easy to lose: `speak(treeName(btn.dataset.id!))` at src/game/ui.ts:418 speaks the name of *whatever the child tapped*, including wrong picks — so every tap teaches a name-to-image pairing regardless of outcome. Any refactor of `showRecognition()` for P3/P5/P6 must keep it.

---
