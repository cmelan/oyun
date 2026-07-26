# Çok Kalpli Koruyucu

Non-violent puzzle-platformer for children (~5–8). Single-file HTML5 Canvas +
vanilla JS, offline-capable, Turkish/English/German/Arabic.

## Structure
```
game/  cok-kalpli-koruyucu.html   ← the actual game (open directly in a browser)
tests/ smoke.test.js              ← regression suite (node, no dependencies)
       harness-helpers.js         ← DOM/canvas/localStorage stubs for headless testing
docs/  PROJECT_INSTRUCTIONS.md    ← canonical project doc — read this first, every session
```

## Setup
```bash
git init
git add .
git commit -m "Initial import from chat-based development"
```
No `npm install` needed — the test suite is dependency-free Node.

## Running the game
Just open `game/cok-kalpli-koruyucu.html` in a browser, or:
```bash
npm run serve   # http-server on :8080, opens automatically
```

## Running tests
```bash
npm test
```
Run this before and after every change. See `docs/PROJECT_INSTRUCTIONS.md` for what's covered.

## Continuing development
Read `docs/PROJECT_INSTRUCTIONS.md` in full before making changes — it's the accurate,
current state of the project (architecture, what's shipped, what's next, working agreements).
If you're starting a fresh Claude Code session, see `docs/FIRST_PROMPT.md` for a ready-to-paste
bootstrap message.
