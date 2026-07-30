# Findings register

Produced by a parallel audit team on 2026-07-29 against commit `3330301`: a repository/
architecture analyst, an art-direction analyst, an audio-systems analyst, a children's
learning/accessibility/safety reviewer, and two level-design auditors.

Every finding cites file:line, a screenshot in `docs/evidence/before/`, or a measurement.

**111 findings** — 23 blocker, 60 major, 25 minor, 3 polish.

Effort is S/M/L/XL. Status is maintained by hand as work lands.

---

## BLOCKER

### F-001 · Failure loop  `S`

**Observation.** The invisible assist can never fire on a normal run. `assistFactors` only produces non-identity values when `deaths > 2`, but the player has exactly 3 hearts and `loseLife` returns to the game-over path the moment `hearts <= 0`, so `deaths` reaches at most 2 before the run ends — simulated: deaths 1 → over 0, deaths 2 → over 0, deaths 3 → game over before any assist is computed. `create()` then resets `assist = { deaths: 0 }` on every retry, so a struggling child never accumulates across attempts either. The mechanism is unit-tested at `deaths: 20`, a state the game cannot reach except via the heal-a-monster heart refund — i.e. it only helps children already succeeding.

**Evidence.** src/core/config.ts:11 (`hearts: 3`); src/core/logic.ts:96-103 (`over = Math.max(0, a.deaths - 2)`); src/game/LevelScene.ts:413-423 (`if (this.hearts <= 0) { … onGameOver(); return; }` precedes `assistFactors`); src/game/LevelScene.ts:94 (`this.assist = { deaths: 0 }` in `create()`); tests/core.test.ts:293-295 (asserts identity at deaths 0 and 2, effects only at deaths 20).

**Recommendation.** Persist assist across attempts (move `deaths` into SaveData keyed by level, or at minimum do not reset it in `create()` when re-entering the same level), and lower the threshold to `deaths - 1` so it engages on the second life. Add a regression test that plays a level to game-over and asserts `monsterSpd < 1` on the following attempt.

---

### F-002 · Failure loop  `M`

**Observation.** Running out of hearts throws away the whole level. `onGameOver` → `showGameOver` → `onRetry: () => startLevel(currentIdx)`, which rebuilds the scene and calls `create()`, resetting `respawn` to `L.spawn`, clearing every `interact.done`, every checkpoint and the boss state. Levels 5–10 are 3.5k–4.5k px wide with 3 checkpoints; a child who loses their third heart at the boss restarts at x=90 and must redo every puzzle. Only the journal survives. For a 5-year-old this converts one bad minute into a ten-minute repeat and is the single least kind thing in the game.

**Evidence.** src/main.ts:69 (`onRetry: () => startLevel(currentIdx)`); src/main.ts (`startLevel` → `game.scene.remove` then `new LevelScene()`); src/game/LevelScene.ts:84-98 (`create()` re-runs `prepLevel`, resets `respawn`, `bossActive`, `sandLeft`); src/core/levels.ts:38-76 (level2 `w: 4400`, 4 checkpoints).

**Recommendation.** Make game-over resume from the last checkpoint with hearts refilled and `interact`/boss progress intact — serialize the runtime state before tearing down, or keep the scene alive and only reset the player. Reserve the full restart for the explicit ↻ button. Consider making the third heart loss a scripted 'gentle pause' that hands back two hearts at the checkpoint rather than a run-ending state at all.

---

### F-003 · Learning design — clue tiers  `M`

**Observation.** The bark tier is unanswerable in 2 of its 3 regions because `drawBarkSwatch` has only 8 branches and several species share one with no per-species variation. In Toros Yaylası (bark tier) 'toros sediri' and 'ardıç' both fall into the `['çam','servi','toros sediri','ardıç','ladin']` branch, which uses a single hard-coded fill and stroke — the two clue images are byte-identical. In Akdeniz Kıyısı 'incir' and 'limon' both fall to the `else` default branch, also identical. In those regions the question "which tree has this bark?" has two indistinguishable correct-looking answers, so it is pure luck.

**Evidence.** src/game/art.ts:288-290 (shared conifer branch, no species parameter used inside); src/game/art.ts:300-303 (default branch); src/core/world.ts:22,24 (`toros` treeSet = toros sediri/ardıç/sekoya; `akdeniz` = palmiye/incir/limon, both `clueTier: 'bark'`); verified by branch-mapping the three bark regions — toros: 2/3 identical, akdeniz: 2/3 identical, meyve: 3/3 distinct.

**Recommendation.** Give every species its own bark parameters (base colour, fissure pitch, fissure depth, plate shape, lenticel pattern) as data in TREES rather than an if-chain in art.ts, and add a build-time test that asserts every bark-tier region's species produce pairwise-different pixel hashes at 128px. The same test should run for silhouettes.

---

### F-004 · Learning design — quiz integrity  `M`

**Observation.** Tree recognition is a 1-in-3 guess with no cost, and the three options are always the same three species. `pick3(correctId, pool)` takes `pool = regionTreePool()` which for 7 of the 10 regions is a treeSet of exactly 3 species, so `others.slice(0, 2)` is *every* other tree in the region — there is zero distractor variance. Wrong answers only dim the button, play 'hmm', shake 6px and leave the card open for unlimited retries. A child who taps left-to-right always succeeds within 3 taps; expected taps to success is 2. Nothing in the loop requires having looked at the clue.

**Evidence.** src/core/logic.ts:62-72 (`pick3`); src/core/world.ts:18-28 (7 regions have exactly 3 species in `treeSet`); src/core/world.ts:51-55 (`regionTreePool` returns `r.treeSet`); src/game/ui.ts:414-424 (wrong answer = `btn.classList.add('dim')` only); src/game/LevelScene.ts:300 (`if (!correct) { shake; sfx('hmm'); return; }` — card stays open).

**Recommendation.** Draw distractors from the whole journal, not the region, and weight them by confusability: prefer species sharing `crown` or `family` with the answer, and species this child previously got wrong. Add a per-species attempt record to SaveData (`{id, tries, lastWrongAt}`). Make the first wrong answer remove that option *and* re-order the remaining two, so a second guess is still a decision. Keep zero punishment — the fix is information, not cost.

---

### F-005 · Learning design — retention  `M`

**Observation.** Every species is quizzed exactly once in the entire game, then never again. `prepLevel` marks any tree already in the journal as `awake`, so it spawns pre-solved and raises no card. There is no spaced repetition, no review scheduler, and no re-test on failure. The only revisit is level 10, which draws `journal.slice(-6)` and quizzes the first 4 — i.e. the six *most recently* learned species, which are precisely the ones needing review least. Species that appear in two regions (`kayın` in regions 4 and 8, `söğüt` in regions 3 and 9) are silently skipped the second time.

**Evidence.** src/core/world.ts:46 (`awake: journal.includes(tr.id) && LEVEL_META[idx].regionId !== 'usta'`); src/core/levels.ts:169-170 (`pool = journal.slice(-6)`, `treeIds = pool.slice(0, 4)`); src/core/world.ts:21,25 (`kayın` in both `kestane` and `karadeniz` treeSets).

**Recommendation.** Replace the binary journal with a review queue: store `{id, firstTryCorrect, seenCount, dueAtLevel}`. A species becomes `awake` only if it is not due. Schedule reviews at +2 and +5 levels after first learning, and immediately re-queue any species answered wrong. Let level 10 pull the *weakest* four (lowest first-try rate), not the newest four.

---

### F-006 · Music engine — lifecycle & context suspension  `S`

**Observation.** The AudioContext is resumed exactly once, at construction, and never again — while the music scheduler is a self-rescheduling setTimeout chain with no stop path and no visibility awareness. When iOS Safari/WKWebView suspends the context (app switch, screen lock, incoming call, Control Centre pull-down), `audio.currentTime` freezes but the timer keeps firing `musicTick()`, and every tick schedules `o.start(t0)` and `g.gain.linearRampToValueAtTime(x, t0 + .045)` against the SAME frozen t0. Those oscillators are queued, not dropped. The instant the context resumes, all of them fire simultaneously — a minute in the background is ~140 stacked note-pairs detonating at once, into a 5-year-old's ears, at a gain stage with no limiter (see the mix-architecture finding). On desktop Chrome the failure inverts: the context does NOT suspend on tab hide, so the music simply keeps playing to an empty room at throttled 1 Hz timer resolution.

**Evidence.** src/game/audio.ts:15 `audio.resume?.();` — the only resume call in the codebase, and its promise is unhandled (rejects on Safari when called outside a gesture). src/game/audio.ts:116-123 `startMusic()` — `musicTimer = window.setTimeout(schedule, ...)` with no `stopMusic`, no `clearTimeout`; `grep -rn "stopMusic|clearTimeout(musicTimer)" src/` returns zero hits. src/game/audio.ts:97 `const score = SCORE[musicMood], t0 = audio.currentTime;`. src/main.ts:105 — the one `visibilitychange` handler calls `releaseInterruptedInput()` only and never touches audio. src/main.ts:118 `startMusic()` runs at module top level, before any gesture and before `initAudio` has created a context.

**Recommendation.** Four changes, all small. (1) Add `stopMusic()` that clears the timer/interval and nulls the handle. (2) `document.addEventListener('visibilitychange', ...)`: on hide `stopMusic(); void ctx.suspend().catch(()=>{})`; on show `ctx.resume().then(() => { nextStepTime = ctx.currentTime + 0.05; startMusic(); })`. Re-seeding `nextStepTime` from the live clock is what structurally kills the pile-up. (3) `ctx.onstatechange = () => { if (ctx.state !== 'running') armGestureResume(); }` where `armGestureResume` attaches a `{once:true}` pointerdown+keydown+touchend listener that retries `resume()` — this is the only reliable recovery on iOS after an interruption. (4) `.catch(()=>{})` the resume promise so Safari does not log unhandled rejections. Fold this into the lookahead scheduler rewrite so the restart path exists in one place.

---

### F-007 · Music engine — mood coverage vs. 10 biomes  `L`

**Observation.** There are three musical moods for ten biomes, and only two of them are ever reachable in gameplay. `startLevel()` sets `setMusicMood('meadow')` unconditionally for every level, and `'restored'` has exactly one call site which is gated on `this.idx === 0`. So Zümrüt Zirveler, Kristal Mağaralar, Kestane Ormanı, Toros Yaylası, Meyve Bahçesi, Akdeniz Kıyısı, Karadeniz, Göl Kıyısı and Usta Bahçesi all play the identical 8-note C-major-pentatonic phrase at the identical 430 ms pace, for the entire game, forever. `setMusicOn()` is exported and called from nowhere — dead API. The project's own docs sell this as a shipped pillar, so the gap is also a submission-claim risk, not only a quality gap.

**Evidence.** src/game/audio.ts:85-89 — `SCORE` has three keys. src/main.ts:51 `setMusicMood('meadow');` inside `startLevel`, unconditional. src/game/LevelScene.ts:321 `setMusicMood('restored')` inside `beginMeadowRestoration()`, reachable only via `resolveTreeAnswer` → `isFinalMeadowOak = this.idx === 0 && tr.x > 2800`. src/game/ui.ts:197 `setMusicMood('menu')`. `grep -rn setMusicOn src/` → definition only (audio.ts:93). docs/SHIPATON_2026.md:74 "an adaptive musical layer", :85 "adaptive sound"; docs/REBUILD_PLAN.md:85 "per-biome ambient soundscape + gentle music". Ground truth from the shots: L03-1.png (near-black violet cave, tall stone columns, lantern pools) and L06-1.png (flat peach wash, bright green grass caps, blossom light) are the two most visually distant scenes in the game and are bit-identical in audio.

**Recommendation.** Replace the mood enum with the layered state machine (separate finding) driven by the per-biome data table (separate finding). If schedule forces a minimum viable step first: keep the existing tick but read `root`, `scale` and `pace` from `BIOME_SOUND[level.biome]` and derive `melody`/`bass` by mapping scale degrees onto the root instead of hard-coding Hz arrays. That is ~30 lines, no architectural change, and it alone makes all ten biomes immediately distinguishable — the single highest quality-per-line change available in the audio system.

---

### F-008 · Platform — iOS audio session (Capacitor shell)  `S`

**Observation.** The Capacitor iOS project never configures AVAudioSession. WKWebView's default category is Ambient/SoloAmbient, which is silenced by the physical Ring/Silent switch, by Focus modes, and by the Camera. A parent handing over an iPhone with the ringer switch flipped off gets a completely silent game — no music, no sfx, and critically no speech-synthesis tree names — while the in-game 🔊 button still reports sound is ON, giving the child and the parent no way to diagnose it. This is the most likely single-device demo failure for the Shipaton submission, and it silently disables the game's entire pre-reader instruction channel (every recognition card is audio-first by design).

**Evidence.** ios/App/App/AppDelegate.swift — `didFinishLaunchingWithOptions` is the untouched Capacitor template (`return true`, no AVAudioSession call); `applicationWillResignActive` / `applicationDidBecomeActive` are empty stubs, so interruptions are not handled either. `grep -i 'audio|UIBackgroundModes' ios/App/App/Info.plist` → no matches. capacitor.config.json declares only appId/webDir/backgroundColor. The web layer's sole audio path is src/game/audio.ts, which rides whatever session the shell provides.

**Recommendation.** In AppDelegate.didFinishLaunchingWithOptions: `try? AVAudioSession.sharedInstance().setCategory(.playback, mode: .default, options: [.mixWithOthers]); try? AVAudioSession.sharedInstance().setActive(true)`. `.playback` is the correct category for a title whose instructions are spoken — it overrides the silent switch. `.mixWithOthers` means a parent's podcast keeps playing instead of being stolen, which matches the product's tone. Additionally subscribe to `AVAudioSession.interruptionNotification` and, on `.ended`, evaluate the webview JS hook that calls `ctx.resume()` (pairs with the visibilitychange fix). Add a one-line assertion to the device QA pass (scripts/device-shots.mjs family) that audio plays with the silent switch engaged, otherwise this regresses invisibly on every `cap sync`.

---

### F-009 · Q1 identity-blocker · chapter script  `L`

**Observation.** Level 1's entire bespoke chapter — the companion, the two heart-stones, the root gate, the ancient oak, the restoration choreography — lives inside LevelScene as one private struct plus four private methods, gated by eleven separate `this.idx === 0` checks scattered across the update loop, the collision function, the input handler and the renderer. Giving Level 2 a bespoke finale under this shape means adding `idx === 1` branches to the same eleven sites; the file grows O(levels × beats).

**Evidence.** src/game/LevelScene.ts:70 (`meadowStory` struct on the Scene), and the eleven gates: :182 (solids), :243 (doUse), :253 (objective), :282 (rescue heuristic), :307 (tree answer), :479 (proximity hint), :507 + :513-544 (companion AI, 32 lines inside the monster loop), :613 (intro localisation), :691 (drawMeadowStory), :694 (drawAncientOak). Plus four dedicated methods: :313 `beginMeadowRestoration`, :323 `updateMeadowRestoration`, :791 `drawMeadowStory`, :845 `drawAncientOak`.

**Recommendation.** Define a Chapter interface and register one per level; LevelScene calls into it instead of branching on idx.
```ts
export interface Chapter {
  id: string;
  extraSolids?(s: ChapterCtx): Rect[];             // replaces LevelScene.ts:182
  objective(s: ChapterCtx): { steps: string[]; current: number; labelKey: string };
  onUse?(s: ChapterCtx): 'handled' | 'pass';        // replaces :243
  onHealed?(m: MonsterRuntime, s: ChapterCtx): void; // replaces :507
  update?(dt: number, s: ChapterCtx): 'takeover' | void; // replaces :513-544 and :323
  draw?(g: Graphics, s: ChapterCtx): void;          // replaces :691, :694
  introKey?(i: number): string | null;              // replaces :613
}
```
`ChapterCtx` is a narrow read/write view of the scene (`player`, `L`, `monsters`, `t`, `cam`, `spawnP`, `showHint`, `flash`, `shake`, `complete`) — not the Scene itself, so a chapter cannot reach into physics. Ship `MEADOW_CHAPTER` first as a pure move with zero behaviour change; the default chapter is the generic explore→boss→done script. Keep `LevelScene.meadowStory` as a getter delegating to the chapter's state, because tests/scene.test.ts:96,101,105-106,111,123 read and write `scene.meadowStory` directly.

---

### F-010 · Q1 identity-blocker · creatures  `L`

**Observation.** There is exactly one creature in the game and it is drawn unconditionally from a Meadow-specific raster key, so the Meadow's painted Mossling appears in the crystal cave, on the Mediterranean coast and in the mastery garden. `drawMonster` calls `art('character.mossling')` with no biome, species or level check.

**Evidence.** src/game/LevelScene.ts:899 `const mossling = art('character.mossling');` — inside `drawMonster`, reached for every monster on every level; the biome guard used for the environment (:636-644) is absent here. Visually confirmed in the supplied screenshots: the identical Mossling sprite appears in `shots/L03-2.png` (cave), `shots/L05-1.png` (Toros plateau) and `shots/L10-2.png` (mastery). `src/game/assets.ts:14,27` — `character.mossling` is the only creature key that exists.

**Recommendation.** Add a creature registry keyed by species and give `MonsterData` a real species field that reaches the renderer. `src/core/creatures.ts`:
```ts
export interface Species {
  id: string; box: {w:number;h:number};
  art?: { idle: ArtKey; scale: number; aspect: number };  // raster path
  vector: (g: Graphics, m: MonsterRuntime, t: number) => void; // fallback/ident
  palette: { angry:number; blind:number; happy:number };
  behaviour?: 'walker'|'flipper'|'hopper'|'drifter';
  voice?: SfxKey;
}
export const SPECIES: Record<string, Species>;
```
`makeMonster` (src/core/logic.ts:18-27) already merges `w`/`h` defaults — take them from `SPECIES[d.species].box` instead of the hardcoded `w: 40, h: 40` on line 20. `drawMonster` becomes a 6-line dispatcher: resolve species → raster if available → else `species.vector(g, m, this.t)`. Note the render test asserts the 40×40 vector body still exists on L1/L2 (tests/render.test.ts:57,80), so keep the default species' box at 40×40.

---

### F-011 · Q1 identity-blocker · level geometry  `L`

**Observation.** Levels 4–10 are structurally the same level. `makeSection` walks a fixed six-entry rhythm array with a fixed 140px gap; the only per-level variation is `Math.min(30, tier*6)` added to the gap and the number of tree/puzzle pairs. There is no slot for a set-piece, a vertical section, a water crossing, a differing platform count or a unique traversal beat.

**Evidence.** src/core/generator.ts:47-51 (`SECTION_RHYTHM` = 6 fixed `{w,h}` pairs, `GAP = 140`), :68-71 (`const r = SECTION_RHYTHM[i % SECTION_RHYTHM.length], y = 370 - ((Math.floor(i/2) % 3) * 6); … x += r.w + GAP + Math.min(30, tier*6)`), :65-66 (`pairCount`/`segCount` are the only structural knobs). Confirmed by `shots/level-report.json`: levels 4–9 all have exactly 8 platforms, 3 trees, 3 puzzles, 3 monsters, widths 4196/4244/4244/4292/4292/4340 — the widths differ only by the tier term. tests/core.test.ts:138-149 locks the fixed-gap invariant in place.

**Recommendation.** Keep `makeSection` (the proven fair-gap generator) but make the rhythm a parameter and add an explicit set-piece slot on `Recipe`:
```ts
export interface Recipe {
  …
  rhythm?: { w: number; h: number }[];   // defaults to SECTION_RHYTHM
  gap?: number;                           // defaults to GAP
  setPieces?: { afterSegment: number; build: (x: number, gy: number) => Partial<LevelData> }[];
}
```
`setPieces` splice authored geometry (a lake, a chasm, a climbing spiral, a cave mouth) between generated segments. The existing fixed-gap test still passes because the default rhythm/gap are unchanged; add a companion test asserting that every set-piece's entry and exit gaps are ≤ `GAP + 30`.

---

### F-012 · Q1 identity-blocker · objectives  `M`

**Observation.** `updateObjective()` is a hardcoded two-branch `if`: branch one is Level 1's entire seven-step script written inline against `this.L.interact[0..2]` by array index, branch two is a fixed three-step `['→','🏖️','✨']` used verbatim by all nine other levels. There is no per-level objective data at all.

**Evidence.** src/game/LevelScene.ts:251-273 — `:253 if (this.idx === 0)` … `:254 steps = ['❄️','💛','🌿','🌀','💛','🌳','✨']` with seven `else if` clauses reading `this.L.interact[0]?.done`, `this.meadowStory.helper`, `this.L.trees.find(tr => tr.x > 2800)?.awake`; `:262-266 else { steps = ['→','🏖️','✨']; … label = this.bossActive ? S('objective.boss') : S('objective.explore') }`. Screenshots `shots/L02-*.png` through `shots/L10-*.png` all show the identical bar `→ 🏖️ ✨  Follow the glowing path`.

**Recommendation.** Move the objective to data: a per-level `ObjectiveStep[]` where each step is `{ icon: string; labelKey: string; done: (s: ChapterState) => boolean }`, evaluated top-down to find the current index. Level 1's seven clauses become seven entries in `src/core/chapters/meadow.ts`; the generic three-step becomes the default array in `makeSection`. `updateObjective` shrinks to ~8 lines and keeps its existing `objectiveKey` change-detection (:267-272) so `setObjective` DOM writes stay rate-limited.

---

### F-013 · Q1 identity-blocker · renderer  `M`

**Observation.** The world renderer is not biome-dispatched — it is Meadow-dispatched. `LevelScene.draw()` resolves raster art through seven literal `this.L.biome === 'meadow'` comparisons and then falls back to flat vector primitives for everything else. There is no indirection layer between "which biome am I" and "which images do I draw", so adding art for biome 2 means editing the 1128-line gameplay file, and adding art for biomes 2–10 means nine more copies of the same block.

**Evidence.** src/game/LevelScene.ts:636-644 (`meadowFar`/`meadowMidground`/`meadowForeground`/`meadowSoil`/`meadowGrass` each guarded by `this.L.biome === 'meadow' ? art(...) : null`), :647-656 (raster far plate vs. procedural gradient+ellipse hills), :657 (`if (this.L.biome === 'meadow') drawMeadowMidground(...)`), :669-680 (soil/grass tiles vs. rounded-rect fallback), :723 (`if (meadowForeground) drawMeadowForeground(...)`). `src/game/assets.ts:5-30` — all 11 ArtKeys are `meadow.*` or `character.*`; there is no key namespace for any other biome.

