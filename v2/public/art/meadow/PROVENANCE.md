# Meadow raster provenance

These records cover the Level 1 midground and foreground additions made on
2026-07-26. The three earlier foundation textures retain their existing project
history and were not regenerated or altered.

## Shared production details

- Generator: Codex built-in OpenAI image generation.
- Third-party source assets: none supplied to the generator.
- Style reference: the approved Meadow visual contract and palette in
  `docs/MEADOW_VISUAL_SYSTEM.md`.
- License record: generated output; no third-party source license applies. Use
  and distribution remain subject to the project owner's OpenAI terms.
- Transparency: generated on a flat magenta chroma key, then processed with
  `remove_chroma_key.py` using border auto-key, soft matte and despill.
- Normalization: midground 1920×1080 PNG; foreground variants 768×512 PNG.

## `midground-treeline.png`

- Generated source ID: `exec-69f71a37-9f18-4118-8847-3a7a92f6a32c.png`.
- Final prompt:

```text
Use case: stylized-concept
Asset type: 2D side-scrolling children's game midground environment plate
Primary request: a continuous distant meadow tree-line for Level 1 of a gentle non-violent puzzle-platformer, designed to layer over an existing bright blue-sky and rolling-hills far background
Scene/backdrop: perfectly flat solid #ff00ff chroma-key background for local removal; the background must be one uniform color with no shadows, gradients, texture, reflections, floor plane, or lighting variation
Subject: a broad low tree line of softly painted deciduous meadow trees and hedgerows, sparse gaps and varied rounded crowns, subtle distant blue-green atmospheric perspective; no standalone focal tree
Style/medium: polished hand-painted 2D game environment art, warm storybook realism, matching soft painterly grass-and-cloud concept art; child-friendly, natural, not vector-flat
Composition/framing: 16:9 landscape plate; vegetation occupies only the lower 38% of the canvas; continuous edge-to-edge silhouette suitable for horizontal parallax; keep the upper 62% pure chroma key; no foreground plants
Lighting/mood: quiet warm morning light from the upper right, calm and welcoming
Color palette: distant blue #86aac0, sunlit meadow #b9c96b, softened grass shadow #385f32, restrained warm highlights
Constraints: no characters, creatures, UI, signs, gameplay props, platforms, water, text, logos, watermark, cast shadow, contact shadow, or reflection; crisp separated edge with generous pure-key area; do not use #ff00ff anywhere in the vegetation; essential silhouette must remain readable when displayed at 960x540
Avoid: photorealism, neon saturation, blur haze over the silhouette, giant focal objects, dark ominous forest
```

## `foreground-left.png`

- Generated source ID: `exec-946fab41-15b9-4283-90ad-6fc642771e94.png`.
- Final prompt:

```text
Use case: stylized-concept
Asset type: transparent 2D game foreground foliage cluster, left framing variant
Primary request: a lush meadow foreground cluster for the left edge of a gentle children's side-scrolling puzzle-platformer
Scene/backdrop: perfectly flat solid #ff00ff chroma-key background for local removal; one uniform color with no shadows, gradients, texture, reflections, floor plane, or lighting variation
Subject: layered broad meadow leaves, soft grasses, fern-like shapes and a few tiny cream and restoration-gold wildflowers; asymmetric silhouette that is fullest at lower left and gently tapers toward the right
Style/medium: polished hand-painted 2D game art, warm storybook realism, matching painterly meadow grass and tree-line assets; crisp readable silhouette at small size
Composition/framing: wide 3:2 isolated cluster anchored along the bottom edge, generous pure-key padding above and around the sides, no cut-off foliage except at the bottom anchor
Lighting/mood: warm quiet morning light from the upper right
Color palette: grass shadow #385f32, sunlit meadow #b9c96b, small restoration-gold #ffd76b accents; natural restrained saturation
Constraints: no characters, creatures, UI, signs, platforms, soil slab, water, text, logos, watermark, cast shadow, contact shadow, or reflection; no use of #ff00ff in the subject; clean separable edges; decorative only and not visually dominant
Avoid: giant flowers, neon colors, photorealism, blur, glow, dark jungle foliage
```

## `foreground-middle.png`

- Generated source ID: `exec-f330974e-c301-4c06-a624-dba6cece2f6e.png`.
- Final prompt:

```text
Use case: stylized-concept
Asset type: transparent 2D game foreground foliage cluster, middle low variant
Primary request: a low, wide meadow foreground foliage cluster for occasional placement near the lower middle of a gentle children's side-scrolling puzzle-platformer
Scene/backdrop: perfectly flat solid #ff00ff chroma-key background for local removal; one uniform color with no shadows, gradients, texture, reflections, floor plane, or lighting variation
Subject: layered rounded meadow leaves, short soft grasses, small fern-like fronds and a restrained scattering of tiny cream flowers; low horizontal silhouette with a subtle rounded rise at center and tapered ends
Style/medium: polished hand-painted 2D game art, warm storybook realism, matching painterly meadow grass and tree-line assets; crisp readable silhouette at small size
Composition/framing: wide 3:2 isolated cluster anchored along the bottom edge; foliage stays within the lower 48% of the canvas; generous pure-key padding above and at both sides; no cut-off foliage except at bottom anchor
Lighting/mood: warm quiet morning light from the upper right
Color palette: grass shadow #385f32, sunlit meadow #b9c96b, restrained cream and restoration-gold #ffd76b accents
Constraints: no characters, creatures, UI, signs, platforms, soil slab, water, text, logos, watermark, cast shadow, contact shadow, or reflection; no use of #ff00ff in the subject; clean separable edges; decorative only and deliberately low so gameplay silhouettes stay readable
Avoid: tall flower stalks, giant flowers, neon colors, photorealism, blur, glow, dark jungle foliage
```

## `foreground-right.png`

- Generated source ID: `exec-36ce1805-a0d8-44ce-b1c2-c02c30750f31.png`.
- Final prompt:

```text
Use case: stylized-concept
Asset type: transparent 2D game foreground foliage cluster, right framing variant
Primary request: a lush meadow foreground cluster for the right edge of a gentle children's side-scrolling puzzle-platformer
Scene/backdrop: perfectly flat solid #ff00ff chroma-key background for local removal; one uniform color with no shadows, gradients, texture, reflections, floor plane, or lighting variation
Subject: layered broad meadow leaves, soft grasses, fern-like shapes and a few tiny cream and restoration-gold wildflowers; asymmetric silhouette that is fullest at lower right and gently tapers toward the left
Style/medium: polished hand-painted 2D game art, warm storybook realism, matching painterly meadow grass and tree-line assets; crisp readable silhouette at small size
Composition/framing: wide 3:2 isolated cluster anchored along the bottom edge, generous pure-key padding above and around the sides, no cut-off foliage except at the bottom anchor
Lighting/mood: warm quiet morning light from the upper right
Color palette: grass shadow #385f32, sunlit meadow #b9c96b, small restoration-gold #ffd76b accents; natural restrained saturation
Constraints: no characters, creatures, UI, signs, platforms, soil slab, water, text, logos, watermark, cast shadow, contact shadow, or reflection; no use of #ff00ff in the subject; clean separable edges; decorative only and not visually dominant
Avoid: giant flowers, neon colors, photorealism, blur, glow, dark jungle foliage
```
