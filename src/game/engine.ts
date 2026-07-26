/* Minimal vanilla-Canvas engine — replaces Phaser 3 for this game.
   Provides just the API surface LevelScene used (a Graphics facade shaped like
   Phaser.GameObjects.Graphics, a Camera with scroll/shake/flash, a Scene base
   with the .scene lifecycle facade, and a Game rAF/render driver).

   Design: Graphics records immediate-mode draw calls as closures (ops); the Game
   replays each layer's ops onto its own offscreen buffer per frame and composites
   them in creation order, applying the camera scroll per layer (scrollFactor) and
   a global shake/flash. Per-layer buffers keep blend modes (ERASE for cave holes)
   isolated so they reveal the world beneath rather than the page behind the canvas.
   Recording (not executing) in the draw methods means the headless test suite can
   drive create()/update() with no real canvas — ops simply accumulate unexecuted. */

export type BlendMode = 'normal' | 'erase';
export const BLEND: { NORMAL: BlendMode; ERASE: BlendMode } = { NORMAL: 'normal', ERASE: 'erase' };

export type Radius = number | { tl: number; tr: number; bl: number; br: number };
type Op = (ctx: CanvasRenderingContext2D) => void;
const TAU = Math.PI * 2;

/** '#rrggbb' → 0xRRGGBB (replaces Phaser.Display.Color.HexStringToColor().color). */
export function hexToNum(hex: string): number { return parseInt(hex.slice(1), 16) || 0; }
function numToCss(n: number): string { return '#' + (n & 0xffffff).toString(16).padStart(6, '0'); }

function corners(r: Radius): { tl: number; tr: number; bl: number; br: number } {
  return typeof r === 'number' ? { tl: r, tr: r, bl: r, br: r } : { tl: r.tl || 0, tr: r.tr || 0, bl: r.bl || 0, br: r.br || 0 };
}
function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: Radius): void {
  const c = corners(r); const maxR = Math.min(w, h) / 2;
  const tl = Math.min(c.tl, maxR), tr = Math.min(c.tr, maxR), br = Math.min(c.br, maxR), bl = Math.min(c.bl, maxR);
  ctx.beginPath();
  ctx.moveTo(x + tl, y);
  ctx.lineTo(x + w - tr, y); ctx.arcTo(x + w, y, x + w, y + tr, tr);
  ctx.lineTo(x + w, y + h - br); ctx.arcTo(x + w, y + h, x + w - br, y + h, br);
  ctx.lineTo(x + bl, y + h); ctx.arcTo(x, y + h, x, y + h - bl, bl);
  ctx.lineTo(x, y + tl); ctx.arcTo(x, y, x + tl, y, tl);
  ctx.closePath();
}

export class Graphics {
  ops: Op[] = [];
  scrollFactorX = 1;
  private _fill = '#000'; private _fillA = 1;
  private _stroke = '#000'; private _strokeW = 1; private _strokeA = 1;
  private _grad: [number, number, number, number] | null = null;
  private _path: Op[] = [];

  setScrollFactor(x: number): this { this.scrollFactorX = x; return this; }
  clear(): this { this.ops.length = 0; return this; }

  fillStyle(color: number, alpha = 1): this { this._fill = numToCss(color); this._fillA = alpha; this._grad = null; return this; }
  lineStyle(width: number, color: number, alpha = 1): this { this._strokeW = width; this._stroke = numToCss(color); this._strokeA = alpha; return this; }
  fillGradientStyle(tl: number, tr: number, bl: number, br: number, _alpha = 1): this { this._grad = [tl, tr, bl, br]; return this; }
  setBlendMode(mode: BlendMode): this {
    const gco: GlobalCompositeOperation = mode === 'erase' ? 'destination-out' : 'source-over';
    this.ops.push(ctx => { ctx.globalCompositeOperation = gco; }); return this;
  }

