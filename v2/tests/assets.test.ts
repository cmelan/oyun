import { describe, expect, it } from 'vitest';
import sharp from 'sharp';

const asset = (name: string) =>
  decodeURIComponent(new URL(`../public/art/meadow/${name}`, import.meta.url).pathname);

describe('Meadow production art pack', () => {
  it('ships a 16:9 far background at 2x logical resolution', async () => {
    const meta = await sharp(asset('far-background.webp')).metadata();
    expect(meta.width).toBe(1920);
    expect(meta.height).toBe(1080);
    expect(meta.format).toBe('webp');
  });

  it('ships a square soil tile suitable for repetition', async () => {
    const meta = await sharp(asset('soil-tile.webp')).metadata();
    expect(meta.width).toBe(512);
    expect(meta.height).toBe(512);
  });

  it('ships a transparent 2x Meadow midground plate', async () => {
    const image = sharp(asset('midground-treeline.png'));
    const meta = await image.metadata();
    expect(meta.width).toBe(1920);
    expect(meta.height).toBe(1080);
    expect(meta.hasAlpha).toBe(true);

    const { data, info } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const alphaAt = (x: number, y: number) => data[(y * info.width + x) * info.channels + 3];
    expect(alphaAt(0, 0)).toBe(0);
    expect(alphaAt(info.width - 1, 0)).toBe(0);
  });

  it.each(['left', 'middle', 'right'])('ships a normalized transparent %s foreground cluster', async (variant) => {
    const image = sharp(asset(`foreground-${variant}.png`));
    const meta = await image.metadata();
    expect(meta.width).toBe(768);
    expect(meta.height).toBe(512);
    expect(meta.hasAlpha).toBe(true);

    const { data, info } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const alphaAt = (x: number, y: number) => data[(y * info.width + x) * info.channels + 3];
    expect(alphaAt(0, 0)).toBe(0);
    expect(alphaAt(info.width - 1, 0)).toBe(0);
  });

  it('ships a transparent, horizontally tileable grass edge', async () => {
    const image = sharp(asset('grass-edge.png'));
    const meta = await image.metadata();
    expect(meta.width).toBe(512);
    expect(meta.height).toBe(96);
    expect(meta.hasAlpha).toBe(true);

    const { data, info } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const alphaAt = (x: number, y: number) => data[(y * info.width + x) * info.channels + 3];
    expect(alphaAt(0, 0)).toBe(0);
    expect(alphaAt(info.width - 1, 0)).toBe(0);
  });
});
