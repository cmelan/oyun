/* UI overlay regression. The DOM is stubbed the same way the scene suite stubs
   it, but hintBar is a real recording element so the hint queue's actual
   behaviour over time is observable. */
import { describe, it, expect, beforeEach, vi } from 'vitest';

interface StubEl {
  id: string; style: Record<string, string>; textContent: string; innerHTML: string;
  classList: { add(c: string): void; remove(c: string): void; toggle(c: string, on?: boolean): void; contains(c: string): boolean };
  setAttribute(k: string, v: string): void;
  querySelectorAll(): StubEl[];
  querySelector(): StubEl | null;
  addEventListener(): void;
  onclick: (() => void) | null;
  offsetWidth: number;
}

const elements = new Map<string, StubEl>();
function makeEl(id: string): StubEl {
  const classes = new Set<string>();
  return {
    id, style: {}, textContent: '', innerHTML: '',
    classList: {
      add: c => { classes.add(c); }, remove: c => { classes.delete(c); },
      toggle: (c, on) => { const want = on ?? !classes.has(c); want ? classes.add(c) : classes.delete(c); },
      contains: c => classes.has(c),
    },
    setAttribute() {}, querySelectorAll: () => [], querySelector: () => null,
    addEventListener() {}, onclick: null, offsetWidth: 0,
  };
}

let timers: { id: number; fn: () => void; at: number }[] = [];
let clock = 0;
function advance(ms: number): void {
  const target = clock + ms;
  for (;;) {
    const due = timers.filter(t => t.at <= target).sort((a, b) => a.at - b.at)[0];
    if (!due) break;
    timers = timers.filter(t => t !== due);
    clock = due.at;
    due.fn();
  }
  clock = target;
}

beforeEach(() => {
  elements.clear(); timers = []; clock = 0;
  (globalThis as any).document = {
    getElementById: (id: string) => {
      if (!elements.has(id)) elements.set(id, makeEl(id));
      return elements.get(id);
    },
    createElement: () => ({
      width: 0, height: 0, className: '', textContent: '', style: {},
      getContext: () => new Proxy({}, { get: () => () => ({}) }),
      toDataURL: () => 'data:image/png;base64,STUB',
      remove() {},
    }),
    addEventListener() {}, documentElement: { style: {} },
  };
  let nextId = 1;
  (globalThis as any).window = {
    addEventListener() {}, removeEventListener() {},
    setTimeout: (fn: () => void, ms: number) => { const id = nextId++; timers.push({ id, fn, at: clock + ms }); return id; },
    clearTimeout: (id: number) => { timers = timers.filter(t => t.id !== id); },
    matchMedia: () => ({ matches: false }),
  };
  (globalThis as any).clearTimeout = (globalThis as any).window.clearTimeout;
  (globalThis as any).speechSynthesis = undefined;
});

import { UI } from '../src/game/ui';

function makeUI(): UI {
  const noop = () => {};
  return new UI({
    onStart: noop, onResume: noop, onRetry: noop, onNextLevel: noop,
    onLangChange: noop, onMuteToggle: () => false, onRestartLevel: noop,
    onRescue: noop, onPauseToggle: noop,
    canAccessLevel: () => true,
    isFamilyPurchaseAvailable: () => false,
    onFamilyPurchase: async () => false,
    press: noop, release: noop, onTreeAnswer: noop, onMimicAnswer: noop,
  }, {});
}
const hintBar = () => elements.get('hintBar')!;

describe('hint bar', () => {
  it('shows the first hint immediately and queues the rest', () => {
    const ui = makeUI();
    ui.showHint('first', 3);
    ui.showHint('second', 3);
    expect(hintBar().textContent).toBe('first');
    advance(3100);
    advance(200);
    expect(hintBar().textContent).toBe('second');
  });

  it('clearHints drops the queue so a chapter never inherits the last one\'s voice', () => {
    const ui = makeUI();
    ui.showHint('meadow-only-A', 3);
    ui.showHint('meadow-only-B', 3);
    ui.showHint('meadow-only-C', 3);
    expect(hintBar().textContent).toBe('meadow-only-A');

    ui.clearHints();
    expect(hintBar().textContent).toBe('');
    expect(hintBar().style.opacity).toBe('0');

    /* Nothing from the old chapter may reappear on any later tick. */
    advance(20000);
    expect(hintBar().textContent).toBe('');

    /* And the bar still works afterwards. */
    ui.showHint('new-chapter', 2);
    expect(hintBar().textContent).toBe('new-chapter');
  });

  it('leaving gameplay clears hints', () => {
    const ui = makeUI();
    ui.showHint('in-level', 4);
    ui.setGameplayVisible(false);
    expect(hintBar().textContent).toBe('');
    advance(9000);
    expect(hintBar().textContent).toBe('');
  });

  it('walking back into a trigger does not replay the sentence being read', () => {
    const ui = makeUI();
    ui.showHint('same', 2);
    ui.showHint('same', 2);
    ui.showHint('same', 2);
    expect(hintBar().style.opacity).toBe('1');

    /* The bar hides by fading (the text stays for the transition), so visibility
       is the signal: after the single hint expires nothing may light it again. */
    advance(2100);
    expect(hintBar().style.opacity).toBe('0');
    advance(400);
    expect(hintBar().style.opacity).toBe('0');
  });

  it('a genuinely different follow-up hint still plays after the current one', () => {
    const ui = makeUI();
    ui.showHint('first', 2);
    ui.showHint('first', 2);   /* duplicate: dropped */
    ui.showHint('second', 2);  /* different: queued */
    advance(2100);
    advance(200);
    expect(hintBar().textContent).toBe('second');
    expect(hintBar().style.opacity).toBe('1');
  });
});
