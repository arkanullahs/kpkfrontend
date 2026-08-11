"""Install phone-brand logos into src/assets/brandlogo/, right-sized.

    python scripts/brand_logos.py [--src DIR_OR_ZIP ...] [--dry]

The owner drops vendor logos (loose .svg files, or a .zip of them) into a
staging folder; this puts them where the app reads them, named the way the
catalogue spells each brand.

Two things it fixes on the way in:

1. **Naming.** `Oneplus.svg`, `Google Pixel.svg` and `Xiaomi_Redmi_Logo.svg`
   are the same brands the catalogue calls OnePlus, Google and Redmi. The app
   looks logos up case-insensitively, but it cannot guess that "Google Pixel"
   is Google, so the mapping is explicit here and the file lands under the
   catalogue's own spelling.

2. **Weight.** 48 of the 50 files in the community pack are not vectors at
   all -- they are a PNG wrapped in an <svg>, exported from Figma, some at
   976x1199 and 783 KB. These render at 30px in a picker tile and 44px on a
   brand hub. Every embedded raster is decoded, resized to fit MAX_PX, and
   re-encoded, which is a ~90% cut on a market where most buyers are on
   mobile data. The <image> element keeps its declared width/height -- that is
   its coordinate space, and the pattern transform above it is derived from
   those numbers, so changing them would move the artwork.

A file that matches no brand is reported, never silently dropped: the fix is
almost always to rename it to the brand as the catalogue spells it.
"""
import argparse
import base64
import io
import re
import sys
import zipfile
from pathlib import Path

from PIL import Image

APP = Path(__file__).resolve().parent.parent
OUT = APP / "src" / "assets" / "brandlogo"
DROP = APP.parent / "brand-logos-drop"          # gitignored staging folder

# Longest side of any embedded raster after resizing. The biggest a brand logo
# is ever drawn is the 44px hub mark; 192 covers that at 4x DPR with room over.
MAX_PX = 192

# Every brand in the catalogue (kpk.db `phones`, 2026-08-10), spelled as the
# catalogue spells it -- that spelling becomes the filename. The app's lookup
# is case- and separator-insensitive, so `vivo` in the picker still finds
# Vivo.svg; this list only has to be right about which brands EXIST.
BRANDS = [
    "Apple", "Asus", "Benco", "CMF", "Energizer", "Google", "Helio", "HMD",
    "Honor", "HTC", "Huawei", "Infinix", "iQOO", "itel", "Lava", "Lenovo",
    "Meizu", "Motorola", "Nokia", "Nothing", "Nubia", "OnePlus", "OPPO",
    "POCO", "Realme", "RedMagic", "Redmi", "Samsung", "Sony", "Symphony",
    "TCL", "Tecno", "Vivo", "Walton", "Xiaomi", "ZTE",
]

# Source filename (normalised) -> brand, for the names no rule can derive.
# Vendors file their marks under a parent company (HMD Global, CMF by
# Nothing), a sub-brand (Xiaomi Redmi), a product line (Google Pixel) or a
# stock-art site's slug -- none of which a rule can turn into the catalogue's
# name without guessing wrong. Two brands in one filename is exactly the case
# where guessing is dangerous: `Xiaomi_Redmi_Logo` is Redmi, `CMF_by_Nothing`
# is CMF, and the token order that picks one picks the other wrong.
ALIAS = {
    "googlepixel": "Google",       # the pack ships Pixel's mark, not Google's
    "xiaomiredmilogo": "Redmi",    # Redmi's wordmark, filed under its parent
    "redmilogo": "Redmi",
    "mi": "Xiaomi",
    "cmfbynothinglogo": "CMF",
    "hmdgloballogo2024": "HMD",
    "logoofsymphonymobile": "Symphony",
    "waltongroupsvg": "Walton",
    "redmagiclogopngseeklogo681700": "RedMagic",
}

# Dropped in the pack but not sold here. Skipped rather than installed: every
# file in src/assets/ is emitted into the build whether or not a tile uses it.
# If one of these brands enters the catalogue, add it to BRANDS and re-run.
NOISE = re.compile(r"[^a-z0-9]+")


def norm(s):
    return NOISE.sub("", s.lower())


BY_NORM = {norm(b): b for b in BRANDS}


def brand_of(stem):
    """Which catalogue brand a dropped filename is, or None."""
    n = norm(stem)
    if n in ALIAS:
        return ALIAS[n]
    if n in BY_NORM:
        return BY_NORM[n]
    # `Honor-1`, `Samsung_logo`, `oppo (1)` -- trailing junk after the name
    for b_norm, brand in BY_NORM.items():
        if n.startswith(b_norm) and len(n) - len(b_norm) <= 6:
            return brand
    return None


DATA_URI = re.compile(r"data:image/(?:png|jpe?g|webp);base64,([A-Za-z0-9+/=]+)")