**Recommendation.** Introduce a per-biome asset manifest and make `draw()` read it instead of comparing strings. Concretely, in a new `src/game/biomeArt.ts`:
```ts
export interface BiomeArt {
  far?: ArtKey; midground?: ArtKey; midParallax?: number;
  foreground?: ArtKey[]; fgParallax?: number; fgStride?: number;
  soil?: ArtKey; soilTile?: number; grass?: ArtKey; grassTileW?: number;
}
export const BIOME_ART: Partial<Record<string, BiomeArt>> = { meadow: {...} };
```
Then `draw()` becomes `const A = BIOME_ART[this.L.biome!]; const far = A?.far ? art(A.far) : null;` and the existing `drawMeadowMidground`/`drawMeadowForeground` become `drawParallaxMidground`/`drawFoliageBand` taking the manifest's parallax/stride instead of module constants (src/game/meadowEnvironment.ts:3-4 hardcodes `MIDGROUND_PARALLAX = 0.28`, `FOREGROUND_PARALLAX = 1.08`, and :57 hardcodes `stride = 690`). Zero behaviour change for Meadow; biome 2 becomes a data entry plus files in `public/art/<biome>/`.

---

### F-014 · Q4 bug (NEW) · Level 1 is unwinnable on every replay  `S`

**Observation.** Once the child has learned 'meşe', Level 1 can never be completed again. `prepLevel` marks journal trees as already awake; `nearTree` only ever selects non-awake trees; the recognition card is the only trigger for `beginMeadowRestoration()`; and restoration is Level 1's only completion path because it has no boss and no goal. Since learning 'meşe' *is* Level 1's finale, this fires for 100% of players who finish it and then replay — via the journey map, via 'Continue', or via the in-game restart button. The objective bar also sits on its final step ('Watch the meadow awaken') from frame zero, telling the child to wait for something that will never happen.

**Evidence.** src/core/world.ts:46 `awake: journal.includes(tr.id) && LEVEL_META[idx].regionId !== 'usta'` — the 'usta' region is excluded, 'cayir' is not. src/game/LevelScene.ts:497-501 `for (const tr of this.L.trees) { if (tr.awake) continue; … this.nearTree = tr }`. :232-236 `if (this.nearTree && !this.nearTree.awake) { … showTreeQuestion(...) }` — the only route to `resolveTreeAnswer`. :307-311 `isFinalMeadowOak` → :310 `this.beginMeadowRestoration()`. :427-431 `completeLevel()` has exactly three callers: :393 (boss defeated), :598 (goal reached), :352 (restoration ≥ 4.1s) — and `prepLevel(0).boss === null`, `.goal === null` (asserted by tests/core.test.ts:28,92). Reachable from src/main.ts:73 (`onRestartLevel`), :206/:320 (map node → `onStart(0)`). **Proven with a scratch vitest run**: booting idx 0 with `journal = ['meşe','çınar','ıhlamur']`, teleporting the player onto the oak, and running 600 frames with the use button held yields `nearTree === null`, `meadowStory.restoring === 0`, and zero `onLevelComplete` events.

**Recommendation.** Root cause is that 'already learned' is being used as 'already resolved for this playthrough'. Fix by separating the two: keep the journal-awake state as a *visual* head start but require the chapter's own beat. Minimal safe fix — in `prepLevel`, never pre-wake a tree that a chapter depends on:
```ts
lv.trees = (lv.trees||[]).map(tr => ({ ...tr, awake: journal.includes(tr.id) && !LEVEL_META[idx].keyTree && LEVEL_META[idx].regionId !== 'usta' }));
```
Better: give `TreeInstance` a `role?: 'ambient' | 'chapter-key'` and never pre-wake `chapter-key` trees. Regression test: `prepLevel(0, ['meşe']).trees.find(t => t.x > 2800)!.awake === false`, plus a scene test that boots idx 0 with a full journal and asserts `onLevelComplete` still fires after the finale sequence. Consider the same treatment for levels 2–9, where pre-waking silently deletes the level's entire learning content on replay (not a softlock there, since the boss is the exit — but it is content loss).

---

### F-015 · Q4 bug (a) · hint queue leak — CONFIRMED, wider than reported  `S`

**Observation.** CONFIRMED, and the blast radius is larger than described: the hint bar and its queue are never cleared on level change, on returning to the menu, or on opening the journey map. `UI` exposes no reset, `LevelScene.create()` clears its own state but nothing on the UI, and `setGameplayVisible(false)` — the one thing that runs on every screen transition — touches six elements but not `#hintBar`. A hint queued in level N therefore keeps playing in level N+1, over the main menu, and over the journey map.

**Evidence.** src/game/ui.ts:109-128 — `hintTimer`, `hintQueue`, `hintActive` are private with no clearing method; `playHint` (:120-127) chains `window.setTimeout(() => this.playHint(next.msg, next.secs), 180)` which survives any scene teardown. src/game/ui.ts:139-145 `setGameplayVisible` touches `padL/padR/hud/menu/mapView/objectiveBar/rescueBtn` — never `hintBar`. src/game/LevelScene.ts:105-112 `create()` calls `setHearts/setSand/setPower/setRescueVisible/hideOverlay` — no hint reset. index.html:97 `#hintBar` is a standalone `z-index:6` element whose visibility is driven only by inline `style.opacity` set in `playHint`. **Visually proven in the supplied screenshots:** `shots/L03-2.png` (cave) and `shots/L05-1.png` (Toros) both display `"The roots are waiting for a friend's heart. Go back to the frightened creature! ← 🏖️ 💛"` — that is `S('meadow.friendRequired')` (src/core/i18n.ts:97), emitted only from LevelScene.ts:244 and :480, both of which are gated on `this.idx === 0`. It cannot be produced by level 3 or 5; it leaked.

**Recommendation.** Add to `UI`:
```ts
clearHints(): void {
  clearTimeout(this.hintTimer);
  this.hintQueue.length = 0;
  this.hintActive = false;
  const el = $('hintBar'); el.style.opacity = '0'; el.textContent = '';
}
```
Call it (1) at the top of `LevelScene.create()` (src/game/LevelScene.ts:105, next to `setGameplayVisible(true)`), and (2) inside `setGameplayVisible(false)` (ui.ts:144, next to the objectiveBar/rescue reset) so menu and map are covered too. Also bound the queue in `showHint` (`if (this.hintQueue.length >= 3) this.hintQueue.shift()`, ui.ts:115) — today the dedupe only compares against the tail (:114-115), so alternating messages grow it without limit. Test: drive `create()` twice with a stub UI recording `showHint`/`clearHints` order and assert `clearHints` precedes any level-N+1 hint.

---

### F-016 · Q5 performance · decoded raster memory is the iPhone SE blocker  `L`

**Observation.** The single largest risk in scaling to ten biomes is not draw time — it is resident decoded-image memory. `preloadArt()` loads every registered image eagerly at boot and holds every decoded bitmap forever; there is no unload path. The Meadow's two full-screen plates alone are 1920×1080 each, which is ~8.3MB of decoded RGBA apiece regardless of the 58KB/312KB on-disk size. Replicating that for ten biomes lands around 200MB of resident pixels in a WKWebView on a 2GB device — comfortably into jetsam territory.

**Evidence.** src/game/assets.ts:42-58 (`Promise.all` over all of `SOURCES`, results stored in a module-level `Map` that nothing ever clears — :32 `const images = new Map<ArtKey, HTMLImageElement>()`). Dimensions are asserted by tests/assets.test.ts:9-14 (far-background 1920×1080 webp), :23-27 (midground-treeline 1920×1080 PNG *with alpha*), :35-40 (three foregrounds 768×512 with alpha), plus a 512×512 soil tile. Decoded RGBA per biome ≈ 8.3 + 8.3 + 3×1.57 + 1.05 ≈ 22.4MB. src/main.ts:120 blocks boot on the whole set. On-disk today: 816KB meadow + 660KB characters (`du -sh public/art/*`).

**Recommendation.** Three changes, in order of impact: (1) **Bundle + release** (see the asset-manifest finding) — load only `core` at boot and only the current biome's bundle at level start, dropping the previous biome's `Image` references so the decoder can reclaim them; peak resident becomes ~1 biome (~25MB) instead of ~10. (2) **Halve the plate resolution**: the render target is a fixed 960×540 (src/main.ts:21-22), so 1920×1080 plates are already 2× oversampled and only pay off if `maxDPR` is ever honoured — ship 1280×720 far plates and save ~40% of decoded bytes per biome for no visible loss at the actual output size. (3) **Prefer opaque formats for full-screen plates**: the midground is a 1920×1080 PNG *with* alpha; if the biome's far plate is drawn behind it, only the treeline band needs alpha — crop the transparent region and draw it at an offset, which typically cuts the plate's pixel count by 50–65%.

---

### F-017 · Safety — parental gate  `S`

**Observation.** The family gate does not gate. The three answers are a hard-coded literal `[12, 15, 18]` rendered in order, the correct one (15) is always the middle button, and a wrong tap costs nothing at all — no disable, no delay, no reshuffle, no attempt limit; it plays 'hmm' and returns. A child unlocks the purchase sheet in at most three taps and learns 'the middle one' on the first try. Because the gate is the app's stated child-safety boundary for purchases, and it opens a RevenueCat paywall, this is a compliance risk as well as a design one.

**Evidence.** src/game/ui.ts:236 (`const answers = [12, 15, 18];`), ui.ts:239 (rendered in array order), ui.ts:242-245 (`if (Number(...) !== 15) { sfx('hmm'); this.showHint(...); return; }` — no lockout); src/game/purchases.ts:50-65 (`presentFamilyPurchase` → `RevenueCatUI.presentPaywallIfNeeded`); public/privacy.html ('Purchases are placed behind a grown-up check').

**Recommendation.** Replace with a gate a 5–8-year-old cannot brute-force: randomize the operands each open, shuffle the answer positions, spell the numbers as words ('fifteen'/'on beş') so they cannot be pattern-matched to the digits in the question, and add a 3-second cooldown plus a 3-attempt back-off. Free-text digit entry is the standard and is even safer. Add a test asserting the correct answer's index varies across opens.

---

### F-018 · Wordless play — hint bar  `M`

**Observation.** The hint bar carries the game's densest instruction load and is never spoken and has no wordless fallback. All 17 `showHint` call sites push full sentences ('Kökler bir dostun kalbini bekliyor. Korkmuş canlıya dön! ← 🏖️ 💛', 4.8s; 'İki kalp, iki taş… dostuna güven.'), rendered as `textContent` with no `speak()` anywhere in the path and no `aria-live`. Speech is wired to exactly five things — the recognition question, tapped tree names, the wake card name, map node names, and the map locked/premium hints. Every mid-level instruction, every story beat, and the rescue prompt are therefore read-only, on a 2.2–5s timer, for a player defined as unable to read.

**Evidence.** src/game/ui.ts:123-143 (`showHint`/`playHint` — `el.textContent = msg`, no speech); src/game/LevelScene.ts:148,245,287,294,322,481,510,520,524,540,543,614 (12 sentence hints); src/core/i18n.ts:45-59 (the strings); grep for `speak(` yields only src/game/ui.ts:173,328,333,418,426,452; index.html:97 (`#hintBar` has no `aria-live`).

**Recommendation.** Route every hint through `speak()` as well as the bar (throttled, cancel-on-new), add `aria-live="polite"` to `#hintBar`, and give each hint a mandatory 2–4 glyph icon strip rendered large beside the text so the message survives with the sound off and the text unread. Add a persistent 🔊 replay button on the objective bar that re-speaks the current objective on demand — that one control is the highest-leverage accessibility fix in the project.

---

### F-019 · Wordless play — menus  `S`

**Observation.** The main menu cannot be operated by a non-reader. It renders five to six buttons whose only differentiator is a text label, three of them identically styled `.ghost` pills ('Bölümler', 'Doğa Günlüğü', 'Nasıl Oynanır?'), with no icon, no pictogram and — unlike the map nodes and tree cards — no 🔊 listen affordance and no auto-speech. A 5-year-old landing on the menu has no way to tell 'Continue' from 'Journey' from 'Nature Journal' and must fetch an adult. On phones those pills are ~25px tall (7px padding, 11px font).

**Evidence.** src/game/ui.ts:201-214 (`showMenu` — text-only `<button>`s, `sayBtn` never applied); src/game/ui.ts:176-178 (`sayBtn` exists and is used for map nodes/tree names only); index.html:52 (`.ghost` 9px/13px), index.html:141 (`@media (max-width:720px)` → `.ghost{font-size:11px;padding:7px 11px}`).

**Recommendation.** Give every menu action a large unambiguous pictogram above its label (▶ play, 🗺️ map, 📖 journal, ❓ how-to, 🌿 grown-ups), attach the existing `sayBtn` to each, and speak the label on first render and on focus. Raise the touch target to ≥56px tall. The same treatment fixes the pause, game-over and level-complete cards.

---

### F-020 · art-pipeline / asset gating  `S`

**Observation.** Every raster asset path in the renderer is hard-gated behind `this.L.biome === 'meadow'`. Levels 2–10 are architecturally incapable of displaying authored art even if the assets existed. This is the single precondition blocking all other art work — no biome can be upgraded until this gate is replaced by a keyed manifest.

**Evidence.** src/game/LevelScene.ts:636-644 contains six consecutive `this.L.biome === 'meadow' ? art(...) : null` ternaries. drawMeadowMidground is called only at :657 under the same condition; drawMeadowForeground only at :723. src/game/assets.ts:5-16 declares 11 ArtKeys, of which 7 are literally prefixed `meadow.` and 4 are character/oak — there is no naming scheme that admits a second biome. File-size proxy confirms the split: L01-0..L01-3.png are 375–442 KB; every other level shot is 40–88 KB (L10-3.png, the final boss screen, is 40 KB).

**Recommendation.** Replace the biome-string gate with a per-biome manifest: `art(`${biome}.far`)`, `art(`${biome}.soil`)` etc., returning null for unauthored biomes so the existing procedural fallback runs unchanged. Change ArtKey from a closed union to `${string}.${'far'|'midground'|'soil'|'grass'|'foreground.left'|...}`. Zero visual change on day one, but it converts 'author art for biome N' from a code change into a file drop. Do this before any other item in this report.

---

### F-021 · boss  `L`

**Observation.** Every boss in the game — including the final boss — is an 88×88 rounded rectangle with two white circles and two dark pupils. There is no escalation of any kind across nine encounters: identical dimensions, identical geometry, identical eye placement, identical hp pip row. The mimic variant differs only by fill colour plus four green circles on top. The boss also has no ground shadow, so it floats.

**Evidence.** src/game/LevelScene.ts:945-968 is the entire boss renderer; body colour is the only branch (`b.state === 'blind' ? 0xb8b2c9 : b.kind === 'mimic' ? 0x5e8a52 : 0x9a5e8a`). Dimensions are hardcoded `w: 88, h: 88, scale: 1` in both hand-authored levels (src/core/levels.ts:63, :104) and the generator (src/core/generator.ts:91) — all nine bosses. Compare L03-3.png, L08-3.png and L10-3.png: three different biomes, three tiers apart, visually the same object. L10-3.png is the final boss of the game and is a green box 1.4× the player's height. Note also drawPlayer (:762), drawMonster (:898) and drawTree (:984) all draw a contact shadow; drawBoss draws none.

**Recommendation.** Build a procedural archetype system — see the dedicated boss-system finding below. Do not commission boss sprites; code wins here because scale, state and hit-count variation are all dynamic.

---

### F-022 · canvas contrast / accessibility  `S`

**Observation.** In the cave biome the platform mass is nearly indistinguishable from the void behind it, so a 5-year-old cannot see where the floor ends. This is a playability failure, not an aesthetic one. The Guardian is also barely separable from the ground it stands on.

**Evidence.** Measured WCAG contrast on src/core/biomes.ts:27-33 values — cave soil #3c365a vs skyBot #0e0b1e = 1.72:1; vs skyMid #1c1733 = 1.53:1; cave grass #4a4470 vs soil #3c365a = 1.26:1 (the collision top is invisible against its own platform); cave hillsMid #201936 vs skyMid #1c1733 = 1.03:1. Guardian purple #7a52c8 vs cave soil #3c365a = 2.07:1. L03-1.png and L03-3.png show this directly: the platform silhouettes read as slightly-less-black rectangles and the platform tops carry no discernible edge. The `dark:true` overlay at LevelScene.ts:737-739 (0x0a0718 at .62 alpha) is then composited on top, further crushing an already-crushed range.

**Recommendation.** Raise cave soil to ~#4d4570 and grass to ~#6f66a0 (soil-vs-sky ≥ 2.5:1, grass-vs-soil ≥ 1.8:1), and add a 2px `grassLight` top-edge highlight on every platform in dark biomes so the standable surface is the brightest thing in frame. The lantern-glow erase pass should be tuned to *reveal* this edge, not fight it. Verify at 667×375 in daylight, not on a calibrated monitor.

---

### F-023 · i18n — learning content  `M`

**Observation.** The entire learning payload is Turkish-only in all three languages. `TreeDef.family`, `desc`, `gift` and `fact` are plain `string`, not `Record<Lang, string>`, so an English child who wakes the Oak reads 'Palamut ağacı', 'Aile: Kayıngiller' and '🌱 Bir meşe 500 yıldan uzun yaşayabilir!'. The family names are also the grouping keys for the journal's family stars, so the EN/DE journal is a list of Turkish taxonomy. On top of that, level names are Turkish literals rendered into localized cards ('Bölüm 4 · Kestane Korusu restored!'), and every intro hint for levels 2–10 is displayed raw from `intro.text` rather than through `S()`, so ~13 Turkish instruction sentences appear to EN/DE players. (The UI string tables themselves are clean — verified 93 keys in each of tr/en/de with zero missing or extra.)

**Evidence.** src/core/trees.ts:9-17 (`family: string; desc: string; gift: string; fact: string`); src/game/ui.ts:446-448 (`info?.family`, `info?.desc`, `info?.fact` rendered unlocalized); src/game/ui.ts:344 (`familyStars` keys used as display labels); src/core/levels.ts:7,38,80,124 (`name: 'Bölüm 1 · İlk Adımlar'` …) consumed at src/game/ui.ts:383 (`${levelName}${S('next.suffix')}`); src/game/LevelScene.ts:614 (`this.idx === 0 ? S('meadow.intro.'+ii) : intro.text`); src/core/generator.ts:99 (Turkish default hint); key-parity diff: tr 93 / en 93 / de 93, no gaps.

**Recommendation.** Promote `family`, `desc`, `gift` and `fact` to `Record<Lang, string>` (or move them into the STR tables as `tree.<id>.fact` keys so the existing TR-fallback path applies), add a `nameKey` for each level instead of a literal `name`, and route generated intros through `S()` with per-recipe keys. Add a test that asserts no rendered string in EN/DE mode matches a Turkish-only character class outside brand names.

---

## MAJOR

### F-024 · Accessibility — colour  `S`

**Observation.** The in-world puzzle beacon is a bare coloured circle carrying no icon, while the button it must be matched to carries the emoji. `eyeMark` draws only `fillCircle` in `TOOLS[eye].col`; `setPower` sets `#bPow` to the same colour *plus* `TOOLS[eye].emoji`. Red `#ff6b4a` and green `#54c97a` are the deutan/protan confusion pair, and yellow `#ffcc3a` sits on `coast` sand (`grass #e8d9a8`) and `mastery` grass (`#a8c25f`) at very low luminance contrast. Mitigating fact: `computeEquip()` auto-equips whichever eye the zone owns, so the child never has to *choose* by colour — this is a discovery and comprehension cue, not a hard lock, which is why it is major rather than blocker. But the 'five eyes, five powers' fantasy is currently taught only by colour and never exercised as a choice.

**Evidence.** src/game/LevelScene.ts:1042-1047 (`eyeMark` — three concentric `fillCircle`s, no glyph); src/game/ui.ts:104-108 (`setPower` adds the emoji to the button); src/core/config.ts:21-27 (`TOOLS` palette); src/core/biomes.ts:56-62, 77-83 (coast/mastery light grass); src/game/LevelScene.ts:210-220 (`computeEquip` auto-selects).

**Recommendation.** Draw `TOOLS[eye].emoji` (or the equivalent vector glyph) inside every `eyeMark`, and give each eye a distinct ring silhouette (hexagon/flame/leaf/spiral/diamond) so the marker is identifiable in greyscale. Add a dark halo behind the marker so it holds on light biomes. Then consider making at least one puzzle per late level require *choosing* between two adjacent zones, so the powers become a real decision.

---

### F-025 · Accessibility — colour  `S`

**Observation.** Objective progress is encoded as green-fill (done, `#5fc77f`) versus yellow-fill (current, `#ffd36b`) with no shape or symbol difference — the classic deuteranopia confusion pair, on 21–25px targets. The only secondary cue on 'current' is a 3px translucent ring at 24% opacity. A red-green colour-blind child cannot tell which step they are on, which is the bar's entire purpose.

**Evidence.** index.html:99 (`.objectiveStep.done{background:#5fc77f}`, `.objectiveStep.current{background:#ffd36b;box-shadow:0 0 0 3px rgba(255,211,107,.24)}`, pending = `rgba(255,255,255,.13)` at `opacity:.48`).

**Recommendation.** Overlay a ✓ on completed steps, scale the current step ~1.25× with a solid high-contrast outline, and keep pending steps as outline-only. Verify the three states are distinguishable in a greyscale screenshot as a CI check.

---

### F-026 · Accessibility — mute scope  `S`

**Observation.** The mute button does not mute the loudest thing in the game. `setMuted()` ramps `masterGain` only, and `speak()` goes through the platform SpeechSynthesis API which never touches that node. So a parent on a bus or in a waiting room who presses the button labelled 'Sesi aç veya kapat' (turn sound on or off) still gets full-volume Turkish text-to-speech every time a recognition card opens, every time a tree name is tapped, and every time a locked map node is pressed. The control makes a promise it does not keep, in exactly the situation where it matters most.

**Evidence.** src/game/audio.ts:18-21 `setMuted()` — `masterGain.gain.setTargetAtTime(...)` only. src/game/audio.ts:127-135 `speak()` — no `muted` check, no gain path; it constructs an utterance and calls `speechSynthesis.speak(u)` directly. Speech call sites that fire unbidden: ui.ts:426 (auto-read on every card open), :452 (`showTreeWake`), :418 (every choice tap), :328/:333 (locked/premium map nodes), :173 (🔊 buttons).

