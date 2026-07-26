import { describe, expect, it, vi } from 'vitest';
import { BIOME } from '../src/core/biomes';
import { Graphics } from '../src/game/engine';
import { drawMeadowForeground, drawMeadowMidground } from '../src/game/meadowEnvironment';

describe('Meadow environment layers', () => {
  it('tiles the raster midground across the viewport', () => {
    const g = new Graphics();
    const draw = vi.spyOn(g, 'drawImage');
    drawMeadowMidground(g, {} as CanvasImageSource, 420, BIOME.meadow, 960, 540);
    expect(draw.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('keeps a procedural midground when the raster is unavailable', () => {
    const g = new Graphics();
    const ellipses = vi.spyOn(g, 'fillEllipse');
    const images = vi.spyOn(g, 'drawImage');
    drawMeadowMidground(g, null, 420, BIOME.meadow, 960, 540);
    expect(images).not.toHaveBeenCalled();
    expect(ellipses.mock.calls.length).toBeGreaterThan(6);
  });

  it('draws only visible foreground clusters and keeps them decorative', () => {
    const g = new Graphics();
    const draw = vi.spyOn(g, 'drawImage');
    const image = {} as CanvasImageSource;
    drawMeadowForeground(g, { left: image, middle: image, right: image }, 0, 3040, BIOME.meadow, 960, 540);
    expect(draw.mock.calls.length).toBeGreaterThan(0);
    expect(draw.mock.calls.length).toBeLessThan(4);
    expect(draw.mock.calls.every(([, , y, , h]) => Number(y) + Number(h) > 540)).toBe(true);
  });

  it('keeps procedural foreground foliage when raster clusters are unavailable', () => {
    const g = new Graphics();
    const ellipses = vi.spyOn(g, 'fillEllipse');
    drawMeadowForeground(g, { left: null, middle: null, right: null }, 0, 3040, BIOME.meadow, 960, 540);
    expect(ellipses.mock.calls.length).toBeGreaterThan(3);
  });
});