  fillRect(x: number, y: number, w: number, h: number): this {
    const f = this._fill, a = this._fillA, grad = this._grad;
    this.ops.push(ctx => {
      ctx.globalAlpha = a;
      if (grad) { const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, numToCss(grad[0])); g.addColorStop(0.5, numToCss(grad[2])); g.addColorStop(1, numToCss(grad[3])); ctx.fillStyle = g; }
      else ctx.fillStyle = f;
      ctx.fillRect(x, y, w, h);
    });
    return this;
  }
  strokeRect(x: number, y: number, w: number, h: number): this {
    const s = this._stroke, lw = this._strokeW, a = this._strokeA;
    this.ops.push(ctx => { ctx.globalAlpha = a; ctx.strokeStyle = s; ctx.lineWidth = lw; ctx.strokeRect(x, y, w, h); });
    return this;
  }
  fillRoundedRect(x: number, y: number, w: number, h: number, radius: Radius = 0): this {
    const f = this._fill, a = this._fillA;
    this.ops.push(ctx => { ctx.globalAlpha = a; ctx.fillStyle = f; roundRectPath(ctx, x, y, w, h, radius); ctx.fill(); });
    return this;
  }
  strokeRoundedRect(x: number, y: number, w: number, h: number, radius: Radius = 0): this {
    const s = this._stroke, lw = this._strokeW, a = this._strokeA;
    this.ops.push(ctx => { ctx.globalAlpha = a; ctx.strokeStyle = s; ctx.lineWidth = lw; roundRectPath(ctx, x, y, w, h, radius); ctx.stroke(); });
    return this;
  }
  fillEllipse(x: number, y: number, w: number, h: number): this {
    const f = this._fill, a = this._fillA;
    this.ops.push(ctx => { ctx.globalAlpha = a; ctx.fillStyle = f; ctx.beginPath(); ctx.ellipse(x, y, Math.max(0, w / 2), Math.max(0, h / 2), 0, 0, TAU); ctx.fill(); });
    return this;
  }
  fillCircle(x: number, y: number, r: number): this {
    const f = this._fill, a = this._fillA;
    this.ops.push(ctx => { ctx.globalAlpha = a; ctx.fillStyle = f; ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, TAU); ctx.fill(); });
    return this;
  }
  drawImage(image: CanvasImageSource, x: number, y: number, w: number, h: number, alpha = 1): this {
    this.ops.push(ctx => {
      ctx.globalAlpha = alpha;
      ctx.drawImage(image, x, y, w, h);
    });
    return this;
  }
  fillImagePattern(
    image: CanvasImageSource,
    x: number, y: number, w: number, h: number,
    tileW: number, tileH: number,
    alpha = 1,
  ): this {
    this.ops.push(ctx => {
      ctx.globalAlpha = alpha;
      const sourceW = Number((image as any).width || tileW);
      const sourceH = Number((image as any).height || tileH);
      for (let yy = y; yy < y + h; yy += tileH) {
        for (let xx = x; xx < x + w; xx += tileW) {
          const dw = Math.min(tileW, x + w - xx);
          const dh = Math.min(tileH, y + h - yy);
          ctx.drawImage(
            image,
            0, 0, sourceW * (dw / tileW), sourceH * (dh / tileH),
            xx, yy, dw, dh,
          );
        }
      }
    });
    return this;
  }
  drawTiledX(
    image: CanvasImageSource,
    x: number, y: number, w: number, h: number,
    tileW: number,
    alpha = 1,
  ): this {
    this.ops.push(ctx => {
      ctx.globalAlpha = alpha;
      for (let xx = x; xx < x + w; xx += tileW) {
        const dw = Math.min(tileW, x + w - xx);
        const sourceW = Math.max(1, Math.round((dw / tileW) * Number((image as any).width || tileW)));
        ctx.drawImage(
          image,
          0, 0, sourceW, Number((image as any).height || h),
          xx, y, dw, h,
        );
      }
    });
    return this;
  }
  /* Radial-alpha circle: current fill colour, alpha ramping through `stops`
     [offset, alpha]. Under BLEND.ERASE this is the soft light punch (v1's
     lantern glow) — the alpha ramp is what feathers the erased edge. */
  fillRadial(x: number, y: number, r: number, stops: [number, number][]): this {
    const f = this._fill, st = stops.slice();
    this.ops.push(ctx => {
      const n = parseInt(f.slice(1), 16) || 0;
      const cr = (n >> 16) & 0xff, cg = (n >> 8) & 0xff, cb = n & 0xff;
      const grad = ctx.createRadialGradient(x, y, 0, x, y, Math.max(0.01, r));
      for (const [off, a] of st) grad.addColorStop(off, `rgba(${cr},${cg},${cb},${a})`);
      ctx.globalAlpha = 1; ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, TAU); ctx.fill();
    });
    return this;
  }
  strokeCircle(x: number, y: number, r: number): this {
    const s = this._stroke, lw = this._strokeW, a = this._strokeA;
    this.ops.push(ctx => { ctx.globalAlpha = a; ctx.strokeStyle = s; ctx.lineWidth = lw; ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, TAU); ctx.stroke(); });
    return this;
  }
  fillTriangle(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number): this {
    const f = this._fill, a = this._fillA;
    this.ops.push(ctx => { ctx.globalAlpha = a; ctx.fillStyle = f; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x3, y3); ctx.closePath(); ctx.fill(); });
    return this;
  }

  /* path building (world uses moveTo/lineTo/arc + strokePath/fillPath) */
  beginPath(): this { this._path = []; return this; }
  moveTo(x: number, y: number): this { this._path.push(c => c.moveTo(x, y)); return this; }
  lineTo(x: number, y: number): this { this._path.push(c => c.lineTo(x, y)); return this; }
  arc(x: number, y: number, r: number, start: number, end: number, acw = false): this {
    this._path.push(c => c.arc(x, y, Math.max(0, r), start, end, acw)); return this;
  }
  strokePath(): this {
    const path = this._path.slice(), s = this._stroke, lw = this._strokeW, a = this._strokeA;
    this.ops.push(ctx => { ctx.globalAlpha = a; ctx.strokeStyle = s; ctx.lineWidth = lw; ctx.beginPath(); for (const p of path) p(ctx); ctx.stroke(); });
    return this;
  }
  fillPath(): this {
    const path = this._path.slice(), f = this._fill, a = this._fillA;
    this.ops.push(ctx => { ctx.globalAlpha = a; ctx.fillStyle = f; ctx.beginPath(); for (const p of path) p(ctx); ctx.closePath(); ctx.fill(); });
    return this;
  }

  /* canvas transform (bridge sway uses save/translate/rotate/restore) */
  save(): this { this.ops.push(c => c.save()); return this; }
  restore(): this { this.ops.push(c => c.restore()); return this; }
  translateCanvas(x: number, y: number): this { this.ops.push(c => c.translate(x, y)); return this; }
  rotateCanvas(rad: number): this { this.ops.push(c => c.rotate(rad)); return this; }
}