**Recommendation.** Immediate: `if (muted) return;` at the top of `speak()`, plus `speechSynthesis.cancel()` inside `setMuted(true)` to kill any in-flight utterance. Correct: separate the channels — the mute button should cycle three states (🔊 everything → 🎵̸ music off but speech and sfx on → 🔇 silent), because a parent in a quiet place usually wants to keep the spoken instruction that the whole pre-reader design depends on while killing the melody. Persist as `save.audio = { music, sfx, speech }` (booleans or 0..1) alongside the existing `muted`, migrating `muted: true` → all three off so no existing save is surprised.

---

### F-027 · Accessibility — mute state persistence  `S`

**Observation.** Mute is persisted correctly but never restored to the UI. `save.muted` is loaded, passed to `initAudio`, and correctly applied to the gain node — but the mute button's glyph is hard-coded to 🔊 in the HTML and is only ever changed inside its own click handler. So a child who returns to a muted save sees a speaker icon claiming sound is on. Worse, their first tap on that button UNMUTES while the icon stays 🔊 — visually nothing happened — so the natural next action is to tap it again, muting the game right back. There is also no `aria-pressed` on the control, so the state is invisible to assistive tech as well as to the eye.

**Evidence.** index.html:183 `<button id="mute" class="top" title="Ses" aria-label="Sesi aç veya kapat">🔊</button>` — hard-coded glyph. src/game/ui.ts:66 `$('mute').onclick = () => { $('mute').textContent = this.cb.onMuteToggle() ? '🔇' : '🔊'; };` — the only writer. The UI constructor (ui.ts:43-49) calls buildLangRow/bindChrome/bindPads/applyLang, and `applyLang()` (ui.ts:59-64) touches rescueBtn only. `save` IS available on the instance (`this.save`, ui.ts:44) — the fix has everything it needs in scope.

**Recommendation.** In `bindChrome()` (or a new `syncMuteIcon()` called from the constructor and after every toggle): `const m = !!this.save.muted; $('mute').textContent = m ? '🔇' : '🔊'; $('mute').setAttribute('aria-pressed', String(m));`. Two lines. Add a Vitest case asserting that constructing UI with `{ muted: true }` yields the 🔇 glyph — the suite currently has no audio or mute coverage at all.

---

### F-028 · Accessibility — portrait / one-handed  `L`

**Observation.** Portrait is an absolute, wordless lockout with no escape, and one-handed play is impossible. `@media (orientation:portrait) and (pointer:coarse)` covers the screen with 📱 and ↻🔄↻ and `main.ts` pauses any running level; there is no 'play anyway' and no adult-readable explanation. A kids' tablet with rotation lock enabled — extremely common — is permanently blocked with no diagnosable reason, as is a mounted or AAC device, and an iPad in portrait (768×1024) is blocked even though the 960×540 canvas would letterbox comfortably. Separately, movement lives bottom-left and four actions bottom-right with no remap, no auto-walk and no tap-to-move, so a child with one usable hand cannot play at all — and four action buttons (✨ 🏖️ 💛 ⤴) is a heavy load for a five-year-old given that ✨ is already context-sensitive.

**Evidence.** index.html:130-135 (`#rotateHint`, `@media (orientation: portrait) and (pointer: coarse)`), index.html:193 (icon-only content); src/main.ts (`portrait.addEventListener` → `pauseToggle()`); index.html:33-37 (`#padL` left, `#padR` 2×2 right, no alternative layout); src/game/LevelScene.ts:210-220 (✨ is already contextual, so 💛 and ✨ could merge).

**Recommendation.** Support portrait with a letterboxed canvas and the pads below it, or at minimum only block when the landscape height would fall below a usable threshold, and always include one adult-readable line plus a 'play anyway' button. Add a one-handed layout option: mirror-able pads, an auto-walk toggle, and a single context action button that resolves to power/heal/wake based on proximity (the logic already exists).

---

### F-029 · Accessibility — speech  `M`

