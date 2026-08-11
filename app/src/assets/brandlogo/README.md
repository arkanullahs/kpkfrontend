# Brand logos

The phone makers' own marks. Installed by a script, not by hand:

```
python scripts/brand_logos.py            # reads ../brand-logos-drop/
python scripts/brand_logos.py --src somewhere/else --dry
```

Drop the vendor SVGs (loose, or a zip of them) into `brand-logos-drop/` at the
repo root — that folder is gitignored and is not served, which matters: a
folder of other companies' brand assets sitting under `public/` is a public
download on bhalophone.com. The script names each file the way the catalogue
spells the brand, shrinks it (below), and writes it here. Anything it cannot
match to a brand it prints, so a wrong filename is never a silent no-op.

`BrandLogo` in `src/components/BrandLogo.tsx` owns the `import.meta.glob` that
picks these up, and every surface that names a brand uses it: the picker's
brand tiles and hide-chips, the results hero, each result row, the stretch
card and the detail hero. A missing file costs nothing — it is not requested
at all, and the picker tile falls back to the brand's colour with its mark on
it.

The lookup ignores case and punctuation, so the picker's `vivo`, the
catalogue's `Vivo` and the API's `OPPO` all resolve. Name the file after the
brand and it works.

## What the files need to be

- **The vendor's official asset**, from their brand/press page. Not a trace,
  not a re-colour, not a redraw. Each vendor's guidelines govern clear space
  and minimum size.
- **Their own colours.** They render on white plates and light cards, so a
  full-colour logo lands correctly and a mono one stays legible.
- Square mark or wordmark, either is fine. They are sized by height with free
  width (16–22px tall), so a 4:1 wordmark runs wide instead of being squashed
  into a square and rendered 4px tall.

## Weight

48 of the 50 files in the community pack were not vectors at all — a PNG
wrapped in an `<svg>`, exported from Figma, one of them 976×1199 and 783 KB,
to be drawn at 30px. `brand_logos.py` decodes every embedded raster, resizes
it to fit 192px (the 44px mark at 4× DPR), and re-encodes: 1.9 MB → 178 KB
across 26 brands. It leaves the `<image>` element's declared width/height
alone — that is its coordinate space, and the pattern transform above it is
derived from those numbers.

A real vector needs none of this and passes through untouched.

Rasters (png/jpg/webp) are accepted too — five brands publish no vector at
all. Those are resized and re-encoded as lossless WebP and land here as
`<Brand>.webp`; a real vector always beats a raster of the same brand.

## Coverage

All 36 brands in the catalogue, 2026-08-11. A new brand means one more line
in `BRANDS` in the script and one more file in the drop folder.
