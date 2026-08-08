# Brand logos

Drop the vendors' own SVG files here, named exactly as the brand is spelled in
`src/steps.ts`:

    Samsung.svg
    Xiaomi.svg
    vivo.svg
    OnePlus.svg
    realme.svg
    Apple.svg

`BrandMark` in `src/components/StepBody.tsx` loads `/brandlogo/<name>.svg` and
swaps it in with no code change. If a file is missing the request 404s and the
tile falls back to the brand's colour with its mark on it — so a partial set is
fine, and adding one file at a time works.

What the files need to be:

- **SVG**, drawn to fit a square. They render at 30×30 inside a 44px white
  tile, `object-fit: contain`, so a wide wordmark will letterbox rather than
  crop — a square mark reads better at this size than a lockup.
- **Their own colours.** The tile behind them is white, not the brand colour,
  so a full-colour logo lands correctly and a mono one stays legible.
- **The vendor's official asset**, from their brand/press page. Not a trace,
  not a re-colour, not a redraw. Each vendor's brand guidelines govern clear
  space and minimum size; the tile gives 7px of padding on every side.

The brand name is printed directly below every tile, so nothing on the screen
depends on the logo being recognised.