export class Camera {
  scrollX = 0; scrollY = 0;
  bounds = { x: 0, y: 0, w: 0, h: 0 };
  shakeT = 0; shakeDur = 0; shakeInt = 0;
  flashT = 0; flashDur = 0; flashR = 255; flashG = 255; flashB = 255;
  setBounds(x: number, y: number, w: number, h: number): this { this.bounds = { x, y, w, h }; return this; }
  setScroll(x: number, y: number): this { this.scrollX = x; this.scrollY = y; return this; }
  shake(durationMs: number, intensity: number): this { this.shakeDur = durationMs / 1000; this.shakeT = this.shakeDur; this.shakeInt = intensity; return this; }
  flash(durationMs: number, r: number, g: number, b: number): this { this.flashDur = durationMs / 1000; this.flashT = this.flashDur; this.flashR = r; this.flashG = g; this.flashB = b; return this; }
}

export interface SceneFacade { pause(): void; resume(): void; isActive(): boolean; stop(): void; remove(): void; }

export class Scene {
  static KEY: string;
  children: Graphics[] = [];
  add = { graphics: (): Graphics => { const g = new Graphics(); this.children.push(g); return g; } };
  cameras = { main: new Camera() };
  scene: SceneFacade;
  private _active = true;
  private _paused = false;