def embedded(svg):
    """The largest raster embedded in an SVG, or None if it is a real vector.

    The community pack's files are not vectors: each is one PNG in an <svg>
    wrapper. Nothing is gained by keeping the wrapper -- it cannot scale, and
    it carries the export's margins -- so a wrapper is unwrapped and treated
    as the raster it is. Zero data URIs means a genuine vector, left alone.
    """
    best = None
    for m in DATA_URI.finditer(svg):
        try:
            raw = base64.b64decode(m.group(1))
        except Exception:
            continue
        if best is None or len(raw) > len(best):
            best = raw
    return best


def flatten(data):
    """A raster logo (png/jpg/webp) -> a small, tightly cropped WebP.

    Vendors publish what they publish: five of the brands the owner filled the
    gaps with came as PNG, one as JPEG, one as WebP. Lossless because these
    are flat-colour marks -- lossy WebP rings around hard edges at this size
    and is not smaller for artwork with three colours in it.

    Cropping is the point, not a nicety. Every one of these arrives centred in
    a big square canvas: the pack's Samsung fills 13% of its own height, so a
    28px-tall tile drew a 4px wordmark, which is what the owner saw and called
    too small. The mark is cropped to its own edges here, once, so nothing
    downstream has to guess how much of the file is padding.
    """
    im = Image.open(io.BytesIO(data))
    im.load()
    if im.mode != "RGBA":
        im = im.convert("RGBA")
    box = im.getbbox()                    # transparent margins
    if box is None:                       # a JPEG has none -- find the matte
        box = None
    elif box != (0, 0) + im.size:
        im = im.crop(box)
    if im.getchannel("A").getextrema()[0] == 255:
        im = _dematte(im)
    if max(im.size) > MAX_PX:
        im.thumbnail((MAX_PX, MAX_PX), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, "WEBP", lossless=True, method=6)
    return buf.getvalue()


def _dematte(im):
    """Crop a fully opaque image (a JPEG) to its non-background rectangle.

    Same padding problem, no alpha to find it by: the background is whatever
    colour the corners are. Anything more than a hair off that colour is the
    logo. If that finds nothing -- a photo, a gradient -- the image is left
    exactly as it came.
    """
    px = im.load()
    w, h = im.size
    bg = px[0, 0][:3]
    if not all(abs(a - b) < 16 for c in ((w - 1, 0), (0, h - 1), (w - 1, h - 1))
               for a, b in zip(px[c][:3], bg)):
        return im                          # corners disagree: not a flat matte
    mask = Image.new("L", im.size, 0)
    mp = mask.load()
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y][:3]
            if abs(r - bg[0]) + abs(g - bg[1]) + abs(b - bg[2]) > 30:
                mp[x, y] = 255
    box = mask.getbbox()
    return im.crop(box) if box else im


NUM = re.compile(r"-?\d+(?:\.\d+)?(?:e-?\d+)?")
VIEWBOX = re.compile(r'viewBox="\s*([-\d.]+)[ ,]+([-\d.]+)[ ,]+([-\d.]+)[ ,]+([-\d.]+)\s*"')
CMD = re.compile(r"([A-Za-z])([^A-Za-z]*)")


def path_points(d):
    """(xs, ys) for one absolute path's `d`, or None if it cannot be read.

    Pairing the numbers off blindly is wrong, and wrong in the direction that
    matters: `V132.597H33.2307` is one y then one x, and reading them as x,y
    put Samsung's whole width into its height range -- the crop then measured
    a square and cropped nothing. Relative commands are refused outright
    rather than guessed at; a logo left uncropped is a smaller mistake than a
    logo cropped through the middle.
    """
    xs, ys = [], []
    for cmd, args in CMD.findall(d):
        n = [float(v) for v in NUM.findall(args)]
        if cmd in "Zz":
            continue
        if cmd.islower():
            return None                     # relative: deltas, not positions
        if cmd == "H":
            xs += n
        elif cmd == "V":
            ys += n
        elif cmd == "A":
            # rx ry rot large-arc sweep x y -- only the last pair is a point
            for i in range(0, len(n) - 6, 7):
                xs.append(n[i + 5])
                ys.append(n[i + 6])
        else:                               # M L C S Q T: plain coordinate pairs
            xs += n[0::2]
            ys += n[1::2]
    return xs, ys


