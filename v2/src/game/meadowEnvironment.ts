import type { BiomePalette } from '../core/biomes';
import type { Graphics } from './engine';

const MIDGROUND_PARALLAX = 0.28;
const FOREGROUND_PARALLAX = 1.08;

export interface MeadowForegroundImages {
  left: CanvasImageSource | null;
  middle: CanvasImageSource | null;
  right: CanvasImageSource | null;
}

/** Draws the Meadow tree line in screen space so it can move more slowly than
 * gameplay while the far plate stays fixed. The ellipse renderer keeps the
 * level readable when the image is missing or fails to decode. */
export function drawMeadowMidground(
  g: Graphics,
  image: CanvasImageSource | null,
  cameraX: number,
  palette: BiomePalette,
  viewportW: number,
  viewportH: number,
): void {
  const offset = -((cameraX * MIDGROUND_PARALLAX) % viewportW);

  if (image) {
    for (let x = offset - viewportW; x < viewportW; x += viewportW) {
      g.drawImage(image, x, 0, viewportW, viewportH);
    }
    return;
  }

  g.fillStyle(parseInt(palette.hillsMid.slice(1), 16), .72);
  for (let x = offset - 120; x < viewportW + 160; x += 150) {
    g.fillEllipse(x, viewportH - 62, 210, 112);
  }
  g.fillStyle(parseInt(palette.bushes.slice(1), 16), .78);
  for (let x = offset - 70; x < viewportW + 100; x += 96) {
    g.fillEllipse(x, viewportH - 34, 138, 72);
  }
}

/** Places sparse decorative clusters below collision tops. Positions are
 * derived only from visual parallax; they never enter the scene's solids list. */
export function drawMeadowForeground(
  g: Graphics,
  images: MeadowForegroundImages,
  cameraX: number,
  levelW: number,
  palette: BiomePalette,
  viewportW: number,
  viewportH: number,
): void {
  const variants: (keyof MeadowForegroundImages)[] = ['left', 'middle', 'right'];
  const stride = 690;

  for (let worldX = -35, i = 0; worldX < levelW; worldX += stride, i++) {
    const variant = variants[i % variants.length];
    const screenX = worldX - cameraX * FOREGROUND_PARALLAX;
    const isMiddle = variant === 'middle';
    const h = isMiddle ? 112 : 148;
    const w = Math.round(h * 1.5);
    if (screenX + w < -20 || screenX > viewportW + 20) continue;

    const image = images[variant];
    if (image) {
      g.drawImage(image, screenX, viewportH - h + 8, w, h, .88);
      continue;
    }

    g.fillStyle(parseInt(palette.bushes.slice(1), 16), .7);
    for (let x = 12; x < w - 8; x += 26) {
      const rise = Math.sin((x / w) * Math.PI) * (isMiddle ? 34 : 54);
      g.fillEllipse(screenX + x, viewportH - 12 - rise * .35, 42, 24 + rise);
    }
  }
}
