/* Unit coverage for the vanilla-Canvas engine (replaces Phaser). Verifies the
   pieces LevelScene relies on: colour parsing, Graphics op recording/clear, the
   Scene lifecycle facade + display list, and camera scroll/shake/flash state. */
import { describe, it, expect } from 'vitest';
import { Graphics, Camera, Scene, BLEND, hexToNum } from '../src/game/engine';

describe('engine: hexToNum', () => {
  it('parses #rrggbb into 0xRRGGBB', () => {
    expect(hexToNum('#000000')).toBe(0x000000);
    expect(hexToNum('#63c49b')).toBe(0x63c49b);
    expect(hexToNum('#ffffff')).toBe(0xffffff);
  });
});

describe('engine: Graphics', () => {
  it('records draw calls as ops and clear() empties them', () => {
    const g = new Graphics();
    g.fillStyle(0x112233, 1).fillRect(0, 0, 10, 10).fillCircle(5, 5, 3);
    expect(g.ops.length).toBe(2); /* fillStyle sets state, does not push an op */
    g.clear();
    expect(g.ops.length).toBe(0);
  });

  it('chains fluently and defaults scrollFactor to 1', () => {
    const g = new Graphics();
    expect(g.scrollFactorX).toBe(1);
    expect(g.setScrollFactor(0)).toBe(g);
    expect(g.scrollFactorX).toBe(0);
  });

  it('darkness sequence: erase blend is active only between the blend ops', () => {
    /* the Section-3 regression: fill rect (normal) → erase punch → back to normal.
       Replay the exact op sequence LevelScene's dark layer records and assert the
       composite operation active at each fill. */
    const g = new Graphics();
    g.fillStyle(0x0a0718, .62).fillRect(0, 0, 960, 540);
    g.setBlendMode(BLEND.ERASE);
    g.fillStyle(0xffffff, 1).fillRadial(480, 270, 150, [[0, 1], [.6, .88], [1, 0]]);
    g.setBlendMode(BLEND.NORMAL);
    const fills: { kind: string; gco: string }[] = [];
    const stops: string[] = [];
    const ctx: any = {
      globalCompositeOperation: 'source-over', globalAlpha: 1, fillStyle: '',
      fillRect() { fills.push({ kind: 'rect', gco: this.globalCompositeOperation }); },
      createRadialGradient: () => ({ addColorStop: (_o: number, c: string) => { stops.push(c); } }),
      beginPath() {}, arc() {},
      fill() { fills.push({ kind: 'radial', gco: this.globalCompositeOperation }); },
    };
    for (const op of g.ops) op(ctx);
    expect(fills).toEqual([
      { kind: 'rect', gco: 'source-over' },       /* darkness veil drawn normally */
      { kind: 'radial', gco: 'destination-out' }, /* punch erases the veil only */
    ]);
    expect(ctx.globalCompositeOperation).toBe('source-over'); /* restored for next frame */
    expect(stops).toEqual(['rgba(255,255,255,1)', 'rgba(255,255,255,0.88)', 'rgba(255,255,255,0)']);
  });

  it('replays recorded ops onto a 2D context (smoke, no throw)', () => {
    const g = new Graphics();
    g.fillStyle(0x445566, 0.5).fillRoundedRect(1, 2, 20, 10, 4);
    g.lineStyle(2, 0x778899).beginPath(); g.moveTo(0, 0); g.lineTo(5, 5); g.strokePath();
    g.setBlendMode(BLEND.ERASE); g.fillCircle(3, 3, 2); g.setBlendMode(BLEND.NORMAL);
    const calls: string[] = [];
    const ctx = new Proxy({}, { get: (_t, p: string) => (..._a: any[]) => { calls.push(p); return {}; } }) as any;
    expect(() => { for (const op of g.ops) op(ctx); }).not.toThrow();
    expect(calls).toContain('fill');
    expect(calls).toContain('stroke');
  });
});

describe('engine: Camera', () => {
  it('setScroll + setBounds store state', () => {
    const c = new Camera();
    c.setScroll(120, 0); c.setBounds(0, 0, 2000, 540);
    expect(c.scrollX).toBe(120);
    expect(c.bounds.w).toBe(2000);
  });
  it('shake and flash arm decaying timers', () => {
    const c = new Camera();
    c.shake(200, 0.01); c.flash(240, 255, 80, 90);
    expect(c.shakeT).toBeCloseTo(0.2);
    expect(c.flashT).toBeCloseTo(0.24);
    expect(c.flashR).toBe(255);
  });
});

describe('engine: Scene', () => {
  it('add.graphics pushes to the display list', () => {
    const s = new Scene('x');
    const a = s.add.graphics(); const b = s.add.graphics();
    expect(s.children).toEqual([a, b]);
  });
  it('scene facade drives active/paused state', () => {
    const s = new Scene('x');
    expect(s.scene.isActive()).toBe(true);
    s.scene.pause(); expect(s.scene.isActive()).toBe(false); expect(s.isPaused).toBe(true);
    s.scene.resume(); expect(s.scene.isActive()).toBe(true);
    s.scene.stop(); expect(s.scene.isActive()).toBe(false); expect(s.isLive).toBe(false);
  });
});