def tighten(svg):
    """Shrink a real vector's viewBox onto the drawing inside it.

    Same padding problem as the rasters, and no way to measure it exactly
    without a renderer -- so this measures a SUPERSET: every number in every
    path, which includes Bezier control points that bow outside the visible
    edge, and misreads relative commands as if they were absolute. A superset
    can only crop less than it should. It can never clip the mark, which is
    the property worth having when the alternative is a wrong guess shipped to
    every buyer.

    Bails on anything it cannot reason about: transforms, no viewBox, a box
    that came out bigger than it started, or a crop too small to be real.
    """
    m = VIEWBOX.search(svg)
    if not m:
        return svg
    # <defs> is not drawing -- and it is exactly where the full-canvas clip
    # rect lives on a Figma export, which reads as "the mark fills the page"
    # and cancels every crop. Measure the body only.
    body = re.sub(r"<defs>.*?</defs>", "", svg, flags=re.S)
    if "transform=" in body:
        return svg
    vx, vy, vw, vh = (float(g) for g in m.groups())
    xs, ys = [], []
    for d in re.findall(r'\sd="([^"]+)"', body):
        pts = path_points(d)
        if pts is None:
            return svg
        xs += pts[0]
        ys += pts[1]
    for tag, ax, ay, aw, ah in [("rect", "x", "y", "width", "height")]:
        for el in re.findall(r"<%s\s[^>]*>" % tag, body):
            g = {k: float(v) for k, v in
                 re.findall(r'(\w+)="([-\d.]+)"', el)
                 if k in (ax, ay, aw, ah)}
            if aw in g and ah in g:
                xs += [g.get(ax, 0), g.get(ax, 0) + g[aw]]
                ys += [g.get(ay, 0), g.get(ay, 0) + g[ah]]
    if not xs or not ys:
        return svg
    x0, x1 = max(vx, min(xs)), min(vx + vw, max(xs))
    y0, y1 = max(vy, min(ys)), min(vy + vh, max(ys))
    w, h = x1 - x0, y1 - y0
    if w <= 0 or h <= 0 or (w > vw * 0.9 and h > vh * 0.9):
        return svg                          # nothing worth cropping
    pad = max(w, h) * 0.02
    x0, y0 = x0 - pad, y0 - pad
    w, h = w + 2 * pad, h + 2 * pad
    box = "%g %g %g %g" % (x0, y0, w, h)
    svg = VIEWBOX.sub('viewBox="%s"' % box, svg, count=1)
    # width/height are the intrinsic size the browser lays the <img> out by,
    # and the app sizes these by height with a free width -- leave them saying
    # 256x256 and every cropped wordmark is laid out as a square again
    svg = re.sub(r'^(<svg[^>]*?)\swidth="[^"]*"', r"\1", svg, count=1)
    svg = re.sub(r'^(<svg[^>]*?)\sheight="[^"]*"', r"\1", svg, count=1)
    svg = svg.replace("<svg ", '<svg width="%g" height="%g" ' % (w, h), 1)
    return svg


RASTER = {".png", ".jpg", ".jpeg", ".webp"}
LOGO_EXT = RASTER | {".svg"}


def sources(args):
    """(stem, suffix, bytes) for every logo file in the given files/dirs/zips."""
    for s in args:
        p = Path(s)
        if p.is_dir():
            for f in sorted(p.iterdir()):
                if not f.is_file():
                    continue
                if f.suffix.lower() in LOGO_EXT:
                    yield f.stem, f.suffix.lower(), f.read_bytes()
                elif f.suffix.lower() == ".zip":
                    yield from _zip(f)
        elif p.suffix.lower() == ".zip":
            yield from _zip(p)
        elif p.suffix.lower() in LOGO_EXT:
            yield p.stem, p.suffix.lower(), p.read_bytes()


def _zip(path):
    with zipfile.ZipFile(path) as z:
        for name in sorted(z.namelist()):
            ext = Path(name).suffix.lower()
            if ext in LOGO_EXT:
                yield Path(name).stem, ext, z.read(name)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", nargs="*", default=[str(DROP)])
    ap.add_argument("--dry", action="store_true")
    a = ap.parse_args()

    OUT.mkdir(parents=True, exist_ok=True)
    seen, unmatched = {}, []
    for stem, ext, data in sources(a.src):
        brand = brand_of(stem)
        if not brand:
            unmatched.append(stem)
            continue
        try:
            if ext == ".svg":
                svg = data.decode("utf-8", errors="replace")
                raw = embedded(svg)
                if raw is None:
                    out = tighten(svg).encode("utf-8")
                else:
                    out, ext = flatten(raw), ".webp"
            else:
                out, ext = flatten(data), ".webp"
        except Exception as e:
            print("%-10s SKIPPED (%s: %s)" % (brand, stem, e))
            continue
        # two files claiming one brand (Honor.svg + Honor-1.svg, or a vendor
        # SVG next to somebody's PNG trace of it): a real vector always wins,
        # otherwise keep whichever is smaller -- same mark either way
        if brand in seen:
            had_ext, had = seen[brand][1], seen[brand][2]
            if had_ext == ".svg" and ext != ".svg":
                continue
            if had_ext == ext and len(had) <= len(out):
                continue
        seen[brand] = (stem, ext, out, len(data))

    # a brand can only have one file; a leftover .svg next to a new .webp
    # would make the glob's winner depend on iteration order
    for brand, (stem, ext, out, was) in sorted(seen.items()):
        for old in OUT.glob(brand + ".*"):
            if old.suffix != ext and not a.dry:
                old.unlink()
        note = "" if norm(stem) == norm(brand) else f"  (from {stem})"
        print("%-10s %7d -> %6d B  %-5s%s" % (brand, was, len(out), ext, note))
        if not a.dry:
            (OUT / (brand + ext)).write_bytes(out)

    have = sorted(seen)
    missing = [b for b in BRANDS if b not in seen]
    print("\ninstalled %d/%d brands" % (len(have), len(BRANDS)))
    if missing:
        print("no logo yet: " + ", ".join(missing))
    if unmatched:
        print("matched no brand (rename to the brand's own name): "
              + ", ".join(sorted(unmatched)))
    return 0


if __name__ == "__main__":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
    sys.exit(main())
