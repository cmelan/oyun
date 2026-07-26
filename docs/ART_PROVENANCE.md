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
