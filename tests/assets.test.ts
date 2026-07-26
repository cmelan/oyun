import { describe, expect, it } from 'vitest';
import sharp from 'sharp';

const asset = (name: string) =>
  decodeURIComponent(new URL(`../public/art/meadow/${name}`, import.meta.url).pathname);
const publicAsset = (name: string) =>
  decodeURIComponent(new URL(`../public/${name}`, import.meta.url).pathname);

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

describe('opening identity art', () => {
  it('ships a high-resolution 16:9 entrance plate', async () => {
    const meta = await sharp(publicAsset('art/entrance/meadow-dawn.webp')).metadata();
    expect((meta.width || 0) / (meta.height || 1)).toBeCloseTo(16 / 9, 1);
    expect(meta.width).toBeGreaterThanOrEqual(1600);
  });

  it('ships a compact transparent Guardian with a readable portrait ratio', async () => {
    const meta = await sharp(publicAsset('art/characters/guardian.webp')).metadata();
    expect(meta.hasAlpha).toBe(true);
    expect(meta.width).toBe(512);
    expect(meta.height).toBeGreaterThan(meta.width);
  });

  it('ships a compact transparent mossling companion', async () => {
    const meta = await sharp(publicAsset('art/characters/mossling.webp')).metadata();
    expect(meta.hasAlpha).toBe(true);
    expect(meta.width).toBe(384);
    expect(meta.height).toBeGreaterThan(meta.width);
  });

  it.each(['dormant', 'awake'])('ships a normalized transparent ancient-oak %s state', async (state) => {
    const meta = await sharp(publicAsset(`art/characters/ancient-oak-${state}.webp`)).metadata();
    expect(meta.hasAlpha).toBe(true);
    expect(meta.width).toBe(768);
    expect(meta.height).toBe(768);
  });
});
