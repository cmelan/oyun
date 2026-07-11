# First prompt for a new Claude Code session

Paste this (or something like it) as your first message once you have this repo open in
Claude Code:

---

This is Çok Kalpli Koruyucu, a non-violent children's puzzle-platformer. Before doing
anything else:

1. Read `docs/PROJECT_INSTRUCTIONS.md` in full — it's the canonical, current project doc.
   Ignore any other "Fundamentals" file you might see referenced elsewhere; this one is
   authoritative and dated at repo migration.
2. Run `npm test` and confirm all tests pass before making any change. If something's
   already red, tell me before doing anything else — don't fix it silently as part of an
   unrelated task.
3. Follow the working agreement in that doc: one feature at a time, concise updates,
   gradual delivery, and add a test for anything you add to `tests/smoke.test.js` rather
   than checking your work by hand.
4. When adding a new tree species: verify the leaf silhouette is genuinely distinguishable
   at the real 56-58px card size before wiring it in — don't just eyeball it at a large
   preview size. (A Python/PIL pixel-preview script is the pattern used throughout this
   project so far; a quick canvas-to-PNG render works too if that's easier in this
   environment.)
5. Ask for my playtest feedback before batch-producing multiple new sections — the
   generator can produce content fast, but each new biome/tree-set batch should be
   validated with an actual child before the next batch ships.

Once you've done 1-2, tell me what you found and wait for direction — don't start building
yet.

---

## Why this exists
Early development happened conversationally in Claude.ai, with the game as a single file
re-uploaded each session and an ad-hoc Node test script written from scratch in `/tmp` every
time something needed verifying. That worked while the project was small; it stopped
scaling once the WORLD schema, section generator, and 13-tree content system landed. This
repo + the formal test suite in `tests/` is the fix — Claude Code can now run real
regression tests instead of re-deriving them, and git history replaces "which fundamentals
file is the real one" confusion.
