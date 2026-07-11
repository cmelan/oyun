# Tree Photo Licenses

Every image here is **CC0 / Public Domain** from Wikimedia Commons — safe for
commercial + App Store distribution. Fetched and optimized by `scripts/fetch-photos.mjs`.
Each row: game slot → Commons source file (license) → source page.

If you replace any of these with your own/licensed photos, keep the same filename
(`<tree>_<leaf|bark|tree>.webp`) and log it here.

## Bölüm 1 · Çayır Vadisi (leaf + bark + full tree per species)

| Slot | Commons file | License | Source |
|------|--------------|---------|--------|
| meşe · leaf | 20180703Quercus robur1.jpg | CC0 | https://commons.wikimedia.org/wiki/File:20180703Quercus_robur1.jpg |
| meşe · bark | 20140209Quercus robur5.jpg | CC0 | https://commons.wikimedia.org/wiki/File:20140209Quercus_robur5.jpg |
| meşe · tree | 20250806Quercus robur.jpg | CC0 | https://commons.wikimedia.org/wiki/File:20250806Quercus_robur.jpg |
| çınar · leaf | Morgenländische Platane Blatt.jpg | CC0 | https://commons.wikimedia.org/wiki/File:Morgenl%C3%A4ndische_Platane_Blatt.jpg |
| çınar · bark | Morgenländische Platane Rinde.jpg | CC0 | https://commons.wikimedia.org/wiki/File:Morgenl%C3%A4ndische_Platane_Rinde.jpg |
| çınar · tree | Platanus orientalis Meise Nationale Plantentuin.jpg | CC0 | https://commons.wikimedia.org/wiki/File:Platanus_orientalis_Meise_Nationale_Plantentuin.jpg |
| ıhlamur · leaf | 20130502Tilia cordata2.jpg | CC0 | https://commons.wikimedia.org/wiki/File:20130502Tilia_cordata2.jpg |
| ıhlamur · bark | 20160114Tilia cordata1.jpg | CC0 | https://commons.wikimedia.org/wiki/File:20160114Tilia_cordata1.jpg |
| ıhlamur · tree | Baumkirchen, Linde am Kreuzbühel.jpg | CC0 | https://commons.wikimedia.org/wiki/File:Baumkirchen,_Linde_am_Kreuzb%C3%BChel.jpg |

## Remaining species (B2–B10)
Not yet sourced. Same process: `scripts/fetch-photos.mjs` reads `scripts/photo-manifest.json`
— add entries there, rerun. Until a species has all three photos, the game uses its
botanical vector art (automatic fallback in `src/game/art.ts`).
