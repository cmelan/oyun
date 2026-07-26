# Meadow Visual System

This is the production contract for the first award-quality vertical slice.
It translates the concept art into reusable game assets instead of treating a
single illustration as a level background.

## Runtime contract

- Logical canvas: 960×540; authored backgrounds: 1920×1080.
- Existing collision rectangles remain authoritative.
- Raster art enhances the Meadow biome only; every raster draw has the existing
  procedural renderer as its fallback.
- Lighting is always warm morning light from the upper right.
- Gameplay silhouettes and collision tops must remain readable at 960×540.
- No essential information may depend on small decorative detail.

## Palette

| Role | Colour |
| --- | --- |
| Sky | `#8fdcca` |
| Distant blue | `#86aac0` |
| Sunlit meadow | `#b9c96b` |
| Grass shadow | `#385f32` |
| Soil mid | `#76502f` |
| Soil shadow | `#3f2e23` |
| Restoration gold | `#ffd76b` |
| Guardian purple | `#7a52c8` |

## Shipped assets

| File | Purpose | Repeat behaviour |
| --- | --- | --- |
| `v2/public/art/meadow/far-background.webp` | Fixed far plate | Cover 960×540 |
| `v2/public/art/meadow/soil-tile.webp` | Platform vertical faces | Repeat X/Y at 128px |
| `v2/public/art/meadow/grass-edge.png` | Collision-top dressing | Repeat X at 202px |

The soil tile was mirrored in both axes during processing so its seams are
deterministic. The grass strip was chroma-keyed, alpha-validated, cropped and
mirrored horizontally.

## Asset production rules

1. Use the approved Meadow concept only as a style reference.
2. Generate or paint one functional layer at a time.
3. Remove characters, UI and gameplay props from background plates.
4. Transparent sprites use a flat magenta source background and receive local
   matte/despill cleanup.
5. Normalize dimensions and compression before committing.
6. Record every source, prompt and license.
7. Verify at 960×540 and on an iPhone SE-sized landscape viewport.

## Next asset set

1. Midground tree-line plate with transparent sky.
2. Foreground foliage clusters: left, middle and right variants.
3. Ancient oak: sleeping, waking and restored states.
4. Guardian: idle, run, jump, land, heal and power sprite sheets.
5. Helper creature: confused, blind, healed and push animations.
6. Ice bridge, root bridge, pressure stone and restoration FX.

Do not generate all ten biomes before this slice is implemented and
child-tested.