**Observation.** The audio-first design is fragile on the primary platform. `speak()` calls `speechSynthesis.cancel()` immediately before every `speak()`, does no `getVoices()` availability check and has no fallback when a tr-TR/de-DE voice is absent (it silently reads Turkish text with the default voice's phonemes or nothing at all). `wireSayButtons` is bound twice on every recognition card — once by `show()` and again by `showRecognition()` — so each 🔊 tap fires two utterances where the second cancels the first, clipping the name. And the auto-read of the question is invoked from the game loop (`doUse` → `showTreeQuestion`) rather than inside a user-gesture handler, which WKWebView routinely drops, so on iOS the question may never be spoken at all.

**Evidence.** src/game/audio.ts:127-135 (`speechSynthesis.cancel(); speechSynthesis.speak(u)` — no voice check, no fallback); src/game/ui.ts:163-167 (`show()` calls `wireSayButtons`) and ui.ts:425 (`showRecognition` calls it again on the same nodes); src/game/LevelScene.ts:232-236 (`doUse` → `showTreeQuestion` from `update()`, outside a gesture); src/game/ui.ts:426 (`speak(opts.spoken)`).

**Recommendation.** Wire say-buttons once (drop the second call, or guard with a `data-wired` flag). Enumerate `getVoices()` on first gesture, pick the best match per locale and fall back to the closest available language with a logged warning rather than silence. Prime the speech engine with a zero-length utterance inside the first `pointerdown` (the existing `initAudio` hook at main.ts is the right place) so later programmatic calls are permitted on iOS. Add a manual matrix check for tr/en/de speech on iOS Safari, Android Chrome and desktop.

---

### F-030 · Accessibility — speech synthesis reliability  `M`

**Observation.** The primary instruction channel for pre-readers has no failure handling on any of its four known failure modes. (1) `speechSynthesis.getVoices()` is populated asynchronously in Chrome, so a `speak()` issued before `voiceschanged` fires silently does nothing — and the game's very first spoken line is the auto-read of the first recognition card. (2) `speechSynthesis.cancel()` immediately followed by `speak()` is a long-standing Chrome race that drops the new utterance. (3) If no Turkish voice is installed — common on Windows/Chrome and on Android without the TR language pack — the platform either says nothing or reads Turkish text with an English voice ('meşe' mispronounced), and the game cannot tell which. (4) On iOS, `speechSynthesis.speak()` must be user-gesture-initiated for the first utterance — and the auto-read is NOT in a gesture: `doUse()` is called from `update()`, i.e. from a requestAnimationFrame callback, one or more frames after the keypress that set `useEdge`. So on iOS the first automatically-spoken question is reliably dropped. There is no `onerror` handler and no visible fallback, and the 🔊 buttons render unconditionally — a pre-reader can end up with a button that does nothing.

**Evidence.** src/game/audio.ts:127-135 — `speak()` in full: no voice lookup, no `onerror`, no `onend`, `speechSynthesis.cancel(); speechSynthesis.speak(u);` back to back, `catch { /* no speech support: silent */ }` swallows only construction throws. Gesture chain proving (4): src/game/LevelScene.ts:460 `if (i.useEdge) { this.doUse(); i.useEdge = false; }` inside `update()`; `update()` is invoked from src/game/engine.ts:279 inside the rAF `loop`; `doUse()` (LevelScene.ts:233-237) → `ui.showTreeQuestion` → `showRecognition` → ui.ts:426 `speak(opts.spoken)`. src/game/ui.ts:177 `sayBtn()` renders the 🔊 span unconditionally.

**Recommendation.** (a) Prime speech inside the existing one-shot gesture listener at main.ts:88 — `speechSynthesis.speak(new SpeechSynthesisUtterance(''))` alongside `initAudio` — which unlocks iOS for the rest of the session. (b) Resolve voices once via a promise that waits for `voiceschanged` (with a 1 s timeout), pick the best match for `SPEECH_LOCALE[getLang()]`, and cache it; set `u.voice` explicitly. (c) Replace `cancel(); speak()` with cancel-then-speak on the next macrotask, or skip cancel when nothing is speaking. (d) Attach `u.onerror` and a watchdog timer; if speech fails or no matching voice exists, set a `speechAvailable = false` flag, hide the 🔊 buttons, and substitute a soft audio cue so the affordance is never a dead control. (e) Duck the music bus to ~28% while an utterance is active and restore on `onend`/`onerror` plus a safety timeout (both events are unreliable on Safari and Android) — right now the spoken question competes with the melody at comparable level, which directly degrades comprehension for the audience the feature exists for.

---

### F-031 · Accessibility — touch targets  `S`

**Observation.** Several controls are well under the 44px minimum, and one of them can cause an unintended answer. The `.sayBtn` listen affordance is 30px (25px on short-landscape phones, 22px on map nodes) and is a `<span role="button">` nested *inside* `<button class="treeChoice">` — so a near-miss on a 25px target lands on the 100px parent and registers as an answer, dimming a choice and forfeiting the streak. Nested interactive elements are also invalid HTML/ARIA and the span has no `tabindex`, so it is unreachable by keyboard. Also under 44px: `.top` chrome 42px, `.ghost` ≈31px (≈25px below 720px), `#rescueBtn` ≈33px, `.family-answer` ≈36px.

**Evidence.** index.html:91 (`.sayBtn{width:30px;height:30px}`), index.html:156 (`.sayBtn{width:25px}`), index.html:118 (`.mNode .sayBtn{width:22px}`), index.html:155 (`.treeChoice{width:100px}`); src/game/ui.ts:176-178 (`<span class="sayBtn" role="button">` emitted inside the choice `<button>` at ui.ts:409-412); index.html:28,52,101,56.

**Recommendation.** Move 🔊 out of the choice button into a sibling row beneath it (or make the whole choice card speak on first tap and select on second — a double-confirm that also removes accidental answers), size every interactive element to ≥44px (≥48px for the pads and primary actions), and make the listen control a real `<button type="button">` so it is focusable.

---

### F-032 · Failure loop  `M`

**Observation.** The 12-second rescue timer is gated on the child *pressing something*: `engaged = left || right || healHeld || bossActive || (idx === 0 && x > 1180)`. The actual behaviour of a stuck 5-year-old is to stop pressing and stare, which accrues zero time — so the rescue never appears for the child who most needs it. Conversely a child happily exploring a 460px platform without changing world state accrues the timer and gets the flower offered as noise. And `rescueToSafety()` teleports to `lastSafe`, which is continuously updated to wherever they are standing, so for a comprehension block (they don't know to press ✨ at the sprout) the rescue is a literal no-op that re-shows 'Follow the glowing path'.

**Evidence.** src/game/LevelScene.ts:282-287 (`engaged` condition, `noProgressT >= 12`); src/game/LevelScene.ts:277 (`if (p.grounded && p.iframe <= 0) this.lastSafe = { x: p.x, y: p.y }`); src/game/LevelScene.ts:141-149 (`rescueToSafety` → `lastSafe`, then `showHint(S('objective.explore'))`).

**Recommendation.** Drive the timer off lack of *progress* regardless of input (no world-state change AND net horizontal travel < 60px in 15s, counted whether or not a button is held), and escalate in three steps instead of one: (1) speak the current objective and pulse the objective step, (2) draw a breadcrumb trail of motes from the Guardian to the current objective's world position — the meadow already does this at LevelScene.ts:838-842, generalize it, (3) offer the flower, and make it move the child *to the objective*, not to where they already stand.

---

### F-033 · Failure loop  `S`

**Observation.** Falling in a pit costs a heart on nine of ten levels. `gentle: true` is set only on level 1; levels 2–10 route pit falls through `loseLife(true)`. Given a 70px virtual d-pad, a 140px fixed GAP and JUMP_V 720, three mistimed jumps is an ordinary outcome for a five-year-old — and by the previous finding, three costs the entire level. There is also no bypass anywhere: unlock is strictly sequential (`canAccessLevel`, `save.furthest`), so a child blocked on one boss can never see what comes after it.

**Evidence.** src/game/LevelScene.ts:595 (`if (this.L.gentle) { reposition } else this.loseLife(true)`); src/core/levels.ts:7 (`gentle: true` on level1 only), levels.ts:38,80 and generator.ts:97 (`gentle: false` everywhere else); src/main.ts:39 (`save.furthest = Math.max(...)`), src/main.ts:76 (`canAccessLevel`).

**Recommendation.** Make pit falls always non-lethal (reposition at the checkpoint, no heart) — the game's own level 1 already proves this reads fine — and reserve hearts for creature contact. Add an adult-gated 'open the next chapter' in the family area, and auto-offer a skip after 3 game-overs on the same level so a wall is never permanent.

---

### F-034 · Learning design — clue tiers  `M`

**Observation.** The clue and the answer are rendered from the same vector path, so leaf tier and silhouette tier are picture-matching, not recognition. `getTreeArt(id,'leaf')` returns `getTreeIcon(id, size, false)` and each choice shows `getTreeIcon(id, 72, true)` — same `LEAF_PATH[id]`, same `LEAF_COLOR[id]` gradient. Worse, `getTreeSilhouette` renders that *same leaf path* filled `#233a33`, so the supposedly hardest tier is the identical outline in black, matched against the same outlines in colour — easier than bark, inverting the intended leaf→bark→silhouette ramp. The copy also lies: 'Bu gölge hangi ağacın?' / "Which tree makes this silhouette?" is shown over a leaf, not a tree.

**Evidence.** src/game/art.ts:396-412 (`getTreeArt` leaf → `getTreeIcon`; `getChoiceArt` → `getTreeIcon`); src/game/art.ts:340-350 (`getTreeSilhouette` calls the same `LEAF_PATH[species]`); src/core/i18n.ts:26 ('tree.question.silhouette'); src/core/world.ts:4 (documented ramp leaf→bark→silhouette).

**Recommendation.** Make the silhouette tier a whole-tree crown silhouette — the `crown` field ('broad'|'tall'|'oval'|'conifer'|'weeping'|'palm') plus a trunk/branch signature already exists and `drawTree` already renders six distinct crowns; reuse that renderer at icon scale. For the leaf tier, render the clue from a different exemplar than the choice thumbnail (different rotation, a two-leaf spray, or the photo) so the child matches a *feature*, not a bitmap.

---

### F-035 · Learning design — feedback  `M`

**Observation.** A wrong answer corrects nothing. The child gets a 6px shake, a 'hmm' beep, the tapped button dimmed, and the tapped species' name spoken. Nothing shows *why* it was wrong: the two leaves are never placed side by side, the distinguishing feature is never named or pointed at, and the correct answer is never revealed if the child gives up (they cannot give up — the card has no exit). A 5-year-old's wrong mental model survives the interaction intact.

**Evidence.** src/game/ui.ts:415-423 (`speak(treeName(tapped))`, `btn.classList.add('dim')`, `opts.onAnswer(ok)`); src/game/LevelScene.ts:300 (`shake(CONFIG.tree.wrongShake, .15); sfx('hmm'); return;` — no reveal, no compare).

**Recommendation.** On a wrong tap, animate the tapped choice's leaf up beside the clue so the two shapes sit adjacent for ~1.5s, outline the differing feature (lobe count, tooth edge, needle cluster), and speak one short contrast line per species pair. Add the same compare beat to the wake card on a first-try-correct so success also teaches. Store the contrast lines as localized data alongside `fact`.

---

### F-036 · Learning design — transfer  `L`

**Observation.** Knowing a tree never helps you solve anything. A correct answer sets `tr.awake = true`, adds a journal entry, fires confetti and 26 particles — and that is all. It opens no path, grants no power, changes no obstacle. The one exception is the mimic boss, where recognition *is* the finisher, but it is the same three-option card. Meanwhile the five 'eye' powers are auto-equipped by proximity (`computeEquip` returns the zone's own eye), so the child never chooses a power either. The result is a platformer with a quiz bolted on: the botany is a collectible, not a tool.

**Evidence.** src/game/LevelScene.ts:299-312 (`resolveTreeAnswer` — awake flag, particles, journal, card); src/game/LevelScene.ts:210-220 (`computeEquip` auto-selects the zone's eye); src/game/LevelScene.ts:222-231 (mimic path is the only knowledge-gated action).

**Recommendation.** Bind each species' `gift` to a physical affordance the child then uses: oak's acorns feed a squirrel that carries a vine across a gap; willow's roots knit a crossing over water; pine's cones are the winter food a creature needs before it will follow you; plane's broad shade is the only place a heat-shy creature will walk. Then make the gate ask a *property* question sourced from `gift`/`fact` ('which of these three feeds the squirrels in winter?') with distractors that share leaf shape — so shape-matching fails and understanding succeeds.

---

### F-037 · Mix architecture — bus topology  `M`

**Observation.** Every sound source connects straight to a single `masterGain`. There are no submix buses, no reverb send, no panner, and no limiter anywhere in src/. This one structural fact is what makes five separate defects unfixable in place: music cannot be ducked under speech; there is no separate music volume (the standard parent request in a children's title); a level or mood change cannot fade music out; sfx are mixed 4–10× louder than the melody with no bus to correct the balance; and overlapping one-shots can drive the output near full scale with nothing to catch it. Concretely, `sfx('win')` is five overlapping .26-gain sines summed under `masterGain = .5`, on top of whatever music voices are ringing — that peaks well above 0 dBFS on a phone speaker and will audibly crackle.

**Evidence.** src/game/audio.ts:12-14 (masterGain is the only node created), :32 `o.connect(g); g.connect(masterGain);`, :44 `g.connect(masterGain);`, :105 `g.connect(masterGain);`, :111 `gb.connect(masterGain);`. sfx gains .1–.3 at audio.ts:56-78 versus music `air` .025–.045 at audio.ts:86-88. No `DynamicsCompressorNode`, `StereoPannerNode` or `ConvolverNode` occurs anywhere in the repo.

**Recommendation.** Introduce the following graph in initAudio (roughly 40 lines, zero new dependencies):

  sfx one-shot:   Osc | BufferSource → voiceGain(ADSR) → StereoPanner ─┬→ sfxBus
                                                                        └→ sendGain → reverb
  music layer×5:  Osc×2(detuned) → layerFilter(Biquad LP) → noteGain → layerGain ─┬→ musicBus
                                                                                  └→ sendGain → reverb
  ambience bed:   loopNoiseSource → ambFilter(BP/LP) → ambDepth ────────────────────→ ambienceBus
  reverb:         ConvolverNode(procedural IR) → reverbReturn ─────────────────────→ masterGain
  speech:         (platform SpeechSynthesis — outside the graph, gated by a flag)

  sfxBus, musicBus, ambienceBus, uiBus, reverbReturn → masterGain → limiter → destination
  limiter = DynamicsCompressor{ threshold:-6, knee:3, ratio:12, attack:.003, release:.18 }
  shared LFO: Osc(0.08 Hz) → lfoGain → [ambDepth.gain, padFilter.frequency] for slow breathing.

The reverb impulse is generated, not shipped: `makeIR(ctx, seconds, decay, preDelay)` fills a 2-channel buffer with `(Math.random()*2-1) * Math.pow(1-t, decay)` after a pre-delay gap — ~12 lines, 0 bytes of assets, and it is what gives the Cave a 3.4 s tail and the Orchard a 0.7 s one. Panning: `pan = clamp((worldX - camX - W/2) / (W/2), -1, 1)` at 0.7 depth — six lines, and it immediately makes a boss on the right and a creature on the left legible as separate things.

---

### F-038 · Music engine — scheduling accuracy  `M`

**Observation.** Notes are scheduled with zero lookahead: `musicTick()` reads `audio.currentTime` at the moment the setTimeout callback happens to run and starts the oscillator right there, then re-arms a timeout for `pace` ms. That means every note inherits the full main-thread jitter of a 60 fps canvas game — rAF frame work, GC pauses, the immediate-mode replay of five Graphics layers — so the interval is `pace + latency + tick execution time`, and the error accumulates rather than self-correcting. Audibly this is a tempo that wobbles and slowly drags. `seq()` has the same defect multiplied: each note of `heal`, `clear`, `win`, `sad`, `wake`, `cage`, `streak` is its own setTimeout, so multi-note sfx arpeggios arrive unevenly, and those timeouts are never cancellable — a `win` fanfare keeps arriving after the scene has been destroyed and the player is back on the menu.

**Evidence.** src/game/audio.ts:118-122 `const schedule = () => { musicTick(); musicTimer = window.setTimeout(schedule, SCORE[musicMood].pace); }`. src/game/audio.ts:46-48 `a.forEach((f, i) => setTimeout(() => beep(...), i * gap));`. src/game/audio.ts:97 `t0 = audio.currentTime` — no `nextNoteTime` state anywhere.

**Recommendation.** Standard two-clock scheduler: a 25 ms `setInterval` that only *schedules*, and the audio clock that does the timing.

  const LOOKAHEAD = 0.12, TICK_MS = 25;
  let nextStepTime = 0, step = 0;
  function pump() {
    while (nextStepTime < ctx.currentTime + LOOKAHEAD) {
      scheduleStep(step, nextStepTime);      // exact audio-clock time
      nextStepTime += 60 / state.bpm / 2;    // eighth notes
      step++;
    }
  }

`step` is global and never resets (see the phase-reset finding). For `seq()`, drop setTimeout entirely and schedule all notes in one call at `t0 + i * gap` on the audio clock — that fixes jitter and the after-scene-death tail in the same three-line edit. Testability note: this design is unit-testable headlessly with a fake `{ currentTime }` object, which the current setTimeout version is not — worth a `tests/audio.test.ts` covering step advance, bar quantisation and lookahead window (the suite has no audio coverage at all today).

---

### F-039 · Music engine — state system design (title → explore → discovery → tension → encounter → healing → restoration → complete → progression)  `L`

**Observation.** The requested nine states cannot be expressed by the current design at all, because a 'mood' here means 'swap the melody array and restart it from note 1'. What is needed instead is a fixed set of persistent layers whose gains are the state — that is what makes transitions musical rather than a cut, and it is what lets 'puzzle tension' and 'encounter' be reached and left dozens of times per level without ever sounding like a track change. Crucially, every state can be DERIVED from scene fields that already exist, so wiring is one call per frame with an internal dedupe and no new gameplay bookkeeping.

**Evidence.** Existing derivable state, all already computed each frame in src/game/LevelScene.ts: `this.bossActive` (:373) → encounter; `this.healTarget !== null` (:485-493) → healing; `this.nearTree && !nearTree.awake` (:495-502) → discovery; `this.equipped !== null` inside an undone interact zone (`computeEquip`, :211-221) → puzzle; `this.meadowStory.restoring > 0` (:325) → restoration; `this.modal` (:437) → duck; `this.ended` (:429) → complete. UI states: src/game/ui.ts:197 (menu → title), :274 `showMap()` (→ world progression, currently sets no mood at all).

**Recommendation.** Five persistent layers — `pad` (sustained bed), `pulse` (ostinato), `melody` (theme), `sparkle` (high bells), `tension` (low pulsing) — each a GainNode. A state is a gain vector + bpm multiplier + scale-degree set:

  title        pad .90 pulse .30 mel .70 spk .35 ten 0    bpm×0.85
  explore      pad .80 pulse .55 mel .50 spk .25 ten 0    bpm×1.00
  discovery    pad .80 pulse .55 mel .50 spk .90 ten 0    bpm×1.00  (sparkle auto-decays over 4 bars)
  puzzle       pad .70 pulse .70 mel .20 spk .15 ten .35  bpm×1.00  (melody drops out = "think")
  encounter    pad .50 pulse .85 mel 0   spk 0   ten .80  bpm×1.12
  healing      pad .90 pulse .25 mel .60 spk .55 ten 0    bpm×0.92  (mode brightens: raise the 4th)
  restoration  pad 1.0 pulse .70 mel 1.0 spk 1.0 ten 0    bpm×1.06
  complete     one-shot cadence stinger over a bed ducked to .35, then → title/progression
  progression  pad .85 pulse .40 mel .80 spk .60 ten 0    bpm×0.95 (previews the NEXT biome's scale — free narrative payoff on the map screen, which currently sets no music at all)

Transitions: `layerGain.gain.setTargetAtTime(target, now, 0.35)` per layer — that IS the crossfade, and because it is per-layer it is musical rather than a swap. Quantise state changes to the next bar (`pending` slot applied when `step % 8 === 0`) so transitions land on the beat; that single detail is the difference between hobby and shipped. Reduced-motion / calm mode: force `tension` and `sparkle` to 0 and clamp bpm× to 1.0.

---

### F-040 · Music engine — transitions  `S`

**Observation.** A mood change is a hard cut in two independent ways. First, `mi = 0` resets the melodic phase, so the new theme always restarts from its first note regardless of where the previous phrase was — the listener hears a needle lift. Second, there is no gain ramp of any kind between moods: the old mood simply stops being generated and the new one starts, and because `pace` is read fresh at each reschedule the tempo also jumps mid-phrase. The one transition that actually matters dramatically — the Meadow restoration, which the docs call out as the emotional peak — is therefore a cut, competing against a camera flash, a `sfx('wake')`, 70+ particles and a spoken hint all firing in the same frame.

**Evidence.** src/game/audio.ts:94 `export function setMusicMood(mood: MusicMood): void { if (musicMood !== mood) { musicMood = mood; mi = 0; } }`. src/game/audio.ts:120 `SCORE[musicMood].pace` read per reschedule. src/game/LevelScene.ts:320-322 — `setMusicMood('restored'); sfx('wake'); this.flash(500, 255, 235, 175);` plus `spawnP` ×2 and `showHint`, all in one frame.

**Recommendation.** Never reset the step counter — a global `step` that keeps running is what makes a transition land on the beat instead of restarting a tune. Change state by ramping the five layer gains with `setTargetAtTime(target, now, tau)` (tau ≈ 0.35 for ambient moves, 0.12 for the encounter stab), and apply the pending state at the next bar boundary. For the restoration beat specifically, stage it: duck everything to .35 over 0.25 s on the trigger, hold 0.4 s of near-silence under the flash, then bloom all five layers up over 1.2 s so the music arrives WITH the light rather than under it. That reads as intent; the current simultaneous everything reads as noise.

---

### F-041 · Per-biome sonic identity — data model  `M`

**Observation.** There is no per-biome audio data of any kind. `BIOME` carries eleven colour fields plus an ambient particle shape per biome (src/core/biomes.ts) and the audio system has no equivalent, which is why the Cave and the Orchard are audibly the same place. The asymmetry is the tell: the visual system already treats biome identity as data that a designer can edit without touching code, and the audio system treats it as nothing at all.

**Evidence.** src/core/biomes.ts:3-10 `BiomePalette` — sky/hills/soil/grass/ambient fields, and `ambientShape: 'leaf'|'wisp'|'mote'|'petal'|'snow'` proves the pattern is already established. src/game/audio.ts:85-89 — the only musical data in the codebase, keyed by mood, not biome. src/core/world.ts:18-28 — each Region already declares its `biome` string, so the lookup key exists and is threaded to the scene via `prepLevel` → `lv.biome` (world.ts:44) and read at LevelScene.ts:635.

**Recommendation.** Add `src/core/biomeSound.ts` as a sibling of biomes.ts (separate file so the render path doesn't pull audio types):

  interface BiomeSound {
    root: number; scale: number[]; bpm: number;
    padWave: OscillatorType; melodyWave: OscillatorType;
    padFilter: { freq: number; q: number }; detune: number;   // cents, chorus width
    reverb: { seconds: number; preDelay: number; wet: number };
    ambience: { kind: 'birds'|'wind'|'drips'|'rustle'|'surf'|'rain'|'ripple'|'bees'|'blend'; density: number; filter: number; gain: number };
    subdivision: 2 | 3;   // 3 = lilting 6/8
  }

Proposed rows (root/scale carry ~70% of the perceived difference; timbre and ambience the rest):
  meadow     C4 261.63, major pent [0,2,4,7,9],  96 bpm, triangle, LP1400, rev .9s/.18, birds, detune 6
  peaks      G4 392.00, quartal   [0,2,5,7,10],  84 bpm, sine+5th, LP2200, rev 2.6s/.34, wind, detune 3  (open fifths = altitude)
  cave       D3 146.83, minor pent[0,3,5,7,10],  68 bpm, sine,     LP500,  rev 3.4s/.45, drips, detune 12 (beating = unease; melody sounds only every 4th step)
  forest     A3 220.00, mixolyd.  [0,2,4,7,10],  88 bpm, triangle, LP1100, rev 1.4s/.22, rustle  (♭7 = autumn warmth)
  toros      E4 329.63, hicaz-ish [0,1,5,7,8],   76 bpm, saw,      LP700,  rev 2.2s/.30, wind+bell (the one place a genuinely Turkish mode belongs — it will read instantly to a Turkish family)
  orchard    F4 349.23, major pent[0,2,4,7,9],  104 bpm, tri+oct,  LP2600, rev 0.7s/.12, bees  (dry, close, bright — bees are one AM-modulated 180 Hz sine and make the orchard unmistakable)
  coast      D4 293.66, major pent[0,2,4,7,9],   92 bpm, sine,     LP2000, rev 1.1s/.20, surf+gull, subdivision 3 (a 6/8 lilt = rhythmic identity, not just timbre)
  rainforest B3 246.94, dorian    [0,3,5,7,9],   72 bpm, triangle, LP900,  rev 2.8s/.40, rain (roll off >3 kHz on the whole bus = humidity)
  lakeside   G3 196.00, pent      [0,2,5,7,9],   80 bpm, sine,     LP1300, rev 2.0s preDelay .08/.28, ripple+frog+dragonfly (long pre-delay = slapback across water)
  mastery    C5 523.25, major+maj7[0,2,4,7,9,11],100 bpm, tri+sine, LP1800, rev 1.6s/.24, blend (the Meadow's own theme returns an octave up, ambience is every other biome summed quietly — closes the loop for one data row)

Everything above is one table a non-programmer can tune, matching how BIOME palettes already work.

---

### F-042 · Q1 identity-blocker · audio  `S`

**Observation.** The adaptive score has three moods for ten biomes, and every level is set to the same one. `startLevel` unconditionally calls `setMusicMood('meadow')`, so the cave, the coast and the mastery garden all play the Meadow theme; the only mood change in the whole game is Level 1's restoration.

**Evidence.** src/game/audio.ts:83 `export type MusicMood = 'menu' | 'meadow' | 'restored'`, :84-88 `SCORE` has exactly three entries. src/main.ts:51 `setMusicMood('meadow')` inside `startLevel(idx)` with no idx/biome dependency. The only other calls are src/game/LevelScene.ts:320 (`'restored'`, Meadow finale only), src/game/ui.ts:191 and src/main.ts:135 (`'menu'`).

**Recommendation.** Make the mood a per-biome field rather than a three-value enum: `MusicMood = string`, `SCORE: Record<string, ScoreSpec>` keyed by biome id with `'menu'` and `'restored'` as reserved keys, and a `?? SCORE.meadow` fallback so a missing biome degrades to today's behaviour. `startLevel` becomes `setMusicMood(LEVEL_META[idx].biome)`. A `ScoreSpec` is 4 numbers and 2 short arrays (audio.ts:85-87) — ten of them is ~10 lines of data, not a system.

---

### F-043 · Q1 identity-blocker · biome palettes  `S`

**Observation.** Five of the fifteen `BiomePalette` fields are dead — including the two that were specifically meant to carry per-biome atmosphere. `ambientA`, `ambientB`, `ambientShape` (declared as 'ambient particle look' and lovingly filled in for all ten biomes as leaf/wisp/mote/petal/snow) and `cloudFar`/`cloudNear` are never read by any renderer. Every biome therefore has zero ambient life; the only difference between the ten is four sky/hill colours and four soil/grass colours.

**Evidence.** src/core/biomes.ts:7-8 declares `ambientA/ambientB/ambientShape` and `cloudFar/cloudNear`; `grep -rn 'ambient' src/ | grep -v biomes.ts` → only an unrelated comment in assets.ts:38. `grep -rn 'cloudFar\|cloudNear' src/` → no hits outside biomes.ts. The sky/hills draw at src/game/LevelScene.ts:650-655 consumes only `skyTop/skyMid/skyBot/hillsFar/hillsMid`; `bushes` is read only by the Meadow fallback (src/game/meadowEnvironment.ts:37,71) and `grassLight` only by the non-Meadow platform branch (:678).

**Recommendation.** Add one `drawAmbient(g, B, cam, t)` pass (≈30 lines, screen-space, on `foregroundGfx`) that emits 12–18 particles of `B.ambientShape` drifting with `B.ambientA/ambientB`. This is the single cheapest per-level identity win in the codebase: the data already exists and is already distinct per biome, so ten levels gain a distinct atmosphere for one function. Feed the particle count through the same `reducedMotion` gate used by `spawnP` (src/game/LevelScene.ts:161).

---

### F-044 · Q1 identity-blocker · bosses  `M`

**Observation.** Every boss in the game is the same rounded rectangle with two eyes and three hp pips. `drawBoss` branches on `b.kind` in exactly one place — four green circles for the mimic — and on `b.finisher` in one more, for the cage bars. Nine bosses, one silhouette.

**Evidence.** src/game/LevelScene.ts:945-969: `:950` `g.fillRoundedRect(x, y, w, h, 16)` is the entire body; `:951-954` `if (b.kind === 'mimic')` adds `for (let k=0;k<4;k++) g.fillCircle(...)`; `:961-965` `if (b.state === 'caged' && b.finisher === 'cage')`. `BossData` (src/core/generator.ts:18-27) has no art, species, name or attack-pattern field — `kind` is a two-value union (`'thrower' | 'mimic'`, :16-17) that also selects the *finisher interaction* (LevelScene.ts:223-229), so you cannot give a level a new boss look without inventing a new finisher.

**Recommendation.** Split `BossData.kind` into two orthogonal fields: `finisherKind: 'sand'|'recognition'` (what `doUse` does — LevelScene.ts:223-229) and `bossSpecies: string` (what it looks like). Add a boss entry to the same creature registry with an optional `phases` array so a level can specify its own telegraph/attack cadence instead of the global `CONFIG.boss` (src/core/config.ts:12-16) which is currently shared by all nine bosses.

---

### F-045 · Q1 identity-blocker · dead data slots  `S`

**Observation.** `MonsterData` already carries a `type?: string` field intended as a species slot, but it is read in exactly one place — to toggle patrol direction flipping — and never reaches the renderer. The data model has the hook; nothing is plugged into it.

**Evidence.** src/core/generator.ts:14 (`spd?, aggro?, patrolSpd?, flip?, type?: string`); the only consumer is src/core/logic.ts:22 `flip: d.type === 'flipper'`. `grep -n 'm.type\|md.type' src/game/LevelScene.ts` returns nothing — `drawMonster` (src/game/LevelScene.ts:894-944) never reads `type`, so `type: 'flipper'` monsters (src/core/levels.ts:60,101) look identical to walkers. The structural dump confirms only two `type` values exist across all 10 levels (`walker`/`flipper`) in `shots/level-report.json`.

**Recommendation.** Rename `type` → `species` (keep `type` as a deprecated alias for one release so `levels.ts:60,101` and `logic.ts:22` keep working), make it required in `MonsterData`, and have `makeMonster` resolve `SPECIES[species]` for box, palette and behaviour. `flip` then becomes `SPECIES[species].behaviour === 'flipper'` rather than a string comparison in logic.ts.

---

### F-046 · Q1 identity-blocker · dead descriptor fields  `S`

**Observation.** Three descriptor fields are accepted by the type system, written by level authors, and read by nobody. `Recipe.biome` is never destructured; `LevelData.cave` and `LevelData.dark` are never read. An author who sets them gets silence, not an effect — the trap that makes "per-level identity" feel impossible.

**Evidence.** `Recipe.biome` declared at src/core/generator.ts:42, but the destructure at :64 omits it and the returned object at :96-100 has no `biome` key; the real value is stamped later from geography at src/core/world.ts:44 (`lv.biome = LEVEL_META[idx].biome`). `LevelData.cave` / `LevelData.dark` declared at src/core/generator.ts:38, written by src/core/levels.ts:80 (`cave: true, dark: true`); `grep -rn 'L.dark\|L.cave\|\.cave' src/` returns nothing — the darkness pass keys off the palette instead (src/game/LevelScene.ts:737 `if (B.dark)`, src/core/biomes.ts:42 `dark: true` on the cave palette).

**Recommendation.** Either delete `Recipe.biome` and `LevelData.cave` (dead), or wire them: make `makeSection` return `biome: recipe.biome` and make `prepLevel` assert `lv.biome === LEVEL_META[idx].biome` so a mismatch fails a test rather than being silently overwritten. Change LevelScene.ts:737 to `if (this.L.dark ?? B.dark)` so a generated level can be dark without needing a new biome palette. Add a test that every field on `Recipe`/`LevelData` has at least one reader.

---

### F-047 · Q1 identity-blocker · intros / narration  `M`

**Observation.** `intros` is a flat `{x, text}[]` of raw display strings with no key, no speaker, no trigger type and no ordering guarantee. Only Level 1's intros are localised — every other level's intro text is passed through verbatim, which is both an identity ceiling and a shipping i18n bug (see the bugs section). Levels 4–10 get exactly one intro each because `makeSection` emits one.

**Evidence.** src/core/generator.ts:37 (`intros: { x: number; text: string }[]`), :99 (`intros: [{ x: 60, text: hint || 'Yeni bir bölge — ağaçları bul, bulmacaları çöz!' }]` — one entry, Turkish literal). src/game/LevelScene.ts:610-615: `this.hooks.ui.showHint(this.idx === 0 ? S(\`meadow.intro.${ii}\`) : intro.text, 2.6)`. `shots/level-report.json` confirms `intros: 1` for levels 4–10 vs. 6/5/7 for levels 1–3.

**Recommendation.** Change the shape to `{ x: number; key: string; voice?: 'guardian'|'tree'|'creature'; once?: boolean }` and always resolve through `S(key)`. Level 1's six entries already have keys (`meadow.intro.0..5`, src/core/i18n.ts:48-53) so it is a pure move; levels 2–10 need their Turkish literals lifted into the `tr` table plus en/de rows. Extend the existing localisation test (tests/core.test.ts:323-331) to loop over `prepLevel(i).intros` for all ten levels and assert `S(key) !== key` in all three languages — that turns the current silent gap into a red test.

---

### F-048 · Q1 identity-blocker · level indexing  `S`

**Observation.** All per-level behaviour is keyed on the flat array index `idx`, not on a stable level id. `WORLD` is designed for regions that can hold multiple levels (`levels: LevelFn[]`), but the moment any region gains a second level, every `this.idx === 0` in LevelScene silently attaches to the wrong content, and every `prepLevel(N)` in the tests shifts.

**Evidence.** src/core/world.ts:32-39 flattens `WORLD[].levels` into `LEVELS`/`LEVEL_META` by push order; `LEVEL_META` carries `indexInRegion` but nothing consumes it (`grep -n indexInRegion src/` → declaration and assignment only). src/game/LevelScene.ts holds eleven `this.idx === 0` sites (:182,243,253,282,307,479,507,513,613,691,694). tests/core.test.ts:162,171,261-264 and tests/scene.test.ts:163 all address levels by numeric index.

**Recommendation.** Give `LevelData` a stable `id: string` (e.g. `'cayir-1'`) set by `prepLevel` from `${regionId}-${indexInRegion+1}`, and key chapters/art/music off that id. Keep `idx` for save/unlock ordering only. This is a prerequisite for the Chapter registry — otherwise the registry inherits the same fragility it is meant to remove.

---

### F-049 · Q2 extension-point · asset manifest  `M`

**Observation.** `assets.ts` is a flat `Record<ArtKey, string>` of eleven hardcoded paths that are all loaded eagerly at boot with no grouping, no per-level scoping and no release path. It is the right idea at the wrong granularity for ten biomes.

**Evidence.** src/game/assets.ts:5-16 (the `ArtKey` union — eleven literal keys), :18-30 (`SOURCES`), :42-58 (`preloadArt()` does `Promise.all` over *every* entry), :61-64 (`art()` returns null unless `complete && naturalWidth > 0`). src/main.ts:120 blocks boot on it: `void Promise.all([preloadArt(), initPurchases()]).finally(...)`.

**Recommendation.** Restructure into bundles and load per level:
```ts
export interface AssetBundle { id: string; keys: Record<string, string>; }
export const BUNDLES: Record<string, AssetBundle>; // 'core', 'meadow', 'cave', …
export function loadBundle(id: string): Promise<void>;   // idempotent, memoized
export function releaseBundle(id: string): void;         // drop refs so decoded pixels are collectable
export function art(key: string): CanvasImageSource | null; // unchanged signature
```
`preloadArt()` keeps its name and now loads only `core` (Guardian + UI) so the existing boot path and tests are untouched; `startLevel(idx)` awaits `loadBundle(LEVEL_META[idx].biome)` behind the existing entrance/transition screen, and releases the previous biome's bundle. This is also the fix for the memory blocker below.

---

### F-050 · Q2 extension-point · mechanic plugin  `L`

**Observation.** The seven puzzle types are a closed set duplicated across three places with no interface: `PUZZLE_FACTORY` builds them, `LevelScene.solids()` switches on `it.type` to decide which sub-rect becomes collidable, `activate()` switches on `it.type` for sfx/particles, and `drawInteract()` switches on `it.type` for rendering. Adding an eighth mechanic means four coordinated edits in two files, three of them inside LevelScene.

**Evidence.** src/core/generator.ts:53-61 (`PUZZLE_FACTORY`, 7 entries); src/game/LevelScene.ts:169-185 (`solids()` — six type-specific `if` lines with per-type sub-rect names `ice`/`wall`/`leaves`/`bridge`/`block`/`pad` and per-type done-polarity), :200-208 (`activate()` — a 7-case switch), :1048-1126 (`drawInteract()` — a 7-case switch, 79 lines). All three switches key off the same untyped `it.type` string and reach into `it as any` for their sub-rects (:172-178, :201-207, :1039).

**Recommendation.** One registry, one interface, three thin dispatchers:
```ts
export interface Mechanic {
  type: string; eye: Eye;
  build(x: number, gy: number): Interact;
  solids(it: Interact): Rect[];                    // replaces the six ifs in solids()
  onActivate(it: Interact, fx: FxSink): void;      // replaces the activate() switch
  draw(g: Graphics, it: Interact, t: number, reveal: number): void; // replaces drawInteract()
}
export const MECHANICS: Record<string, Mechanic>;
```
`PUZZLE_FACTORY` becomes `mapValues(MECHANICS, m => m.build)` so tests/core.test.ts:150-157 (which iterates `Object.entries(PUZZLE_FACTORY)`) passes unchanged. `solids()` becomes `for (const it of this.L.interact) arr.push(...MECHANICS[it.type].solids(it))`. A per-level unique mechanic is then a registry entry plus a `puzzleTypes` string — no LevelScene edit.

---

### F-051 · Q3 decomposition · LevelScene responsibilities  `L`

**Observation.** LevelScene.ts is 1128 lines doing six separable jobs: (1) input binding and edge-state, (2) player physics + collision, (3) the empathy/monster/boss simulation, (4) Level 1's bespoke chapter script, (5) the entire immediate-mode renderer for world, creatures, trees, puzzles and effects, and (6) HUD/objective/hint orchestration. The renderer alone is 497 lines (:631-1128) — 44% of the file — and it is the part that must grow tenfold for ten unique biomes and creatures.

**Evidence.** Job boundaries by line: input :115-149; physics/collision :434-477 and :169-185; simulation :368-410 (boss), :503-560 (monsters), :561-585 (sand); chapter :70,313-354,479-544,791-893; renderer :631-1128; HUD/objective :251-296. The renderer methods are already cleanly separated and touch only `g`, `this.t`, `this.L`, `this.cam`, `this.nearTree`, `this.healTarget`, `this.meadowStory` — i.e. they read scene state and write nothing.

**Recommendation.** Extract in this order, each step independently shippable and behaviour-identical:
1. `src/game/render/world.ts` — `drawSky`, `drawPlatforms`, `drawCheckpoints`, `drawGoal`, `drawWater`. Pure functions `(g, L, B, art, cam, t) => void`.
2. `src/game/render/entities.ts` — `drawPlayer`, `drawMonster`, `drawBoss`, `drawTree`, `drawInteract`. Same signature style; `this.t`, `this.nearTree`, `this.healTarget` become explicit parameters.
3. `src/game/chapters/*` — the Chapter interface above; `meadowStory` moves behind a delegating getter.
4. `src/game/hud.ts` — objective computation + hint scheduling + rescue heuristic (:251-296), which currently interleaves with physics.
LevelScene keeps `create/update/draw` as a ~350-line orchestrator: input → physics → sim → chapter.update → hud → render.call.

---

### F-052 · Q3 decomposition · test-safety constraints  `M`

**Observation.** The 84-test suite constrains the decomposition in two specific ways that are easy to violate: (a) `tests/render.test.ts` spies on `Graphics.prototype` methods and asserts on *argument shapes* of the resulting draw calls, so any extracted renderer must keep calling the same `Graphics` methods with the same numbers; (b) `tests/scene.test.ts` reaches into eighteen LevelScene privates by name, so fields cannot be renamed or moved off the instance without adapters.

**Evidence.** tests/render.test.ts:23-29 (`vi.spyOn(Graphics.prototype, m)` over 14 geometry methods), :57 asserts `fillRoundedRect` with `args[2]===40 && args[3]===40` (the monster body), :66 asserts a player-ish rounded rect 20<w<80, :68-75 asserts `fillRadial` stop shapes for the cave. tests/scene.test.ts touches `scene.L`, `.monsters`, `.meadowStory`, `.player`, `.bossActive`, `.sandLeft`, `.sands`, `.particles`, `.input2`, `.cameras`, `.lastSafe`, `.nearTree`, `.equipped`, and calls private methods `doUse()`, `updateRecovery()`, `beginMeadowRestoration()`, `spawnP()`, `shake()`, `flash()` (lines 73-77, 96-126, 131-133, 152-158).

**Recommendation.** Decompose by *delegation, never relocation*: keep every currently-poked field and method as a member of LevelScene that forwards to the new module (`private drawMonster(g,m) { drawMonster(g, m, this.renderCtx()); }`). Land the extraction as a pure move in one commit with zero test edits — if any of the 84 tests needs touching, the move was not pure. Only after that, in separate commits, add the new per-level content behind the new seams. Also add one guard test before starting: snapshot the ops-per-frame count per level (currently L01=283, L02=396, L03=351, L04=288, L05=257, L06=267, L07=282, L08=267, L09=273, L10=333) so an accidental double-draw or dropped layer during the move fails loudly.

---

### F-053 · Q4 bug (NEW) · untranslated level text  `M`

**Observation.** Levels 2–10 show Turkish narration to English and German players. The intro dispatcher localises only when `idx === 0`; every other level's `intro.text` is a raw Turkish literal passed straight to the hint bar. The same applies to `LevelData.name`, which is rendered on the level-complete card in all three languages.

**Evidence.** src/game/LevelScene.ts:613 `this.hooks.ui.showHint(this.idx === 0 ? S(\`meadow.intro.${ii}\`) : intro.text, 2.6)`. Raw Turkish literals: src/core/levels.ts:69-74 (level 2: `'🌿 yine sarmaşık — yeni köprü yap!'` etc.), :110-117 (level 3), :125,135,142,149,156,163,174 (the `hint:` strings on every generated level), and src/core/generator.ts:99's default `'Yeni bir bölge — ağaçları bul, bulmacaları çöz!'`. Level names: src/core/levels.ts:7,38,80,123… (`'Bölüm 5 · Toros Yaylası'`) surfaced untranslated by src/game/ui.ts:368 `\`${levelName}${S('next.suffix')}\``. The existing localisation test only covers `meadow.intro.0..5` (tests/core.test.ts:326).

**Recommendation.** Convert `intros[].text` → `intros[].key` and `LevelData.name` → `nameKey` (mirroring what `Region` already does correctly with `nameKey`, src/core/world.ts:12,18-28), add the tr/en/de rows, and delete the `idx === 0` special case at :613 so all levels take one path. Extend tests/core.test.ts:323-331 to iterate all ten levels × three languages. Note `onLevelComplete(idx, this.L.name, …)` (LevelScene.ts:430) passes the display string through main.ts:41 to `ui.showLevelComplete` — change that to pass the key and resolve in the UI.

---

### F-054 · Q4 bug (b) · hardcoded gate collider — CONFIRMED  `S`

**Observation.** CONFIRMED exactly as described. `solids()` — the shared collision function used by every level — pushes a literal rect `{x:2640, y:188, w:34, h:164}` whenever `idx === 0` and the meadow gate is shut. It is one level's geometry hardcoded into the physics of all ten, and it is not derived from, nor checked against, the artwork that draws the same gate 240 lines away.

**Evidence.** src/game/LevelScene.ts:182 `if (this.idx === 0 && !this.meadowStory.pressureAwake) arr.push({ x: 2640, y: 188, w: 34, h: 164 });`. The matching visuals are separate literals in `drawMeadowStory`: :828 `const xx = 2640 + k * 7` for `k < 5` (bars span 2640→2675, i.e. 35 wide vs. the collider's 34) and :832 `g.fillEllipse(2640 + (k % 3) * 14, 212 + k * 23, 22, 11)` (leaf clusters reach x≈2679, 5px past the collider). Nothing ties the two together; `solids()` is called twice per frame for every level (:462, :465).

**Recommendation.** Move the gate into level data and out of physics. Two options, in preference order: (1) with the Chapter interface, `MEADOW_CHAPTER.extraSolids(ctx)` returns the rect and `MEADOW_CHAPTER.draw()` derives its bars from the *same* constant — `solids()` loses the `idx` check entirely; (2) as a one-line stopgap, add a `gate?: { rect: Rect; open: boolean }` field to `LevelData`, set it in `level1()` (src/core/levels.ts:5-33) alongside the trees it belongs with, and make :182 read `if (this.L.gate && !this.L.gate.open)`. Either way export a single `MEADOW_GATE = { x: 2640, y: 188, w: 34, h: 164 }` consumed by both the collider and the renderer, and add a test asserting the drawn bar extents equal the collider extents.

---

### F-055 · Q4 fragile assumption · `x > 2800` oak sentinel  `S`

**Observation.** The identity of Level 1's Ancient Oak — the object the whole chapter converges on — is encoded as the magic predicate `tr.x > 2800`, repeated in five places across objective logic, answer handling, restoration and rendering. Moving the oak by more than ~200px, or adding any decorative tree to the right of 2800, silently reassigns the finale. Two of the five sites use `?.` and would degrade to a permanently-stuck objective bar rather than an error.

**Evidence.** src/game/LevelScene.ts:260 `!this.L.trees.find(tr => tr.x > 2800)?.awake` (objective step 5 — `undefined` here means the bar freezes on 'Follow the lights to the Ancient Oak' forever), :307 `const isFinalMeadowOak = this.idx === 0 && !!tr && tr.x > 2800`, :315 and :326 `this.L.trees.find(tr => tr.x > 2800)?.x ?? 3005` (a second magic fallback), :694 `if (this.idx === 0 && tr.x > 2800) this.drawAncientOak(...)`. The actual oak is at x=3005 (src/core/levels.ts:18).

**Recommendation.** Replace the predicate with an explicit marker on the data: `{ id: 'meşe', x: 3005, y: 352, role: 'chapter-key' }` and select it with `this.L.trees.find(t => t.role === 'chapter-key')`. Remove the `?? 3005` fallbacks — if the key tree is missing that is a content bug and should throw in dev, not silently draw at a guessed coordinate. tests/core.test.ts:93 already asserts `lv.trees.some(t => t.id === 'meşe' && t.x > 2800)`; update it to assert the role instead.

---

### F-056 · Q5 performance · a closure allocation per draw call  `L`

**Observation.** The engine's core design records each draw call as a freshly-allocated closure capturing its arguments, then throws all of them away every frame (`clear()` only resets the array length; the closures themselves are garbage). At today's 250–400 ops/frame that is 15,000–24,000 short-lived closures per second. Ten unique biomes plus per-level creatures will roughly double that, which is where a low-end WKWebView starts showing minor-GC frame drops.

**Evidence.** src/game/engine.ts — every draw method builds and pushes a closure: :61-66 `fillRect`, :76 `fillRoundedRect`, :86 `fillEllipse`, :91 `fillCircle`, :95-99 `drawImage`, :158-165 `fillRadial`, :175 `fillTriangle`, :188/:193 `strokePath`/`fillPath` (which also `slice()` the path array, a second allocation), plus one closure per `moveTo`/`lineTo`/`arc` (:181-185). `clear()` at :49 is `this.ops.length = 0` — the array is reused, the closures are not. **Measured** total ops/frame: L01 283, L02 396, L03 351, L04 288, L05 257, L06 267, L07 282, L08 267, L09 273, L10 333.

**Recommendation.** Do **not** migrate engines — the fix is a flat command buffer behind the same `Graphics` API. Replace `ops: Op[]` with a growable `Float64Array` of packed records (`[opcode, a, b, c, d, e, …]`) plus a small side table for colours/images, and a single `replay(ctx)` switch. The public method signatures, the chaining and `clear()` stay identical, so LevelScene needs zero edits and tests/engine.test.ts:16-21 (which asserts `g.ops.length` after two draws) needs only a length-accessor shim. If that is too large a step for the current milestone, the cheap 80% version is: reuse a per-Graphics free-list of op objects instead of closures (`{ kind, a, b, c, d, e }`), which removes the closure allocation while keeping the replay loop simple. Do the culling fix first — it removes 60–75% of the ops and therefore 60–75% of this cost for a fraction of the work.

---

### F-057 · Q5 performance · empty layers are still cleared and composited  `S`

**Observation.** The engine clears a full 960×540 offscreen buffer and blits it to the display for every Graphics layer every frame, including layers that recorded zero ops. On eight of the ten levels, two of the four layers are permanently empty — so a quarter of the frame's compositing bandwidth is spent blitting transparent pixels.

**Evidence.** src/game/engine.ts:309-318 — the per-layer loop unconditionally does `bx.clearRect(0,0,W,H)` then `ctx.drawImage(buf.c, sx, sy)`; there is no `if (layer.ops.length === 0) continue`. **Measured** ops/frame per layer (bg / world / foreground / dark): L01 37/232/14/0, L02 16/380/0/0, L03 16/331/0/4, L04 16/272/0/0, L05 16/241/0/0, L06 16/251/0/0, L07 16/266/0/0, L08 16/251/0/0, L09 16/257/0/0, L10 16/317/0/0. Layer allocation is at :291-298 (one full-size canvas per Graphics, via `WeakMap`), created fresh for each new scene — src/game/LevelScene.ts:99-102 makes four per level start, ≈8.3MB of backing store re-allocated on every level entry and every restart.

**Recommendation.** (1) In `render()`, `if (layer.ops.length === 0) continue;` before the clear+blit — free, removes 2 of 4 full-screen blits on 8 levels. (2) For the first (background) layer, which always covers the full screen opaquely, draw directly to `this.ctx` instead of via a buffer — that removes another clear + an alpha composite. (3) Pool the layer buffers on the `Game` (keyed by layer index rather than by `Graphics` identity) so a level change reuses the four canvases instead of allocating four new ones; the `WeakMap` at :252 makes reuse impossible by construction because each scene creates new `Graphics` objects.

---

### F-058 · Q5 performance · no view-frustum culling  `S`

**Observation.** The world renderer draws every platform, tree, puzzle, checkpoint and monster in the level every frame regardless of the camera. Only the Meadow foreground band culls. On a 4400px-wide level with a 960px viewport, roughly three quarters of every frame's geometry work is discarded by the composite step.

**Evidence.** src/game/LevelScene.ts:668 `for (const pl of this.L.platforms)`, :683 `for (const cp of this.L.checkpoints)`, :690 `for (const it of this.L.interact)`, :693 `for (const tr of this.L.trees)`, :705 `for (const m of this.monsters)` — none has a bounds test. The only cull in the codebase is src/game/meadowEnvironment.ts:71 `if (screenX + w < -20 || screenX > viewportW + 20) continue;`. **Measured** by replaying the recorded ops against a counting 2D context: on Level 2 at cam=0 the scene issues ~1,440 canvas primitive calls per frame (`fillRect 142, beginPath 256, fill 232, lineTo 283, arcTo 132, arc 108, ellipse 36, …`) while 7 of 10 platforms, 3 of 4 trees and 5 of 6 puzzles are entirely off-screen. Level 1 issues ~993 calls/frame with 8 of 12 entities off-screen.

**Recommendation.** Add one helper and five call-site guards — this is the highest-return-per-line change available:
```ts
private vis(x: number, w: number, pad = 80): boolean {
  return x + w > this.cam - pad && x < this.cam + W + pad;
}
```
Guard each loop (`if (!this.vis(pl.x, pl.w)) continue;` etc.; use `tr.x - 90, 180` for trees, `it.zone.x, it.zone.w` for puzzles, `m.x - 40, 120` for monsters). Expect a 60–75% cut in world-layer ops on levels 2–10 today, and it is what makes per-level painted midgrounds affordable. Guard the render test's expectations: tests/render.test.ts asserts monsters and player are drawn on levels 0/1/2/5 within the first 3 frames — the player and the nearest monster are on-screen at spawn, so those pass, but re-run the suite as the first check after landing this.

---

### F-059 · Q5 performance · per-frame DOM write for the power button  `S`

**Observation.** `ui.setPower()` is called unconditionally from the update loop every frame and writes two DOM properties with no dirty check — 60 style writes and 60 text writes per second, each capable of triggering style recalculation on the overlay. This is a real, measurable cost on an iPhone SE and it is invisible in canvas profiling because it happens outside the canvas.

**Evidence.** src/game/LevelScene.ts:457-458 `this.equipped = this.computeEquip(); this.hooks.ui.setPower(this.equipped);` — inside `update()`, no comparison against the previous value. src/game/ui.ts:104-108 `setPower` writes `bp.style.background` and `bp.textContent` every call. Contrast the neighbouring HUD calls, which are all guarded: `setSand` only fires on change (LevelScene.ts:592,625), `setHearts` only on damage/heal (:418,425), and `setObjective` is explicitly rate-limited by the `objectiveKey` comparison at :267-268.

**Recommendation.** Guard it the same way the objective bar is guarded: `if (next !== this.equipped) { this.equipped = next; this.hooks.ui.setPower(next); }`. Note `computeEquip()` returns `this.equipped` unchanged when the player is in no zone (:219), so the value is stable for the overwhelming majority of frames — the guard eliminates essentially all of these writes. Belt-and-braces: add the same early-out inside `setPower` itself (cache the last eye in the UI) so any future caller is covered.

---

### F-060 · Q5 performance · tiled image fills re-tile every frame  `M`

**Observation.** Meadow platforms are filled by looping `drawImage` per tile inside the recorded op, with no pattern object and no culling — so one wide platform emits over a dozen `drawImage` calls per frame, all of them repeated for the off-screen portion of the platform. This is the pattern every future biome's ground will copy.

**Evidence.** src/game/engine.ts:109-132 `fillImagePattern` — a nested `for (yy…) for (xx…)` issuing `ctx.drawImage(image, 0,0,sw,sh, xx,yy,dw,dh)` per tile; :133-152 `drawTiledX` likewise. Call sites: src/game/LevelScene.ts:670 (`fillImagePattern(meadowSoil, pl.x, pl.y, pl.w, pl.h, 128, 128)`) and :673 (`drawTiledX(meadowGrass, pl.x, pl.y - 14, pl.w, 38, 202)`), inside the uncullled platform loop at :668. Level 1's widest platform is 940×252 (src/core/levels.ts:10) → ⌈940/128⌉ × ⌈252/128⌉ = 16 `drawImage` calls per frame for that platform alone; Level 2's is 980 wide (levels.ts:44).

**Recommendation.** (1) Apply the culling helper first and clip the tiled span to the visible window, not the platform's full width — for a 960px viewport that caps the loop at ~8 tiles regardless of platform length. (2) Replace the manual loop with a cached `CanvasPattern` (`ctx.createPattern(img,'repeat')` built once per image and stored beside the `Image` in the asset registry) plus a single `fillRect` with a translated pattern origin — one canvas call instead of N. (3) The per-tile `Number((image as any).width || tileW)` lookups at :117-118 and :143 run inside the op closure every frame; hoist them into the registry entry.

---

### F-061 · SFX design — feedback polarity  `M`

**Observation.** The game's audio currently teaches the wrong lesson: almost the only UI interactions that make a sound are the ones the child got WRONG. Tapping a locked map node plays `'hmm'`. Tapping a premium-gated node plays `'hmm'`. Answering the family gate incorrectly plays `'hmm'`. Meanwhile every successful, encouraged action — New Game, Continue, Levels, Journal, How To Play, Back, tapping an unlocked map node, opening a card, closing a card, pausing, resuming, changing language, unmuting — is silent. For a five-year-old operating largely on sound, the emergent rule is 'noise means I made a mistake'. In a product explicitly built on no dark patterns and no fail states, this is a design inversion, not a missing polish item.

**Evidence.** Sounds ONLY on rejection: src/game/ui.ts:244 (`family.wrong` → sfx('hmm')), :328 (locked node → speak + sfx('hmm')), :333 (premium node → speak + sfx('hmm')). Silent success paths: ui.ts:216-226 (mStart/mCont/mMap/mJournal/mHow onclick), :335 (unlocked node → `this.requestFS(); this.cb.onStart(...)`), :163-168 `show()`/`hideOverlay()`, :362-368 `showPause()`, :56 language change, :66 mute toggle. The correct-answer path (:420) plays confetti and only fires `sfx('streak')` on a 3-in-a-row — an ordinary correct answer is silent.

**Recommendation.** Add a small `uiBus` sound family and apply it uniformly: a soft wooden 'tap' on every button press (pitched slightly up for primary/play buttons, down for back/ghost), a two-note 'open' rise on card show and its inversion on hide, a warm single note on every correct answer (not only on streaks), and a short confirming chime on unmute so the child can hear that the sound came back. Keep `'hmm'` exactly as it is — it is well-judged — but it must stop being the loudest thing in the UI. Rule of thumb to encode in the design doc: every positive action gets a sound at least as prominent as every corrective one.

---

### F-062 · SFX gaps — combat/damage legibility  `S`

**Observation.** The only damage source in the entire game is completely silent through its full lifecycle. The boss telegraph (the 0.55 s wind-up that is the child's ONLY warning), the projectile launch, the projectile's flight, and its impact on the player all produce no sound. The player learns they were hit only from `sfx('hurt')` firing after the fact. For a 5-year-old this is the worst gap in the audio design: in a game whose whole promise is that nothing scary happens without warning, the one thing that costs hearts arrives in silence. Related: the boss's own defeat — the payoff of the entire encounter — is also silent; `sfx('bosshurt')` plays only on the NOT-defeated branch, so the moment the boss is finally calmed produces particles and a camera shake and nothing audible until the level-complete jingle seconds later.

**Evidence.** src/game/LevelScene.ts:382 `b.tel = C.telegraph;` — no sfx. src/game/LevelScene.ts:405-410 `bossThrow()` — pushes the shot and spawns 5 particles, no sfx. src/game/LevelScene.ts:396-402 — shot integration and player collision, `this.loseLife(false)` only. src/game/LevelScene.ts:388-391 — `if ((b.state as string) === 'defeated') { this.shake(6,.24); this.spawnP(...); }` (no sfx) `else { sfx('bosshurt'); ... }`. src/game/LevelScene.ts:372-374 — arena entry shows a hint bar with no audio sting. CONFIG.boss.telegraph = 0.55 (src/core/config.ts).

**Recommendation.** Four one-line additions with deliberately gentle, non-violent timbres: (a) telegraph — a rising filtered-noise swell over exactly `CONFIG.boss.telegraph` seconds (`noise` with an upward LP sweep 400→2200 Hz), so the warning duration IS the mechanic duration and a child can learn the timing by ear; (b) throw — a soft airy 'whoosh' (LP noise, 180 ms, panned to `b.x`) plus a low triangle blip; (c) impact — reuse a softened 'puff' panned to the shot, distinct from 'hurt' so the child can tell 'that one landed near me' from 'that one hit me'; (d) defeat — move a warm resolving chord onto the `defeated` branch (a major triad arpeggio up, matching the game's kindness: the boss is calmed, not killed). Also give arena entry a low sustained pad swell rather than a hint bar alone.

---

### F-063 · SFX gaps — dead-press feedback  `S`

**Observation.** Three distinct 'I pressed the button and the game did nothing' paths produce no sound. (1) `doUse()` can fall through every branch — no boss in range, no tree in range, no matching interact zone — and return having done absolutely nothing; pressing ✨ / F in open ground is a total silent no-op. (2) Throwing sand with an empty budget shows a hint bar and returns, with no audio. (3) Walking into the Meadow's closed root gate, or into the level's left/right bound, is silent. For a pre-reader the hint bar is not a substitute — they cannot read it. The child's model becomes 'sometimes the button works, sometimes the game is broken.'

**Evidence.** src/game/LevelScene.ts:222-250 `doUse()` — every branch is conditional and there is no else. src/game/LevelScene.ts:625 `if (this.sandLeft <= 0) { this.hooks.ui.showHint('🏖️ ⏳ 🚩', 1.8); return; }` — no sfx. src/game/LevelScene.ts:183 — the root-gate solid is pushed into `solids()` and the collision resolution at :463 just zeroes `p.vx`, silently. Contrast with the deliberately kind `sfx('hmm')` that DOES exist for wrong answers (:301, :357) — the pattern is understood, it is just not applied here.

**Recommendation.** Add a single `'nope'` sound in the same kind register as `'hmm'` — a short, soft, non-descending two-note 'mm-hm' — and fire it on: `doUse()` falling through (add an `else` and a 300 ms re-trigger cooldown so holding the key doesn't stutter), empty sand, and blocked-by-solid when `|p.vx|` was above a threshold before the collision zeroed it. Under 15 lines total, and it converts the game's three worst 'is it broken?' moments into taught affordances.

---

### F-064 · SFX gaps — locomotion  `S`

**Observation.** There are no footsteps. The most continuous action in a platformer — walking, which the child does for essentially the entire runtime — produces no sound at all. Beyond the missing tactility, this forfeits the cheapest and most legible per-biome identity channel available: grass, snow, cave stone, wet forest floor and beach sand are instantly distinguishable to a five-year-old from footsteps alone, without a single note of music changing.

**Evidence.** src/game/LevelScene.ts:443-463 — the movement block computes `dir`, acceleration, friction and `p.face` with no audio call anywhere. The only movement sounds in the whole scene are `sfx('jump')` (:454), `sfx('land', fall)` (:473) and `sfx('boing')` (:470). `sfx('sand')` (:626) is the thrown-sand item, not a surface.

**Recommendation.** Add a stride-driven step emitter in `update()`: accumulate `strideT += |p.vx| * dt` and fire when it crosses ~46 px, gated on `p.grounded`. Synthesise the step from the biome's `ambience.kind`/surface family — a 30–60 ms LP-filtered noise burst with the cut-off and decay per surface (grass 900 Hz soft, snow 2400 Hz with a longer tail, stone 1600 Hz short and reverb-sent, sand 700 Hz very soft, wet forest 1200 Hz with a tiny pitched click). Randomise gain ±15% and cut-off ±10% per step so it never machine-guns, and cap it to one step per 120 ms. This is ~20 lines and is the highest perceived-quality-per-line change in the entire SFX set.

---

### F-065 · SFX gaps — power acquisition  `S`

**Observation.** The equipped eye changes silently. Walking into a puzzle zone auto-equips one of the five powers, and walking out leaves the last one equipped — this is the game's core mechanic and its single most important discovery moment ('a new ability just became available to me'), and it has zero audio. The only feedback is the colour and emoji of the on-screen pad button, which a child looking at their character will not be watching. Each of the five eyes also has a strong established colour and emoji identity that is going completely unused sonically.

**Evidence.** src/game/LevelScene.ts:458-459 `this.equipped = this.computeEquip(); this.hooks.ui.setPower(this.equipped);` — called every frame, no audio. src/game/ui.ts:104-108 `setPower()` — DOM style/textContent only. src/core/config.ts TOOLS — five eyes with distinct colours and emoji (❄️🔥🌿🌀🟣) and no sonic counterpart. Note the call is per-frame, so any sound needs edge detection against a stored previous value.

**Recommendation.** Store `prevEquipped` and, on change to a non-null value, play a short two-note 'equip' motif whose pitch pair is unique per eye — e.g. blue/❄️ a rising perfect 5th on a glassy sine, red/🔥 a warm rising 3rd on a triangle, green/🌿 a rising 2nd with a soft noise leaf-rustle, yellow/🌀 a quick upward arpeggio, purple/🟣 a falling then rising 4th. Same rhythmic shape, different interval and timbre, so all five are one family but individually identifiable. On change to null, a very quiet downward version. This also lets a child learn the five powers by ear before they can read any of the labels.

---

### F-066 · SFX gaps — progress milestones  `M`

**Observation.** Four progress-and-safety moments that the design treats as important are silent. (1) Reaching a checkpoint — the game's core safety promise — spawns particles and refills the sand budget with no sound. (2) The Meadow's seven-step objective bar, which is the progress spine of the award-quality first level, advances silently at every step. (3) Every hint bar appearance is silent, so nothing draws a pre-reader's eye to text they cannot read anyway. (4) The empathy heal has no charge sound: holding 💛 for the full 1.4 s `HEAL_TIME` produces nothing at all until it completes, so the child gets no confirmation they are doing the right thing during the game's signature interaction, and no cue when the heal is interrupted by walking away.

**Evidence.** src/game/LevelScene.ts:589-595 — checkpoint block: `spawnP` + `setSand`, no sfx. src/game/ui.ts:144-150 `setObjective()` — DOM only. src/game/ui.ts:123-142 `showHint`/`playHint` — DOM only. src/game/LevelScene.ts:505-512 — `empathyTick(...)` returns true only on completion, and `sfx('heal')` fires there; the ramp itself (`CONFIG.heal.HEAL_TIME` 1.4 s, `decay` 2) has no audio. src/core/logic.ts owns the empathy timer, so the progress value is available to read.

**Recommendation.** (1) Checkpoint: a warm two-note 'safe here' motif in the biome's key, plus a quiet sparkle — this is the sound a child should learn to feel relief at. (2) Objective advance: a single ascending step tone whose pitch climbs with `current / steps.length`, so the seven-step Meadow bar is audibly a ladder. (3) Hint bar: a very soft 'attention' tick on appearance (and consider auto-`speak()`ing the hint text, which would use the existing i18n strings and directly serve the pre-reader goal). (4) Heal: a rising sustained tone whose frequency tracks the empathy progress 0→1 and whose gain fades if the beam breaks — this turns the game's signature mechanic into something a child can complete with their ears closed, and makes the existing `sfx('heal')` payoff land as a resolution rather than a surprise.

---

### F-067 · Safety — purchase flow  `S`

**Observation.** The paywall is one tap from three child-facing surfaces, including the emotional peak of the free content. `onNextLevel` sends the level-complete card's primary button — the biggest, brightest control on screen, labelled 'Zümrüt Zirveler'e Geç →' — straight to `showFamilyGate()`. Every locked map node also opens the gate on tap, and those nodes are styled with a gold glow ring that reads as a reward rather than a lock. So a six-year-old who has just restored the meadow presses the celebration button and lands on a purchase gate; nine of ten nodes on the journey map do the same.

**Evidence.** src/main.ts:70 (`onNextLevel: () => hasFullJourney() ? startLevel(currentIdx + 1) : ui.showFamilyGate()`); src/game/ui.ts:331-333 (premium node → `speak(...); sfx('hmm'); this.showFamilyGate();`); src/game/ui.ts:298 (`cls === 'premium'` badge `🌿`), index.html:120 (`.mNode.premium` gold ring); src/game/ui.ts:385-391 (`meadow.next` as the `.play` primary button).

**Recommendation.** Never auto-open a purchase surface from a child's success or from a single tap on a child-facing control. Let the celebration card end on the journey map. On the map, a premium node should say (spoken + pictogram) 'a grown-up can open this path' and require a deliberate second action on a visually quieter 'Aile Alanı' entry to reach the gate. Keep the gold ring for the *next playable* node only.

---

### F-068 · Wordless play — learning cards  `S`

**Observation.** The botany payload on the wake card is text-only and never spoken, so the actual teaching content is inert for the target reader. `showTreeWake` speaks only the species name; the family line ('Aile: Kayıngiller · Palamut ağacı') and the fact ('🌱 Bir meşe 500 yıldan uzun yaşayabilir!') are 11–13px text with a 🔊 attached to the name alone. On short-landscape phones `.wakeCard .hint` is hidden and `.treeChoice .tDesc` is `display:none`, so on the primary device the descriptive text is removed entirely rather than replaced with anything.

**Evidence.** src/game/ui.ts:441-453 (`showTreeWake` — `speak(nm)` only; `wakeMeta`, `wakeFact` unspoken); index.html:88 (`.wakeFact{font-size:13px}`), index.html:156 (`.treeChoice .tDesc{display:none}`), index.html:162 (`.wakeCard .hint{display:none}`).

**Recommendation.** Speak name → family → fact as one short utterance on card open, with a 🔊 on the fact block itself. Replace `desc` on the choice cards with a single pictogram per species (acorn, cone, fan-leaf, silver leaf) that survives the phone breakpoint, and keep the sentence for the 8-year-old and the reading adult.

---

### F-069 · Wordless play — objective bar  `S`

**Observation.** The wordless half of the objective bar is illegible and the text half is truncated. Steps render at 25px (21px on short landscape phones), so the emoji are sub-16px glyphs — in the captured L05/L07 frames the 🏖️ step reads as an indistinct dark blob and the → and ✨ steps are barely separable. The label is `white-space:nowrap; text-overflow:ellipsis` inside `max-width:48%` on phones, so 'Soothe with sand, then use the matching power' is cut mid-sentence. The meadow's 7-step sequence also uses 💛 twice (steps 1 and 4) for two different actions, and levels 2–10 share one generic 3-step `['→','🏖️','✨']` bar with 'Follow the glowing path'.

**Evidence.** index.html:99 (`.objectiveStep{width:25px;height:25px;font-size:14px}`), index.html:146 (`.objectiveStep{width:21px;font-size:12px}`, `#objectiveText{font-size:10.5px}`), index.html:100 (`white-space:nowrap;overflow:hidden;text-overflow:ellipsis`); src/game/LevelScene.ts:254 (`steps = ['❄️','💛','🌿','🌀','💛','🌳','✨']`), LevelScene.ts:263 (`steps = ['→','🏖️','✨']`); shots/L05-1.png, shots/L07-1.png.

**Recommendation.** Raise steps to ≥34px, replace emoji with the project's own vector glyphs so they stay readable at size, allow the label to wrap to two lines instead of ellipsing, make every step in a sequence visually unique, and add the 🔊 replay from the previous finding. (Overlaps existing task #2 — that task should adopt the legibility and audio requirements, not just per-level variety.)

---

### F-070 · boss / proposed system  `L`

**Observation.** A procedural boss system with genuinely distinct silhouettes is achievable entirely within the existing primitives (fillRoundedRect, fillCircle, fillEllipse, fillTriangle, arc/strokePath, save/translate/rotate). Proposed: seven archetypes covering nine encounters, each passing a silhouette test at 48px solid black.

**Evidence.** engine.ts already provides every primitive required: fillTriangle (:172), arc (:184), strokePath (:186), fillRadial (:153) for glow, and save/translateCanvas/restore (:199-201) for rotation. The current drawBoss uses only fillRoundedRect and fillCircle, i.e. two of roughly ten available shape tools.

**Recommendation.** Add `BOSS_ART: Record<string, {build: (g, ctx) => void; scale: number; eyes: number}>` dispatched from drawBoss, defaulting to today's rounded rect so existing tests stay green. Archetypes: (1) Stone Sentinel/peaks — three stacked fillRoundedRect slabs of decreasing width with x-jitter on a wide base, deep-set eyes in the top slab, moss fillEllipses on the shoulders. (2) Crystal Heart/cave — 5–7 fillTriangle shards radiating from a fillCircle core, longest vertical, duplicated at 2px offset and low alpha for refraction. (3) Root Tangle/forest+rainforest — wide low fillEllipse body with six tapered three-segment stroked legs, eyes set low and wide. (4) Cloud Ram/toros — nine overlapping fillCircles in a fleece cluster with two arc-swept fillTriangle horns. (5) Orchard Giant/orchard+mastery — pear-shaped fillEllipse with a crown of five fruit circles and two long dangling arm paths. (6) Shell Keeper/coast — fillCircle body with seven nested decreasing-radius arc strokes forming a spiral, soft fillEllipse foot. (7) Reed Spirit/lakeside — tall narrow core with eight vertical reed strokes fanning above, swaying on sin(t), eyes near the base. Escalation rules: scale ramps 1.0 (L2) to 1.9 (L10) so the final boss is ~170px against a 62px Guardian; eye count 2→4→6 by tier; every boss gets a contact shadow ellipse and a breathing idle (h × (1 + sin(t·1.4)·0.03)). Palette rule: derive body colour from the biome's soilDark rotated ~25% toward its complement rather than the two hardcoded constants — mimic green #5e8a52 currently sits at 3.19:1 on mastery gold and would be far worse on the rainforest palette.

---

### F-071 · creatures  `M`

**Observation.** One painted Mossling sprite represents every creature in ten biomes, and it is a soft raster sprite composited directly onto hard flat vector geometry. The style seam is as damaging as the repetition: the creature looks like it was pasted in from a different game.

**Evidence.** src/game/LevelScene.ts:899-917 draws art('character.mossling') unconditionally when the asset loads, for every monster in every level. The same dusty-rose creature appears in L02-2.png (twice in one frame), L03-3.png, L04-1.png, L05-1.png, L07-1.png, L09-1.png and L10-0.png. In L02-2.png it stands on a flat slate rectangle beside a flat vector tree, three visual languages in one 200px span.

**Recommendation.** Short term, once drawImageTinted exists: per-biome hue shift of the same sprite (rose → moss green → slate blue → amber) plus a procedurally drawn overlay that varies ear length, tail curl and body height, giving perceived species variety at near-zero cost. Medium term, 3 authored species per the asset plan above. Independently, close the style seam by upgrading the geometry the creature stands on (the platform-edge work) rather than by downgrading the sprite.

---

### F-072 · engine / missing tint primitive  `S`

**Observation.** Graphics has no tinted-image draw. This is the keystone that makes cheap asset reuse impossible: one cloud plate cannot serve 10 skies, one Mossling cannot serve 10 biomes, one soil tile cannot serve 4 material families. Adding it turns the 63-asset naive plan (7 plates × 9 biomes) into a ~14-asset plan.

**Evidence.** src/game/engine.ts exposes drawImage (:97), drawImageFlipX (:104), fillImagePattern (:112) and drawTiledX (:133). None accept a tint colour; all set only `ctx.globalAlpha`. Consequently the single Mossling sprite is composited unmodified in every biome — identical dusty-rose creature visible in L02-2.png, L03-3.png, L04-1.png, L05-1.png, L07-1.png, L09-1.png and L10-0.png.

**Recommendation.** Add `drawImageTinted(image, x, y, w, h, colour, strength, alpha)`: lazily cache an offscreen canvas per (image, colour, strength), paint the image, then `globalCompositeOperation='source-atop'` fill with the colour at `strength` alpha, and blit. Cache by key so the per-frame cost is one drawImage. Ops stay recorded closures so the headless Vitest suite is unaffected.

---

### F-073 · fx / ambient particles  `S`

**Observation.** Per-biome ambient particles are fully specified in the palette data and were never wired to anything. Three fields — ambientA, ambientB and a five-value ambientShape ('leaf'|'wisp'|'mote'|'petal'|'snow') — are declared for all ten biomes and read by zero lines of code. This is the highest quality-per-effort item in the entire report: the art direction already exists, someone simply never connected it.

**Evidence.** `grep -rn 'ambientShape|ambientA|ambientB' /Users/acm/Documents/oyun/src` returns matches only in src/core/biomes.ts (the declarations at :8 and the ten palette literals). Same for cloudFar/cloudNear. Screenshots confirm the absence: no drifting element appears in any of L02..L10 except transient gameplay particles (the pink burst in L06-2.png is a heal effect, not ambient).

**Recommendation.** Implement one `drawAmbient(g, B, t, cam)` with five tiny shape branches — leaf: fillEllipse rotated via save/translateCanvas; petal: two overlapping fillCircles; snow/mote: fillCircle with sine drift; wisp: a low-alpha stretched fillEllipse at 0.3 parallax. Drive positions from a hashed index so no allocation occurs per frame. Roughly 40 lines gives nine biomes an instant sensory signature.

---

### F-074 · journey map  `M`

**Observation.** The journey map is the most professional-reading surface in the game — serpentine path, biome-tinted zones, per-node tree icons, glow on the next node, drifting clouds — but it is laid out in fixed CSS pixels at percentage positions tuned for 960×540 and has no small-landscape adaptation, so it degrades on the smallest target device. Its tap targets also fall well below the accessible minimum for children.

**Evidence.** index.html:114 sets `.mNode{width:88px}`, positioned by percentage. At 960px wide a node occupies 9.2% of width; at 667px (iPhone SE landscape) the same 88px occupies 13.2%, so adjacent nodes on the serpentine crowd and overlap — 00-map.png already shows the ten nodes nearly touching at 960px. The `@media (orientation:landscape) and (pointer:coarse) and (max-height:430px)` block at :145-166 adapts objectiveBar, hintBar, rescueBtn, ov, card, treeChoice, wakeCard and meadowRecap, but contains no rule for .mNode, #mapTitle or #mapGuardian. Tap targets: `.mNode .sayBtn` is 22×22px (:118) and `.langBtn` resolves to roughly 30×26px (:69), both far below the 44×44 minimum; `.top` buttons are 42×42 (:28), marginally under.

**Recommendation.** Add .mNode rules to the existing small-landscape block: width 68px, icon 32px, and tighten the serpentine percentages. Raise .sayBtn to 32×32 on the map and .langBtn to a 44px minimum hit area (visual size can stay small via padding). Also reconsider the node label at 10.5px (:116) — it is the only text a 5-year-old is asked to parse on this screen; either raise it to 13px or lean fully on the icon plus the existing speak-aloud button.

---

### F-075 · objective bar  `M`

**Observation.** Nine of ten levels share a single fixed three-step objective reading 'Follow the glowing path', with a second fixed state for boss encounters. Level 1 has a bespoke seven-step bar. For a pre-reader audience the objective bar is the primary guidance channel, and in 90% of the game it conveys nothing level-specific.

**Evidence.** L02-0.png, L04-1.png, L05-1.png, L06-2.png, L07-1.png, L09-1.png and L10-0.png all display the identical '→ 🏔 ✨ Follow the glowing path →' bar. L03-3.png, L08-3.png and L10-3.png show the only other state, 'Soothe with sand, then use the matching power'. L01-0.png through L01-3.png show the seven-step meadow bar with distinct per-step icons. Corroborated by shots/level-report.json: levels 4–10 each carry `intros: 1`, versus 6 and 7 for levels 1 and 3.

**Recommendation.** Generate the step list from the level's actual `interact` array, which is already available per level in the recipe — level 5's ['freeze','rock','bridge'] should produce a ❄️/🪨/🌉 three-step bar with the matching TOOLS colour on each step. This is a data-driven change requiring no new copy per level, and it converts the bar from decoration into a legible plan. Raise the incomplete-step opacity from .48 while doing so (index.html:99) — pending steps are currently near-invisible on the dark bar.

---

### F-076 · parallax / depth planes  `M`

**Observation.** Levels 2–10 have no foreground occluder. Meadow has four depth planes (fixed far plate, treeline at 0.28, gameplay at 1.0, foliage at 1.08); every other level has two, both behind the action. The foreground occluder is the strongest and cheapest depth cue available, and it is the thing that most makes L01 read as 'a game' and L06 read as 'a diagram'.

**Evidence.** src/game/meadowEnvironment.ts:5 sets FOREGROUND_PARALLAX = 1.08, but drawMeadowForeground is invoked only at LevelScene.ts:723 under the meadow gate. In L01-1.png foliage clusters cross in front of the player at the lower left and right edges; in L06-2.png and L08-3.png nothing occupies the plane in front of the play surface at all.

**Recommendation.** Generalise drawMeadowForeground's existing vector fallback (meadowEnvironment.ts:71-75 already draws a sine-arched ellipse cluster in `bushes` colour) into a biome-agnostic foreground band, and call it for all biomes. Silhouette shape should follow the same per-biome `horizon` token as the finding above — reeds for lakeside, grass tufts for meadow, rock chips for peaks. Keep alpha ~.85 and never let it cover the standable surface.

---

### F-077 · parallax / figure-ground  `S`

**Observation.** The two parallax hill layers are invisible in all ten biomes — they are separated from the sky by 1.03–1.11:1 contrast, i.e. below the threshold of perception. The result is that the top 55–60% of every non-meadow frame is an empty gradient wash. The palettes were authored as if these layers would read; they do not.

**Evidence.** Measured hillsFar vs skyMid: toros 1.04, rainforest 1.07, meadow 1.08, lakeside 1.10, orchard 1.11 (src/core/biomes.ts). Visible in L04-1.png, L05-1.png, L07-1.png and L09-1.png as faint smudges near the horizon. Contrast with L01-0.png where the painted far plate carries legible mountains, treeline and cloudscape.

**Recommendation.** Pure data change in biomes.ts: push hillsFar to ≥1.6:1 and hillsMid to ≥2.2:1 against skyMid, biasing hillsMid toward the biome's `bushes` hue so the near band reads as vegetation rather than haze. This is a ~20-value edit with no code change and it fixes the emptiest 60% of nine levels.

---

### F-078 · parallax / silhouette variety  `M`

**Observation.** All nine non-meadow biomes share one horizon silhouette: two rows of identical ellipses at fixed sizes. A mountain plateau, a Mediterranean coast, a rainforest and a lakeside all have the same rolling-bump skyline. This is the largest single contributor to the levels feeling like recolours of each other.

**Evidence.** src/game/LevelScene.ts:652-655 — `fillEllipse(bxx, H-90, 340, 220)` at parallax .2 and `fillEllipse(bxx, H-40, 260, 170)` at .45, with no biome branching. Compare the identical horizon geometry in L04-1.png (forest), L05-1.png (toros), L07-1.png (coast) and L09-1.png (lakeside).

**Recommendation.** Add a `horizon: 'rolling'|'jagged'|'spires'|'sawtooth'|'palmFringe'|'mesa'` field to BiomePalette and a small generator per shape, all built from existing primitives: jagged = fillTriangle runs with varied apex height; sawtooth = overlapping conifer triangles; spires = tall narrow fillRoundedRects with rounded tops; palmFringe = fillEllipse trunks plus arc-swept fronds; mesa = fillRect blocks with chamfered tops. Deterministic per-x hash so it is stable frame to frame.

---

### F-079 · platform surface  `M`

**Observation.** Non-meadow platforms are a flat rounded rect, a darker inner rect, a 16px cap and evenly-spaced tick marks. There is no texture, no edge modelling, no ambient occlusion at the soil/grass junction, and no shadow cast into the gap. At peaks the fill is a desaturated grey-green, so the platforms read as grey UI panels floating in a mint void rather than as ground.

**Evidence.** src/game/LevelScene.ts:674-680 (vector branch) versus :669-673 (meadow branch, which gets fillImagePattern soil + drawTiledX grass). Peaks soil is #6b7a78 against skyBot #4fb3ad = 1.79:1. L02-0.png is the clearest case — two large slate rectangles with white caps and nothing else. L08-3.png and L10-3.png show the same on green and gold.

**Recommendation.** Four procedural passes, no assets required, applied to all biomes: (1) a 6px `soilDark` gradient band immediately under the grass cap for contact occlusion; (2) a 2px `grassLight` line along the very top edge as a sun-catch; (3) a soft dark ellipse cast into the gap beside each platform edge to seat it in space; (4) 3–5 irregular `soilDark` blotches per 200px, positioned by a hash of world-x, to break the flat fill. This is the highest-impact procedural change after the palette retune.

---

### F-080 · sky  `S`

**Observation.** Nine of ten skies contain nothing but a three-stop vertical gradient. cloudFar/cloudNear are defined in every palette and, like the ambient fields, are read nowhere. The sky is the largest contiguous area on screen and it is currently doing no work.

**Evidence.** src/game/LevelScene.ts:650-651 draws `fillGradientStyle(skyTop, skyTop, skyMid, skyBot)` then `fillRect(0,0,W,H)` and moves straight to the hills. No cloud pass exists. L04-1.png, L05-1.png, L07-1.png, L09-1.png and L10-0.png all show a bare wash above the horizon. (Secondary: engine.ts:63 ignores the second gradient argument — `grad[1]` is never used, so the tr stop is silently discarded, which is why the call site passes skyTop twice.)

**Recommendation.** Two cloud bands at scrollFactor .08 and .15, each a run of 4–6 overlapping fillCircles with a flat fillRect base — the classic cartoon cumulus — filled in cloudFar/cloudNear. Vary count and altitude by biome (coast: high thin bands; rainforest: low heavy mist; toros: sparse and small to sell altitude). Once drawImageTinted exists, swap in 3 authored alpha cloud plates tinted per biome for a further jump at 3 assets total.

---

### F-081 · style guide / character  `S`

**Observation.** The two authored character sprites follow a consistent and reverse-engineerable set of rules, but those rules are written down nowhere — MEADOW_VISUAL_SYSTEM.md documents palette and asset dimensions only. Without a written spec, any generator or image model asked to produce the next creature will drift.

**Evidence.** Measured from public/art/characters/guardian.webp (512×609) and mossling.webp (384×512). Guardian: hood-plus-head mass spans ~42% of total height (~2.4 heads tall); widest silhouette (cloak flare) ≈ 400px against 609px height. Mossling: head sphere ~31% of height with ears adding ~25% above it; widest ≈ 340px against 512px height. Both land at a silhouette width:height of 0.66. Neither sprite carries a black outline; edges are a darker value of the local hue. Both bodies sit at roughly 35–55% saturation, with the Guardian's five eye jewels as the only fully saturated elements — and those five hues map exactly onto TOOLS in src/core/config.ts:21-26 (blue/red/green/yellow/purple), making the character its own mechanic legend.

**Recommendation.** Publish this as a spec section: silhouette W:H = 0.66 ± 0.05; head-or-hood mass 30–42% of height; 2.4–3.2 heads tall; no black outline, edges are local hue darkened ~25%; interior form modelling via soft value shifts only, never hatching; botanical vein filigree in a lighter tint as the shared surface motif (leaf veins on the Guardian's cloak and boots, on the Mossling's ears, flank and tail); body saturation capped at 55% with exactly one fully-saturated accent per character, and that accent must carry mechanical meaning; eyes are the largest single feature (Mossling irises are ~33% of face width each) with two speculars, large upper-left plus small lower-right. Silhouette test: at 48px solid black, two creatures must not be confusable.

---

### F-082 · upgrade ranking / authored assets  `XL`

**Observation.** Authoring meadow-equivalent art for nine more biomes means roughly 63 plates (7 per biome) plus provenance records, and would very likely never be finished. The honest recommendation is to refuse that plan and buy the same perceived quality with about 14 assets by exploiting tint and material families.

**Evidence.** docs/MEADOW_VISUAL_SYSTEM.md:32-40 lists the 7 shipped meadow plates (far, midground, 3 foreground variants, soil tile, grass edge); public/art/meadow/ confirms all 7 exist plus PROVENANCE.md. Multiplying by 9 remaining biomes gives 63. The doc's own closing line (:68-69) already warns: 'Do not generate all ten biomes before this slice is implemented and child-tested.'

**Recommendation.** Buy instead: (a) 3 alpha cloud plates — cumulus, cirrus, overcast — tinted per biome at draw time, serving all 10 skies; (b) 4 soil+grass tile pairs by *material family* rather than biome — rock (peaks, cave), sand (coast, mastery), loam (forest, orchard, rainforest, lakeside), snow-grass (toros) — 8 assets covering 9 biomes; (c) 3 additional creature sprites, not 9, distributed so no two adjacent levels repeat a species. Total 14 assets. Explicitly do not author: boss sprites (procedural beats raster on escalation and state), far plates (the retuned procedural horizon plus clouds is sufficient once contrast is fixed), or foreground foliage per biome (one tinted silhouette band reads correctly). All of (a) and (c) depend on drawImageTinted landing first.

---

### F-083 · upgrade ranking / procedural  `L`

**Observation.** Ranked by perceived-quality jump per unit of effort, the procedural work dominates and should be completed before a single new asset is commissioned. Items 1–3 are near-free because the art direction already exists in data and merely needs wiring.

**Evidence.** Derived from the findings above. Items 1, 2 and 4 are data or small-code changes against fields already present in src/core/biomes.ts; items 5 and 6 are contained within src/game/LevelScene.ts's draw methods; none require touching the asset pipeline, build size, or docs/ART_PROVENANCE.md.

**Recommendation.** Order: (1) ambient particles — S, wires 3 dead palette fields, gives 9 biomes a sensory signature. (2) cloud bands — S, wires 2 more dead fields, fills the emptiest 60% of frame. (3) parallax + cave contrast retune — S, pure data edit in biomes.ts, fixes a playability blocker and the invisible-horizon problem together. (4) platform edge treatment (occlusion band, sun-catch line, cast shadow, hashed blotches) — M, the single biggest fix for 'grey UI panel'. (5) boss archetype system — L, highest ceiling of anything in the report. (6) per-biome horizon silhouettes — M, kills the recolour feeling. (7) foreground occluder band — M, strongest remaining depth cue. (8) creature tint + silhouette variants — M, needs the tint primitive first. (9) tree crown lighting and eye repositioning — S. Every one of these is achievable in the current engine with zero new assets.

---

## MINOR

### F-084 · Accessibility — motion and danger cues  `S`

**Observation.** Three smaller issues. (1) `reducedMotion` is sampled once in `create()`, so toggling the OS setting has no effect until the next level, and the restoration mote field animates 24 circles regardless of it. (2) The i-frame flicker strobes the Guardian at ~7 Hz for 1.2s after every hit (`Math.floor(this.t * 14) % 2 === 0` → `return`), which is not gated by `reducedMotion` and, for a five-year-old, means their character vanishes at the exact moment they are confused about what just happened. (3) With the shipped raster art, an 'angry' creature has no danger cue at all: the mossling branch of `drawMonster` draws a blindfold bar for 'blind' and a soft green glow plus a small yellow dot for 'happy', and nothing for 'angry' — so the child cannot distinguish a creature that will hurt them from one that will not until contact.

**Evidence.** src/game/LevelScene.ts:97 (`reducedMotion` read once), LevelScene.ts:728-733 (mote loop not guarded); src/game/LevelScene.ts:756-757 (`const flick = p.iframe > 0 && Math.floor(this.t * 14) % 2 === 0; if (flick) return;` with `IFRAME: 1.2` at src/core/config.ts:5); src/game/LevelScene.ts:899-917 (raster branch: blind bar, happy glow+dot, no angry treatment) versus LevelScene.ts:937-939 (the vector fallback *does* draw an angry brow).

**Recommendation.** Listen to the `matchMedia` change event and gate the mote field. Replace the strobe with a steady 55% opacity plus a bright outline for the i-frame window. Give 'angry' an explicit, non-colour cue on the sprite — a furrowed-brow overlay, a trembling wobble, and small distress marks above the head — so the game's own 'frightened, not bad' premise is legible before contact rather than after it.

---

### F-085 · Accessibility — reduced-motion parity for audio  `M`

**Observation.** The scene honours `prefers-reduced-motion` for particles, camera shake and flash, but there is no audio equivalent at all — so a sensory-sensitive child gets a visually calmed game with the full unmodified soundtrack: sharp transients, low-frequency thuds correlated with the (now-suppressed) shakes, and unlimited simultaneous voices. Separately, the media query is sampled exactly once in `create()` and never observed for changes, so toggling Reduce Motion mid-session has no effect until the level is restarted — a bug that will equally affect any audio flag added alongside it.

**Evidence.** src/game/LevelScene.ts:97 `this.reducedMotion = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;` — a one-time read, no `addEventListener('change')`. Applied at :161-163 (`spawnP` count/speed), :166 (`shake`), :167-169 (`flash`). No audio call anywhere consults it: `sfx('thud')` (audio.ts:67, a 120 Hz triangle plus noise) fires at LevelScene.ts:579 paired with `this.shake(4, .16)` — the shake is suppressed under reduced motion and the thump is not.

**Recommendation.** Extend the flag into audio as a `calm` mode: force the `tension` layer and the `sparkle` layer to zero gain, cap simultaneous sfx voices (a simple 6-voice ring with oldest-steal), lengthen sfx attack times from 12 ms to ~40 ms to remove sharp transients, high-pass the sfx bus at 120 Hz to drop shake-correlated thumps, and clamp the bpm multiplier to 1.0 so nothing accelerates. Convert the one-time read into `const mq = matchMedia(...); mq.addEventListener('change', e => this.setReducedMotion(e.matches))` so both the visual and audio responses are live. Consider surfacing it as an explicit in-game 'Sakin mod' toggle too — the OS setting is the right default but many parents will not have it on.

---

### F-086 · Asset strategy — synthesis vs. audio files  `S`

**Observation.** Explicit recommendation on the question of shipping audio files: do not. Three reasons specific to this project. (1) Bundle: the current dist is 6.8 MB and already dominated by art (public/icons 3.4 MB, public/art 1.7 MB). A nine-state adaptive score needs stems, not tracks — five layers × ten biomes at even 96 kbps mono Opus is 8–20 MB, i.e. tripling the download of an offline-first game aimed at a parent's phone, frequently on cellular. (2) Licensing: any third-party library music requires attribution surfaces and per-store rights review, and a Kids-category App Store submission makes an uncleared asset a genuine shipping risk — versus synthesis, which is unambiguously first-party. (3) Adaptivity: the entire per-biome design in this audit is 'change root, scale, filter cutoff and reverb time', which costs literally zero marginal bytes when synthesised and requires a fresh render per variant when sampled. The reverb impulse should likewise be generated procedurally rather than shipped.

**Evidence.** `du -sh dist` = 6.8M; public/icons 3.4M, public/art 1.7M, public/photos 508K. package.json lists no audio dependency and no audio build step. The whole audio system is 135 lines (src/game/audio.ts) and ships 0 bytes of media today. docs/REBUILD_PLAN.md:85 lists 'per-biome ambient soundscape + gentle music' as a target with no asset pipeline planned for it.

**Recommendation.** Stay fully synthesised, with one bounded exception worth considering: 3–5 short recorded one-shots buy more perceived quality per kilobyte than anything else in this audit — a leaf-crunch footstep, a water lap, and a single bird call, as mono 16 kHz Opus, total budget 100 KB hard cap, sourced CC0 or recorded first-party and logged in docs/ART_PROVENANCE.md alongside the existing photo provenance record. Everything else — pads, melody, bells, wind, rain, drips, bees, reverb impulses — is procedurally generated. If that exception is taken, add the byte budget to the build check so it cannot creep.

---

### F-087 · Learning content — factual accuracy  `S`

**Observation.** Two content errors in a game whose purpose is teaching real botany. `huş` (birch) is assigned `family: 'Kayıngiller'` (Fagaceae) when it belongs to Betulaceae — and 'Huşgiller' already exists in the same dataset, correctly assigned to `fındık` and `kızılağaç`. This also corrupts the journal's family-star mechanic: Kayıngiller shows 4 members instead of 3 and Huşgiller 2 instead of 3. Separately, `sekoya` (Sequoia, native to California) is placed in the Toros Yaylası / Taurus Highlands region, which a Turkish parent will notice immediately in a game framed around trees native to Turkey; `ıhlamur`'s 'Ihlamurgiller' (Tiliaceae) is also a deprecated family, now Malvaceae.

**Evidence.** src/core/trees.ts:25 (`'huş': { family: 'Kayıngiller' }`) versus trees.ts:45-46 (`'fındık'`/`'kızılağaç': family: 'Huşgiller'`); src/core/logic.ts:106-115 (`familyStars` totals derived from these strings); src/core/world.ts:22 (`toros` treeSet includes `'sekoya'`); src/core/trees.ts:22 (`'ıhlamur': family: 'Ihlamurgiller'`).

**Recommendation.** Fix `huş` → 'Huşgiller'. Replace `sekoya` in the Toros region with a species actually native to the Taurus range — `göknar` (Abies cilicica) or `karaçam` (Pinus nigra) — and either drop Sequoia or reframe it in a botanical-garden context. Have a botanist or a Turkish primary-school science reference sign off on all 26 family strings before store submission, since these are the game's factual claims.

---

### F-088 · Per-biome sonic identity — ambience & space  `M`

**Observation.** There is no ambience bed, no stereo field, and no distance attenuation. All 22 sfx and both music voices are mono into the destination. A creature at the far edge of the level sounds exactly as loud and exactly as centred as one under the player's feet, and the boss on the right of the arena is indistinguishable positionally from the Guardian on the left. The single existing 'ambience' gesture is a hard-coded leaf hush fired every 8th music note regardless of biome — so the Cave and the Coast both rustle with leaves.

**Evidence.** src/game/audio.ts:113 `if (musicMood !== 'menu' && mi % 8 === 5) noise(.32, .018, 2800); /* distant leaf hush */` — the only ambient sound in the game, biome-agnostic. No `StereoPannerNode` in src/. src/game/LevelScene.ts:572 `sfx('puff')` and :579 `sfx('thud')` take no position argument; the `sfx(n, extra)` signature (audio.ts:53) has one numeric slot, used only by 'land' for fall speed.

**Recommendation.** Two additions. (1) A per-level ambience bed created on level enter and disposed in `shutdown()`: one looping noise BufferSource → BiquadFilter (band-pass for wind/rain, low-pass for surf) → a gain modulated by the shared 0.08 Hz LFO → ambienceBus, plus a sparse event generator for the pitched elements (drips, bird chirps, frog blips) driven off the same music scheduler at a low probability per bar so it stays in the biome's key. (2) Widen `sfx()` to `sfx(name, opts?: { at?: number; fall?: number })` where `at` is a world x; compute `pan = clamp((at - camX - W/2)/(W/2), -1, 1) * 0.7` and `gain *= 1 - 0.4 * min(1, |offset|/W)`. Call sites that already know the position are trivial to update — LevelScene.ts:572 has `s.x`, :579 has `s.x`, :391 has `b.x`, :507 has `m.x`. Everything else keeps the current centred default.

---

### F-089 · Q2 extension-point · chapter state view  `S`

**Observation.** There is no read-only view of the scene that content code could safely take. Every existing per-level behaviour reaches directly into private scene fields (`this.player`, `this.monsters`, `this.L`, `this.cam`, `this.t`, `this.input2`), which is precisely why none of it can be moved out of LevelScene today.

**Evidence.** src/game/LevelScene.ts:513-544 (the companion AI writes `m.x`, `m.ground`, `(m as any).face` and reads `p.x`, `p.face`, `pcx`, `pFeet` — all scene privates), :342-345 (`updateMeadowRestoration` writes `this.player.vx`, `this.input2.left/right` and `this.cam` directly).

**Recommendation.** Define `ChapterCtx` as an explicit, narrow object built once per frame (or a stable object mutated in place to avoid allocation):
```ts
export interface ChapterCtx {
  readonly L: LevelData; readonly monsters: MonsterRuntime[];
  readonly t: number; readonly dt: number;
  readonly player: { x:number; y:number; w:number; h:number; face:number; cx:number; feet:number };
  freezeInput(): void; setCamTarget(x: number): void;
  spawnP(x:number,y:number,n:number,col:number,sp:number,life:number): void;
  hint(key: string, secs?: number): void; flash(...): void; shake(...): void;
  sfx(k: SfxKey): void; music(m: string): void; complete(): void;
}
```
Built from LevelScene's existing methods, this is a 25-line adapter that makes every chapter testable headlessly without a Scene.

---

### F-090 · Q4 fragile assumption · `regionTreePool` returns the live save array  `S`

**Observation.** For the mastery region, `regionTreePool` returns the caller's journal array by reference — the same array held inside the persisted save object. Today every consumer copies before mutating, so nothing is broken, but the contract is 'here is my save's internal state, please be careful'.

**Evidence.** src/core/world.ts:51-55 `if (r.id === 'usta' && journal.length >= 3) return journal;` where `journal` comes from `hooks.journal()` = `save.journal || []` (src/main.ts:33). Consumers happen to be non-mutating: `pick3` filters into a new array (src/core/logic.ts:63), `mimicNextId` likewise (:77). Call sites: src/game/LevelScene.ts:226,234.

**Recommendation.** `return journal.slice();`. One character of cost, removes a whole class of future aliasing bug — particularly relevant once a chapter or a new mechanic wants to reorder or weight the pool.

---

### F-091 · Q4 fragile assumption · boss arena wall spawns behind the player  `S`

**Observation.** The arena wall is inserted into the collision set at the moment the player crosses the trigger, at a position only ~5px behind the player's trailing edge. Any knockback in the same or next frame pushes the player into a solid that did not exist a frame earlier. It resolves (the player is shoved back into the arena rather than clipping through) but it is an undesigned interaction that any change to trigger offsets, player width or knockback velocity turns into a wall-clip.

**Evidence.** src/core/generator.ts:95 `arena = { trig: lastCalm.x + 30, wall: { x: lastCalm.x - 8, y: 120, w: 14, h: 500 } }` → the wall's right edge is `lastCalm.x + 6`. src/game/LevelScene.ts:371-373 activates on `pcx > this.L.arena.trig`, i.e. `player.x > lastCalm.x + 30 - 19` = `lastCalm.x + 11` (player w=38, src/core/config.ts:5). :183 then pushes the wall into `solids()`. Knockback at :422 sets `p.vx = -p.face * 260`, which moves the player ~8.6px left in one frame at dt=1/30 — inside the wall.

**Recommendation.** Move the wall behind the trigger with real margin: `wall.x = trig - 120` (or `trig - (CONFIG.player.w + 60)`), and add a generator test asserting `arena.trig - (arena.wall.x + arena.wall.w) > CONFIG.player.w + 40` for every generated level. Level 2 and 3's hand-authored arenas (src/core/levels.ts:64,105) have the same 52px offset and need the same treatment.

---

### F-092 · Q4 fragile assumption · dead engine affordances  `S`

**Observation.** Three engine/config affordances are written but never read, each of which will mislead the next person who tries to scale the renderer: the camera's bounds, the DPR cap, and the layer buffers' relationship to display resolution.

**Evidence.** (1) `Camera.setBounds` stores `this.bounds` (src/game/engine.ts:206,209) and `render()` (:300-324) never reads it — LevelScene clamps the camera itself at :617 `Math.max(0, Math.min(this.L.w - W, pcx - W/2))`; the `setBounds` call at :103 is decorative. (2) `CONFIG.canvas.maxDPR: 2` (src/core/config.ts:3) has no reader anywhere in `src/`. (3) The canvas is created at a fixed 960×540 backing store (src/main.ts:19-24, engine.ts:267-269) and CSS-scaled, so on a 2× iPhone the whole game is upscaled — a deliberate and correct perf trade, but nothing in the code says so.

**Recommendation.** Delete `Camera.bounds`/`setBounds` (or make `render()` clamp with it and delete the manual clamp at LevelScene.ts:617 — pick one owner). Delete `maxDPR` or wire it. Add a one-line comment at engine.ts:267 stating the fixed-960×540 render target is intentional, because the first instinct when the art gets soft on a retina phone will be to raise it — and that quadruples every cost in the performance findings below.

---

### F-093 · Q4 fragile assumption · dual coordinate encoding for the friend's stone  `S`

**Observation.** The companion's heart-stone is written as two different literals that happen to agree only because one is a left-edge coordinate and the other a centre coordinate, with the 20px half-width of the creature box left implicit. `friendPlateX` is 2518 in the simulation and 2538 in the renderer; a third site re-hardcodes 2518. Changing the creature's box width (a certain consequence of a per-species creature registry) breaks the alignment between where the friend stands and where its stone is painted, with no test to catch it.

**Evidence.** src/game/LevelScene.ts:514 `const guardianPlateX = 2420, friendPlateX = 2518;` (used as the monster's `m.x`, a left edge — see `mbox` at :186 `{ x: m.x, … w: (m as any).w }` with `w = 40` from src/core/logic.ts:20); :535 `Math.abs(m.x - friendPlateX) < 8` (gate opens); vs. src/game/LevelScene.ts:793 `const guardianPlateX = 2420, friendPlateX = 2538;` (used as a draw centre at :812 `plate(friendPlateX, friendOn, true)`), and :796 `Math.abs(story.helper.x - 2518) < 8` — the literal again, now inside the renderer.

**Recommendation.** Export one constant pair in centre coordinates and derive the left edge from the creature's actual box: `const FRIEND_STONE_CX = 2538;` then `targetX = FRIEND_STONE_CX - m.w / 2`. Add an assertion in the meadow chapter test that the drawn plate centre equals `helper.x + helper.w / 2` at the moment `pressureAwake` flips — tests/scene.test.ts:96 already places the helper at x=2517, so the hook exists.

---

### F-094 · Q4 fragile assumption · position-triggered intros can be permanently skipped  `S`

**Observation.** Intros fire on an 80px-wide position window and are marked seen by array index, so any teleport across the window — respawn to a checkpoint, the rescue button, or the death-plane reset — permanently skips that line of narration with no way to hear it again. On a level with one intro (levels 4–10) that means the child can lose the level's only piece of guidance.

**Evidence.** src/game/LevelScene.ts:610-615 `if (!this.introSeen.has(ii) && Math.abs(pcx - intro.x) < 40)`. Teleports that bypass it: :143 `rescueToSafety` (`this.player.x = this.lastSafe.x`), :421 respawn-on-death (`this.player.x = this.respawn.x`), :595 gentle-mode death plane. `introSeen` is only cleared in `create()` (:94).

**Recommendation.** Make intros latch on maximum-x-reached rather than proximity: `if (!seen.has(ii) && pcx >= intro.x) { seen.add(ii); … }` — a monotonic gate cannot be jumped over, and re-entering from the left will not re-fire because of the `seen` set. This also removes the dependency on frame-rate-bounded displacement (currently safe only because `MOVE=275` × `dt≤1/30` = 9.2px < 40px).

---

### F-095 · Q5 performance · budget for the target build  `M`

**Observation.** Putting the numbers together: today's frame costs ~1,000–1,440 canvas primitive calls plus 4 full-screen buffer clears and 4 full-screen blits, with ~250–400 closure allocations. The proposed content — ten painted biomes (far + midground + foreground band + ground tiles), ten creature species, ten distinct bosses, per-biome ambient particles — roughly doubles op count and adds ~10 `drawImage` calls per frame while raising resident texture memory by an order of magnitude. Without the culling, empty-layer, buffer-pool and bundle changes, that lands well outside a 16.7ms budget on an A9/A13-class device; with them, it lands comfortably inside.

**Evidence.** Measured baselines above (ops/frame per layer for all ten levels; ~1,440 ctx calls/frame on L02 at cam=0; 15 of 20 world entities off-screen). Fixed 960×540 render target (src/main.ts:19-24) means fill-rate is constant and modest — the cost is call count, allocation churn and memory, not pixels. Four buffer clears + four blits = 8 × 518,400px = ~4.1Mpx/frame ≈ 250Mpx/s of compositing at 60fps today, of which ~25% is transparent.

**Recommendation.** Sequence the perf work so the cheap structural wins land before the content does: (1) culling helper + five guards (S), (2) skip empty layers + draw the bg layer direct (S), (3) `setPower` dirty check (S), (4) pool layer buffers by index (S), (5) per-biome asset bundles with release (M), (6) `CanvasPattern` for tiled ground (M), (7) particle cap + `decode()` (S). Only then consider the flat command buffer (L). Steps 1–4 are ~40 lines total and should roughly halve current frame cost; they are what buys the headroom for ten biomes. Add the ops-per-frame snapshot test named in the decomposition finding as the regression guard for all of it.

---

### F-096 · Q5 performance · unbounded particle array and no image decode step  `S`

**Observation.** Two smaller hazards that will surface exactly when the game gets more juice: the particle system has no upper bound, and images are considered ready on `load` without being decoded, so the first `drawImage` of a full-screen plate can block the main thread.

**Evidence.** (1) src/game/LevelScene.ts:160-164 `spawnP` pushes unconditionally; the restoration finale alone emits 70 (:318) + 45 (:319) + 44 (:330) + 64 (:334) + a loop `for (let x = 2500; x <= this.L.w - 20; x += 80) spawnP(x, 330, 14, …)` (:338) ≈ 8×14 = 112 more — overlapping in time, and each particle costs one `fillCircle` op per frame (:722). No cap exists anywhere. (2) src/game/assets.ts:48-53 sets `image.decoding = 'async'` and resolves on `onload`; `art()` (:61-64) gates on `complete && naturalWidth > 0`, which `load` satisfies before decode. `img.decode()` is never called and `createImageBitmap` is not used.

**Recommendation.** (1) Cap the pool: `const MAX_P = 220;` and in `spawnP`, `if (this.particles.length + count > MAX_P) this.particles.splice(0, this.particles.length + count - MAX_P);` — oldest-first eviction preserves the newest burst, which is the one the child is looking at. The reduced-motion path (:161) already proves the count is safe to vary. (2) In `preloadArt`, chain `await image.decode().catch(() => {})` after load (or use `createImageBitmap` where available) so the decode cost is paid during the loading screen rather than on the first frame of a level — with per-biome bundles this becomes load-screen work by construction.

---

### F-097 · SFX design — semantic collisions and dead entries  `S`

**Observation.** The 22-sound palette has several many-to-one and one-to-many mappings that actively mislead. `'ding'` means three unrelated things: you gained a heart, you were rescued to safety, and the boss refilled your sand. `'grow'` means four: the grow-vine puzzle, the mushroom pad, the Meadow root gate opening, and restoration cue 1. `'sand'` (120 ms LP noise at 1600 Hz) and `'puff'` (160 ms LP noise at 900 Hz) are close enough to be indistinguishable in play — which is a legibility bug, not a taste one, because it means the child cannot hear whether their throw connected. `'hurt'` (400→200 Hz sine) and `'shrink'` (720→170 Hz sine) share the same descending-sine gesture, so the purple shrink POWER — a good thing the player deliberately does — sounds like taking damage. And `'cut'` is defined but never called from anywhere: dead code in the SfxName union.

**Evidence.** 'ding' at src/game/LevelScene.ts:149, :294, :426. 'grow' at LevelScene.ts:204, :207, :330, :539. 'sand' audio.ts:61 `noise(.12,.2,1600)` vs 'puff' audio.ts:64 `noise(.16,.18,900)`; call sites LevelScene.ts:626 and :572. 'hurt' audio.ts:70 `beep(400,.2,'sine',.24,200)` vs 'shrink' audio.ts:62 `beep(720,.26,'sine',.24,170)`; 'shrink' is fired for the rock puzzle (:206) and the shrink finisher (:366). `grep -rn "sfx('cut')" src/` → zero hits; declared at audio.ts:50 and implemented at :60.

**Recommendation.** Split by meaning, not by waveform convenience: `heartGain` / `rescue` / `sandRefill` replace the three `'ding'` uses; `vineGrow` / `mushroomPop` / `gateOpen` / `restoreBloom` replace the four `'grow'` uses. Move `'sand'` up in pitch and shorten it (a dry 60 ms 3 kHz tick = release) and keep `'puff'` low and soft (= impact) so throw and hit are unmistakably different events. Re-voice `'shrink'` as a descending sine PLUS a rising harmonic partial so it reads as transformation rather than injury, leaving descending-only as the exclusive vocabulary of harm. Delete `'cut'` from the union and the switch, or wire it to the thorn puzzle if a cutting sound is wanted there.

---

### F-098 · SFX design — tone vs. the non-violence promise  `S`

**Observation.** Two timbres and one cadence contradict the product's stated core value. `'burn'` is a 250 ms noise burst plus a sawtooth falling 160→90 Hz — that is a combustion/flamethrower gesture, and it is the sound of the 🔥 eye, in a game whose entire pitch is non-violence. `'cut'` (a 3.2 kHz noise scrape plus a sawtooth blade slide) is the same problem, though it is currently unreachable. And `'sad'` is a descending 440-392-330-262 tetrachord on Game Over — a textbook 'you lost' cadence, in a game that is explicit about having no fail state and no dark patterns, and which elsewhere went to real trouble to make `'hmm'` kind (there is even a comment saying so).

**Evidence.** src/game/audio.ts:58 `case 'burn': noise(.25, .22, 600); beep(160, .2, 'sawtooth', .1, 90);` — used for the thorn wall (LevelScene.ts:203) and the torch (:208). src/game/audio.ts:60 `case 'cut'`. src/game/audio.ts:73 `case 'sad': seq([440, 392, 330, 262], .3, 150, 'sine', .2);` fired at LevelScene.ts:420 on hearts reaching zero. Contrast audio.ts:76-77, which carries the comment 'quiz feedback: kind, never harsh' — the intent is documented, just not applied consistently.

**Recommendation.** Re-voice `'burn'` as warmth rather than combustion: drop the sawtooth entirely, use a filtered noise swell that RISES (400→1800 Hz) with a soft triangle glow tone underneath — the 🔥 eye warms and thaws, it does not incinerate. Replace `'sad'` with a gentle unresolved-but-not-falling figure (e.g. hold the tonic, drop a whole tone, return) that reads as 'let's try again together' rather than 'you failed' — the Game Over card copy already takes that tone, so the audio is the only element still saying otherwise.

---

### F-099 · Scene lifecycle — audio teardown  `S`

**Observation.** No audio object is owned by, or torn down with, a scene. `LevelScene.shutdown()` removes keyboard listeners and nothing else. Music keeps running when there is no scene at all (the engine explicitly draws a blank background in that case), keeps running while the level is paused, keeps running at full level while a modal recognition card is open and the game is speaking, and keeps running through Game Over. When a level is restarted, `startLevel()` disposes the scene and creates a new one but performs no audio reset, so in-flight `seq()` timeouts and ringing oscillators from the previous level bleed into the next. The already-fixed hint-queue-across-levels bug (commit 1bbe883) was the same class of defect in the UI layer, which is corroborating evidence that per-scene teardown is a systemic gap rather than an isolated one.

**Evidence.** src/game/LevelScene.ts:152-158 `shutdown()` — only `removeEventListener` for keys. src/main.ts:54 `game.scene.stop(...); game.scene.remove(...)` with no audio call. src/game/engine.ts:281-287 — the "no active scene" branch. src/game/audio.ts — no `stopMusic`, no voice registry, no way to cancel `seq()` timeouts (audio.ts:47).

**Recommendation.** Give the audio module a scene-scoped handle: `const sceneAudio = enterLevelAudio(biome)` returning `{ setState, dispose }`; `LevelScene.create()` calls it, `shutdown()` calls `dispose()` which stops the ambience bed, cancels pending sequence timers, and ramps the music bus to the menu state. Add `duckFor(ms)` calls on `setModal(true)` (LevelScene.ts:151) and on pause (main.ts:62) so the score steps back when the game is asking the child to read/listen.

---

### F-100 · UI chrome / emoji as art  `M`

**Observation.** Load-bearing UI symbols are OS emoji rather than owned assets: hearts in the HUD, stars and locks on the map, clouds on the map background, and the objective step icons. Emoji render with different metrics, colours and baselines across iOS, Android and desktop browsers, so the game's chrome changes appearance per platform — the most common single tell that a build is a prototype. The black-heart empty state is also a poor read for the target age.

**Evidence.** index.html:96 `#hud{font-size:24px}` with emoji hearts — L01-1.png, L06-2.png and L08-3.png show ❤️❤️🖤, where the lost heart is a black heart rather than an empty outline. src/game/ui.ts:293-294 injects ☁️ spans as the map's cloud layer; :331 uses ⭐/☆ for family progress; :288 falls back to a generated tree icon only if the node webp is missing. 00-map.png shows the emoji stars and locks sitting proud of the card corners.

**Recommendation.** Replace the four load-bearing symbol sets — heart full/empty, star, lock, cloud — with inline SVG or with the existing procedural art path in src/game/art.ts, which already generates data-URI icons (getTreeIcon at :309, guardianBadge at :365) and proves the pattern. Use an outlined empty heart rather than a black one. Decorative emoji inside card bodies can stay.

---

### F-101 · Volume model  `S`

**Observation.** There is no volume model at all — just a hard-coded 0.5 written in two places and a boolean. `initAudio` sets `masterGain.gain.value = muted ? 0 : .5` and `setMuted` independently ramps to the same literal `.5`, so the constant is duplicated; the moment a volume slider exists, unmuting will silently reset the user's chosen level back to 0.5. The module-level `muted` flag is also reassignable from two entry points (`initAudio` re-reads it from the save on every level start, before the early-return guard), which happens to stay consistent today only because `save.muted` is kept in sync by `onMuteToggle` — it is correct by coincidence rather than by construction.

**Evidence.** src/game/audio.ts:13 `masterGain.gain.value = muted ? 0 : .5;` and src/game/audio.ts:20 `masterGain.gain.setTargetAtTime(m ? 0 : .5, audio.currentTime, .02);` — the same literal, no shared constant. src/game/audio.ts:6-8 `muted = startMuted; if (audio) return;` — the assignment precedes the guard, so the second call (from src/main.ts:50 `startLevel`) mutates the flag without touching the gain node. src/core/save.ts:9 — `muted?: boolean` is the only audio field in SaveData.

**Recommendation.** Introduce `let masterVol = 0.5` plus `musicVol`, `sfxVol`, `speechOn`, and route `setMuted` through a single `applyGains()` so no literal appears twice. Persist as `save.audio` with a migration from the existing `muted` boolean (save.ts already has a clean v1→v2 migration path to model this on). Then expose three short sliders in the Pause card — the bus nodes will already exist, so it is DOM work only, and 'turn the music down but keep the voice' is the single most common parent request for a title in this category.

---

### F-102 · first-run impression  `S`

**Observation.** The first screen a child sees is a dark, heavily blurred, near-monochrome plate whose only content is a line of 11px uppercase letterspaced text. For a pre-reader this communicates nothing and reads as a stalled or broken app; the styling is indie-premium adult, not children's.

**Evidence.** 00-menu.png — captured at menu time, it still shows the boot state: a blurred dark-teal meadow plate with 'ÇAYIR UYANIYOR…' in small caps at the bottom. index.html:136 defines `#boot` with `background:#163d3b`, `font-size:11px`, `letter-spacing:.18em`, `text-transform:uppercase`. html/body background is #0f2b29 (:14). The underlying plate is public/art/entrance/meadow-dawn.webp (1672×941).

**Recommendation.** Give the boot screen a non-textual progress signal a 5-year-old can read: the Guardian silhouette walking in place, or the heart from the title mark filling up. Raise the plate's brightness during boot and let the blur resolve as progress rather than holding at maximum blur. Keep the text, but make it secondary rather than the only content. That the menu screenshot caught the boot state at all is worth timing — if the entrance holds for more than about two seconds, that is the window to fill.

---

### F-103 · i18n — localization plumbing  `S`

**Observation.** `<html lang="tr">` is never updated when the language changes, and every control's `aria-label` in index.html is hard-coded Turkish ('Sola git', 'Zıpla', 'Oyunu duraklat', 'Sesi aç veya kapat'); only `#rescueBtn` is re-localized in `applyLang`. `sayBtn` also hard-codes `aria-label="dinle"`. A German or English child using VoiceOver/TalkBack hears Turkish control names, and the browser's speech and hyphenation heuristics treat the whole document as Turkish.

**Evidence.** index.html:2 (`<html lang="tr">`); grep shows no `documentElement.lang` assignment anywhere in src/; index.html:180-188 (11 Turkish `aria-label`s); src/game/ui.ts:62-64 (`applyLang` updates only `rescueBtn`); src/game/ui.ts:177 (`aria-label="dinle"`).

**Recommendation.** Set `document.documentElement.lang` in `setLang`, move all control labels into the STR tables, and have `applyLang` write every `aria-label` and `title` from `S()`. Add `ui.aria.*` keys for the eleven controls.

---

### F-104 · objective bar / i18n truncation  `S`

**Observation.** The objective text is set to nowrap with ellipsis overflow inside a percentage-capped bar. Turkish strings run materially longer than English, so the primary guidance line for the primary language will silently truncate on small screens — and the audience cannot read the truncated remainder anyway.

**Evidence.** index.html:100 — `#objectiveText{font-size:12px;...white-space:nowrap;overflow:hidden;text-overflow:ellipsis}`; the container at :98 is capped `max-width:min(620px,72%)`. On a 667px-wide iPhone SE landscape that resolves to ~480px minus the step row and padding. The small-landscape override at :146 drops the font to 10.5px but does not relax nowrap. English 'Soothe with sand, then use the matching power' already nearly fills the bar in L10-3.png at 960px.

**Recommendation.** Allow two lines with `white-space:normal` and a `-webkit-line-clamp:2`, and lean harder on the icon row so meaning survives without the text at all. Verify against the longest Turkish string in src/core/i18n.ts at 667×375, not against English at 960×540.

---

### F-105 · platform surface / meadow  `S`

**Observation.** The meadow's own authored soil tile visibly kaleidoscope-repeats. The 128px pattern reads as a grid of identical rosettes across the entire ground plane, which undercuts the level that is supposed to be the quality bar.

**Evidence.** L01-3.png shows the repeat unmistakably across the full-width ground; also visible in L01-0.png and L01-2.png on the taller platform faces. docs/MEADOW_VISUAL_SYSTEM.md:42-44 documents the cause: the tile 'was mirrored in both axes during processing so its seams are deterministic' — four-fold mirroring is precisely what manufactures a rosette. It is drawn at LevelScene.ts:670 via fillImagePattern at 128×128 from a 512×512 source.

**Recommendation.** Keep the mirrored tile as the base but add a second fillImagePattern pass of the same tile at ~1.7× scale, offset by a non-integer multiple, at ~0.25 alpha. The interference between the two periods destroys the visible grid for one extra draw call. Additionally darken the lower 40% of each platform face with a vertical gradient so the eye is drawn to the lit top edge rather than the tiling field.

---

### F-106 · props / trees  `S`

**Observation.** The tree renderer produces six recognisable crown shapes — a genuine strength — but bolts the same two white googly eyes at a fixed offset onto every species, and renders flat two-tone fills with no lighting. In the flagship level this creates a visible style seam: a flat vector tree with cartoon eyes stands directly beside painted parallax trees.

**Evidence.** src/game/LevelScene.ts:970-1036; crown branches at :999 (tall), :1006 (oval), :1013 (conifer), :1018 (weeping), :1022 (palm), :1026 (broad); eyes drawn unconditionally at :1030-1032 at `y - trunkH - 24` regardless of species. L01-0.png shows the vector tree with white eyes against the painted treeline. L10-0.png shows the weeping crown, L05-1.png the conifer, L07-1.png the broad — the crowns do read as different species, so the shape work is sound.

**Recommendation.** Move the eyes onto the trunk with a per-species vertical offset (they currently sit inside the foliage mass, which is why they read as googly rather than as a face), and fade them out entirely beyond ~200px from the player so distant trees stay scenery. Add a third leaf tone applied only to the upper-right of each crown mass to match the mandated light direction, and scallop the crown silhouette with 4–6 small negative-space notches so the fills stop reading as plain circles.

---

### F-107 · style guide / environment  `S`

**Observation.** The environment rules are similarly implicit. The meadow's authored layers follow a consistent atmospheric-perspective discipline that the flat biome palettes do not attempt, which is why the flat biomes read as diagrams even where their hues are pleasant.

**Evidence.** In L01-0.png and L01-1.png the far plate is desaturated and value-compressed toward the sky (distant hills sit within roughly 15% value of the sky behind them), the midground treeline is mid-saturation, and the foreground foliage is the most saturated and darkest element in frame. The flat biomes invert or flatten this: peaks soil #6b7a78 is the *least* saturated element while sitting on the *nearest* plane (src/core/biomes.ts:24).

**Recommendation.** Codify: saturation and contrast both increase monotonically with proximity — far plate ≤20% saturation and within 20% value of sky, midground 30–50%, gameplay plane 50–70%, foreground occluder darkest and most saturated at ~0.85 alpha. Edge treatment: no strokes anywhere in the environment; separation comes from value steps of ≥1.6:1 between adjacent planes. Particle budget: ≤28 ambient particles on screen and ≤40 event particles, with ambient drawn behind the gameplay plane and event particles in front so juice never obscures a platform edge.

---

### F-108 · style guide / lighting  `S`

**Observation.** The documented light direction and the shipped art disagree, and the code encodes a third answer. This will compound as soon as a second biome is authored, because every new asset will inherit whichever convention its generator happened to see.

**Evidence.** docs/MEADOW_VISUAL_SYSTEM.md:13 mandates 'warm morning light from the upper right'. The far plate agrees — in L01-0.png the sky glow and cloud rims are brightest at upper right. But both character sprites read as lit from the upper left or near-frontally: the Guardian's hood highlight sits on the upper-left of the hood, and the Mossling's lit side is its left with occlusion falling to the right. Meanwhile the code draws all three ground shadows as symmetric ellipses centred directly under the subject — drawPlayer LevelScene.ts:762, drawMonster :898, drawTree :984 — which encodes no directional light at all.

**Recommendation.** Pick upper-right (it matches the shipped background plate, the more expensive asset to redo) and enforce it in three places: state it as a hard constraint in the character spec; offset every contact shadow ellipse by roughly -0.18 × height on x so shadows fall left; and add a warm rim-light pass on the right edge of procedural creatures. If the character sprites are ever regenerated, flip their key light.

---

## POLISH

### F-109 · SFX design — repetition fatigue  `S`

**Observation.** `'jump'` is a fixed 300→560 Hz sine glissando at gain .25, fired identically on every single jump — roughly once a second for a ten-minute session, with no pitch variation, no round-robin, no gain scaling by intent. Pure-sine glissandi are exactly the timbre that becomes fatiguing fastest under repetition, and this is by a wide margin the most-triggered sound in the game. `'land'` already does the right thing by scaling with fall speed via the `extra` parameter — the mechanism exists and is simply not applied to jump or to anything else.

**Evidence.** src/game/audio.ts:56 `case 'jump': beep(300, .12, 'sine', .25, 560);` fired at src/game/LevelScene.ts:454. Compare src/game/audio.ts:75 `case 'land': { const fall = extra ?? .5; beep(190 - fall * 70, ...); noise(.08, .1 + fall * .08, 400); }` — the parameterised pattern already exists.

**Recommendation.** Detune jump by ±40 cents randomly per trigger, vary the gain ±12%, and shorten it slightly (0.09 s) so it sits under the footsteps rather than over them. Generalise: add a tiny `vary(f, cents)` helper and apply it to every high-frequency repeated sound — jump, footsteps, sand throw, puff. Two lines each, and it is the difference between a game that is pleasant for forty minutes and one a parent turns off at ten.

---

### F-110 · Safety — pressure mechanics  `S`

**Observation.** The pressure-free surfaces are genuinely clean and should be protected from well-meaning 'improvement': the journal has no counters, no completion percentage, no daily streak, no timers and no loss framing (`showJournal` lists learned trees and family stars only); the first-try streak is session-only, never persisted, has no visible counter and no penalty (`streakAnswer` resets silently); the game-over copy is kind ('Kalplerin tükendi — sorun yok, Koruyucu pes etmez!'); and healing a creature *gives back* a heart. The only side effect is that the streak is so invisible a child cannot connect the extra confetti to anything they did, so it motivates nothing.

**Evidence.** src/game/ui.ts:341-360 (`showJournal` — no counters or timers); src/core/logic.ts:83-91 and src/game/ui.ts:42 (`private streak … session-only`); src/core/i18n.ts:15 ('over.body'); src/game/LevelScene.ts:424-426 (`gainHeart` on empathy success).

**Recommendation.** Keep all of the above as-is. Either surface the streak wordlessly at the moment it lands — three leaf tokens filling on the card, the third bursting — or remove it, but do not turn it into a persisted counter, and do not add daily streaks, timers, star ratings or completion percentages to the journal.

---

### F-111 · UI chrome / what already works  `S`

**Observation.** Worth recording so it is not regressed: the DOM UI layer is genuinely well built, and the accessibility problems in this game are concentrated in the canvas palettes, not in the CSS. Measured text contrast passes comfortably almost everywhere.

**Evidence.** Measured WCAG ratios against index.html values — #objectiveText #fff7ec on the bar's #0f2b29 = 14.14:1; .card h1 and .mNode label #1f4d4a on #fff7ec = 8.91:1; #mapTitle on the map gradient = 8.37:1; .card p = 6.35:1; .wakeFact = 6.24:1; .play label #563415 on #f3a95e = 5.61:1. Safe-area insets are respected on every fixed element (:28, :31-34, :68, :101, :129, :136). `@media (prefers-reduced-motion:reduce)` is honoured at :169. Touch pads are 70×70 with `touch-action:manipulation` (:17, :35) and are correctly hidden on fine pointers (:167). A portrait rotate-guard exists (:135).

**Recommendation.** The one genuine DOM contrast failure is #7a9a96 at 2.87:1, used for `.hint` at 11.5px (:66) and `.tDesc` at 11px (:85) — both small text, so this fails WCAG AA by a wide margin. Darken that token to approximately #5c7f7a (≈4.6:1) and raise both sizes by 1px. Everything else in this layer should be treated as the standard the canvas work is held to.

---
