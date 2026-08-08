# Option icons — drop-in SVGs

Each picker option tile shows an icon. By default it renders a hand-drawn
placeholder path baked into the app (`ICON` in `src/steps.ts`). Drop a file
here named after the option **id** and the tile uses it instead, with no code
change — the same mechanism `public/brandlogo/` uses for brand marks.

## File name = option id

`public/icon/<option-id>.svg`. The ids, by screen:

| screen | option ids |
|---|---|
| need1 / needN | `camera` `battery` `speed` `simple` `gaming` `video` |
| channel | `official` (the unofficial side is the skip tile) |
| elderly | `eld_yes` `eld_no` |
| rechannel | `widen` `keep` |
| plat_e | `android` `ios` |
| rom (software) | `global` `cnrom` |
| sizes | `snapdragon` `mediatek` `ram6` `ram8` `ram12` `rom128` `rom256` `rom512` |
| extras | `jack` `ir` `fm` `lineage` |

(Brand tiles are not here — they load from `public/brandlogo/<Brand>.svg`.)

## Requirements

- **viewBox `0 0 24 24`**, square. The tile renders it at 28×28.
- Keep visual weight near the placeholders: ~1.9 stroke if line-art.
- **Colour is yours.** An owner SVG renders as-is — this is where the picker's
  friendly, colourful look comes from. A coloured icon does not recolour on the
  teal "selected" state (the placeholder does; a supplied file keeps its own
  colours), so pick colours that read on both white and teal tiles.
- Inline everything (no external refs); keep each file small.

Until a file exists for an id, the placeholder shows — no blank, no flash.
