/* Small, failure-safe raster asset registry.
   Public URLs keep the files directly usable by Vite and Capacitor. Tests run
   without a browser Image constructor, so loading becomes a harmless no-op. */

export type ArtKey =
  | 'meadow.far'
  | 'meadow.midground'
  | 'meadow.foreground.left'
  | 'meadow.foreground.middle'
  | 'meadow.foreground.right'
  | 'meadow.soil'
  | 'meadow.grass';

const SOURCES: Record<ArtKey, string> = {
  'meadow.far': 'art/meadow/far-background.webp',
  'meadow.midground': 'art/meadow/midground-treeline.png',
  'meadow.foreground.left': 'art/meadow/foreground-left.png',
  'meadow.foreground.middle': 'art/meadow/foreground-middle.png',
  'meadow.foreground.right': 'art/meadow/foreground-right.png',
  'meadow.soil': 'art/meadow/soil-tile.webp',
  'meadow.grass': 'art/meadow/grass-edge.png',
};

const images = new Map<ArtKey, HTMLImageElement>();
let preloadPromise: Promise<void> | null = null;

function publicUrl(path: string): string {
  /* Vite's configured base is './', which is also the correct base inside the
     Capacitor web bundle. Keeping this literal avoids requiring vite/client
     ambient types in the framework-free core project. */
  return `./${path}`;
}

export function preloadArt(): Promise<void> {
  if (preloadPromise) return preloadPromise;
  if (typeof Image === 'undefined') return Promise.resolve();

  preloadPromise = Promise.all(
    (Object.entries(SOURCES) as [ArtKey, string][]).map(([key, src]) =>
      new Promise<void>((resolve) => {
        const image = new Image();
        image.decoding = 'async';
        image.onload = () => { images.set(key, image); resolve(); };
        image.onerror = () => resolve(); // vector fallback remains available
        image.src = publicUrl(src);
      }),
    ),
  ).then(() => undefined);

  return preloadPromise;
}

export function art(key: ArtKey): HTMLImageElement | null {
  const image = images.get(key);
  return image?.complete && image.naturalWidth > 0 ? image : null;
}
