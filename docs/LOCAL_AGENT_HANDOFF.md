# Local Agent Handoff — Meadow Visual Foundation

Continue the `cmelan/oyun` game from the completed Meadow visual-foundation
commit. Do not recreate the work or regenerate its three shipped textures.

## Import and publish

1. Confirm that the current repository is `cmelan/oyun`.
2. Preserve any uncommitted local work before changing branches.
3. If `origin/agent/meadow-visual-foundation` exists, fetch it and switch to it.
4. Otherwise import the supplied `oyun-meadow-visual-foundation.bundle`:

   ```bash
   git fetch /absolute/path/to/oyun-meadow-visual-foundation.bundle \
     agent/meadow-visual-foundation:agent/meadow-visual-foundation
   git switch agent/meadow-visual-foundation
   git push -u origin agent/meadow-visual-foundation
   ```

5. Open a draft pull request into `main` titled
   `Add meadow visual foundation`.

## Verify before continuing

```bash
cd v2
npm install
npm test
npm run build
```

Expect 57 passing tests and a successful Vite production build. Report any
different result before modifying code.

## Continue development

Read these files completely:

- `docs/PROJECT_INSTRUCTIONS.md`
- `docs/MEADOW_VISUAL_SYSTEM.md`
- `docs/VISUAL_UPGRADE_AGENT_PROMPT.md`

Then implement the Meadow Level 1 vertical slice in the order specified by
`VISUAL_UPGRADE_AGENT_PROMPT.md`. Start with the midground and foreground
environment layers. Work one feature at a time, retain procedural fallbacks,
keep gameplay collision independent from decorative art, and run tests and the
production build after each feature.

Do not migrate engines, redesign other biomes, or merge the draft PR without
explicit approval.
