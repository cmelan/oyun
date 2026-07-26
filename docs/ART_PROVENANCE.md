# Production art provenance

The files in `docs/art-source/` are editable lossless sources. Runtime-ready,
compressed assets live under `public/art/`; the game never loads from this source
folder.

## Meadow entrance plate

- Runtime: `public/art/entrance/meadow-dawn.webp`
- Source: `docs/art-source/entrance-meadow-dawn.png`
- Generated with the shipped Meadow painting as the style reference.
- Prompt: “Stylized-concept game entrance background for the award-quality
  children's empathy puzzle platformer Çok Kalpli Koruyucu. Hand-painted
  gouache/digital storybook Meadow at early morning; a magnificent dormant,
  heart-marked ancient oak on the right; curved path and stream; quiet negative
  space on the left for live title and controls; 16:9; no characters, text, UI,
  logo, border, or watermark.”

## Guardian

- Runtime: `public/art/characters/guardian.webp`
- Sources: `docs/art-source/guardian-chroma.png` and
  `docs/art-source/guardian-transparent.png`
- Generated with the entrance plate as the style reference, keyed on a uniform
  green field, then converted to alpha and resized for runtime delivery.
- Prompt: “Stylized-concept side-view character asset matching the Meadow's
  painted storybook finish: a small plum-purple leaf-cloaked Guardian with five
  colored eyes, apricot scarf, seed satchel, tiny boots, and golden heart clasp;
  gentle and unarmed; readable at 48 px; centered on uniform chroma green; no
  ground, scenery, text, logo, watermark, or additional character.”

## Mossling companion

- Runtime: `public/art/characters/mossling.webp`
- Sources: `docs/art-source/mossling-chroma.png` and
  `docs/art-source/mossling-transparent.png`
- Generated with the Guardian as the style reference, converted from a uniform
  green key to alpha, trimmed, and resized for runtime delivery.
- Prompt: “One small dusty-rose woodland mossling in a side-view three-quarter
  pose; leaf ears, fern tail, moss tuft, wide worried eyes, cautious mouth, and
  dormant leaf markings; huggable, unarmed, emotionally readable at 40 px;
  uniform chroma green; no ground, scenery, props, text, logo, watermark, or
  additional creature.”

## App icon

- Runtime/store exports: `public/icons/icon-180.png`, `icon-192.png`,
  `icon-512.png`, and `icon-1024.png`
- Source: `docs/art-source/app-icon-master.png`
- Generated with the Guardian and entrance oak as strict references.
- Prompt: “Premium square mobile game icon readable at 64 px: close-up of the
  five-eyed leaf-hooded Guardian and heart clasp, backed by one warm glowing
  heart-shaped ancient oak; deep teal dawn background, painted foliage rim,
  disciplined storybook color, 12% mask-safe margin; no typography, border,
  watermark, extra characters, tiny clutter, or device mockup.”
