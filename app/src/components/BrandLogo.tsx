import { useState } from "react";
import { st } from "../theme";

/* The phone maker's own mark, bundled -- never fetched by path.

   Same reason the option icons are bundled (see StepBody): a `/brandlogo/x.svg`
   under public/ costs one request per brand shown, and a 404 for every brand
   we have not been given a file for. A glob knows at build time, so a brand
   with no logo renders nothing at all -- no request, no console noise. */
const FILES = import.meta.glob("../assets/brandlogo/*.{svg,webp}", {
  eager: true, query: "?url", import: "default" }) as Record<string, string>;

/* One brand, four spellings: the picker says `vivo`, the catalogue says
   `Vivo`, the API says `OPPO` and the file the vendor shipped was called
   `Oneplus.svg`. Key on letters and digits alone so the file can be named
   however the catalogue spells it and every caller still finds it. */
const key = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");

/* .svg for a real vector, .webp for the brands whose only published mark is a
   raster -- `key` drops the dot and the extension along with everything else
   that is not a letter or a digit, so the filename carries the format and
   nothing else has to care. */
const BY_BRAND: Record<string, string> = {};
for (const path in FILES) {
  BY_BRAND[key(path.slice(path.lastIndexOf("/") + 1).replace(/\.\w+$/, ""))] = FILES[path];
}

export function brandLogo(brand: string): string | null {
  return BY_BRAND[key(brand || "")] || null;
}

/* A max box, not a fixed one: `h` is the tallest it may draw and `max` the
   widest, and the mark takes whichever of the two binds first.

   Fixing the height instead looks right and is not. Most of these marks are
   wordmarks -- Samsung is 5.5:1, Nothing 5.6:1, Redmi 4:1 -- so a 5.5:1 mark
   asked to be 28px tall wants 153px of width, gets clamped to the tile's 54,
   and then `contain` letterboxes it back down to 10px of ink inside a 28px
   box. Same too-small result as before, with the space still spent. Letting
   both axes be maxima gives every mark the largest size that fits, with no
   dead band.

   `named` is for the places where the mark REPLACES the brand's name rather
   than sitting next to it -- the logo already reads "REDMI", and printing
   "Redmi" beside it says the same thing twice (owner 2026-08-11). The name
   moves into the alt text there, so nothing is lost to a screen reader. On
   the picker tiles the name is still printed under the tile, so the image
   stays decorative and silent. */
/* EQUAL INK, not equal boxes.

   A max box gives every mark the largest size that fits, which sounds fair and
   is not: what fits depends entirely on the shape. Measured on the results
   hero at h=28/max=150, Samsung's 5.47:1 wordmark drew 150x27 = 4,109px of
   ink and Apple's near-square glyph drew about 23x28 = 644. Six times the
   presence for one maker over another, decided by nothing but aspect ratio
   (owner 2026-08-30: "brand image sizing issue, specially apple. improper
   sizes for all").

   So the constant is AREA. For a mark of aspect r, height = sqrt(A/r) makes
   r * height^2 -- the drawn area -- the same for every brand. A is (1.5h)^2,
   which puts a square glyph at 1.5x the old height and a long wordmark at
   about two thirds of it, and the clamps stop either extreme from running
   away.

   The aspect is only knowable once the file has loaded, so it is measured
   there. Until then the mark draws in the old max box, which is the right
   fallback: it is what every one of these looked like yesterday. */
const AREA_K = 1.5;      // a square mark draws this many times `h` tall
const MIN_K = 0.55;      // a very wide wordmark still has to be readable
const MAX_K = 1.6;       // a very tall glyph must not tower over its row

export function BrandLogo({ brand, h = 16, max = "72px", named = false }: {
  brand: string; h?: number; max?: string; named?: boolean;
}) {
  const url = brandLogo(brand);
  const [aspect, setAspect] = useState(0);
  if (!url) return null;
  const drawn = aspect
    ? Math.min(Math.max(Math.sqrt((AREA_K * h) ** 2 / aspect), h * MIN_K), h * MAX_K)
    : h;
  /* NOT loading="lazy". Width is auto here, and an <img> that has not loaded
     has no intrinsic width, so its box is 0 wide -- which the lazy loader
     reads as zero-area and never off-screen, so it never fetches, so the
     width stays 0. Every brand mark rendered as nothing. They are ~5 KB and
     already on the screen the buyer is looking at; there was nothing to
     defer. */
  return (
    <img src={url} alt={named ? brand : ""} aria-hidden={named ? undefined : "true"}
      onLoad={(e) => {
        const i = e.currentTarget;
        if (i.naturalWidth && i.naturalHeight) setAspect(i.naturalWidth / i.naturalHeight);
      }}
      style={st(`width:auto; height:auto; max-width:${max}; max-height:${drawn.toFixed(1)}px; display:block; flex-shrink:0;`)} />
  );
}