  constructor(_key?: string) {
    this.scene = {
      pause: () => { this._paused = true; },
      resume: () => { this._paused = false; },
      isActive: () => this._active && !this._paused,
      stop: () => { this._active = false; },
      remove: () => { this._active = false; },
    };
  }
  get isPaused(): boolean { return this._paused; }
  get isLive(): boolean { return this._active; }

  init(_data: unknown): void {}
  create(): void {}
  update(_time: number, _deltaMs: number): void {}
  shutdown(): void {}
}

export interface GameConfig { parent: string; width: number; height: number; backgroundColor: string }

export class Game {
  readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private bg: string;
  private W: number; private H: number;
  private current: Scene | null = null;
  private bufs = new WeakMap<Graphics, { c: HTMLCanvasElement; x: CanvasRenderingContext2D }>();
  private lastT = 0;

  scene = {
    add: (_key: string, scene: Scene, _autostart: boolean, data: unknown): void => {
      if (this.current) this.current.shutdown();
      this.current = scene; scene.init(data); scene.create();
    },
    stop: (_key: string): void => { this.current?.scene.stop(); },
    remove: (_key: string): void => { this.current?.shutdown(); this.current = null; },
  };

  constructor(cfg: GameConfig) {
    this.W = cfg.width; this.H = cfg.height; this.bg = cfg.backgroundColor;
    const parent = document.getElementById(cfg.parent);
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.W; this.canvas.height = this.H;
    (parent || document.body).appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d')!;
    requestAnimationFrame(this.loop);
  }

  private loop = (t: number): void => {
    const deltaMs = this.lastT ? Math.min(t - this.lastT, 100) : 16.7;
    this.lastT = t;
    const s = this.current;
    if (s) {
      if (s.isLive && !s.isPaused) s.update(t, deltaMs);
      this.render(s, deltaMs / 1000);
    } else {
      /* no active scene (menus): keep the canvas the game's background colour
         rather than letting the page backdrop show through the letterbox. */
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.globalAlpha = 1; this.ctx.globalCompositeOperation = 'source-over';
      this.ctx.fillStyle = this.bg; this.ctx.fillRect(0, 0, this.W, this.H);
    }
    requestAnimationFrame(this.loop);
  };

  private bufFor(g: Graphics): { c: HTMLCanvasElement; x: CanvasRenderingContext2D } {
    let b = this.bufs.get(g);
    if (!b) {
      const c = document.createElement('canvas'); c.width = this.W; c.height = this.H;
      b = { c, x: c.getContext('2d')! }; this.bufs.set(g, b);
    }
    return b;
  }

  private render(s: Scene, dt: number): void {
    const ctx = this.ctx, W = this.W, H = this.H, cam = s.cameras.main;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = this.bg; ctx.fillRect(0, 0, W, H);

    let sx = 0, sy = 0;
    if (cam.shakeT > 0) { cam.shakeT -= dt; const k = Math.max(0, cam.shakeT / cam.shakeDur); sx = (Math.random() * 2 - 1) * cam.shakeInt * W * k; sy = (Math.random() * 2 - 1) * cam.shakeInt * H * k; }

    for (const layer of s.children) {
      const buf = this.bufFor(layer); const bx = buf.x;
      bx.setTransform(1, 0, 0, 1, 0, 0); bx.clearRect(0, 0, W, H);
      bx.globalAlpha = 1; bx.globalCompositeOperation = 'source-over';
      bx.save();
      if (layer.scrollFactorX !== 0) bx.translate(-cam.scrollX * layer.scrollFactorX, 0);
      for (const op of layer.ops) op(bx);
      bx.restore();
      ctx.drawImage(buf.c, sx, sy);
    }

    if (cam.flashT > 0) {
      cam.flashT -= dt; const a = Math.max(0, cam.flashT / cam.flashDur);
      ctx.globalAlpha = a; ctx.fillStyle = `rgb(${cam.flashR},${cam.flashG},${cam.flashB})`; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
    }
  }
}
