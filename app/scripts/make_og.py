"""Generate the 1200x630 Open Graph / link-preview image -> public/og-image.png.

Run directly (`python scripts/make_og.py`) or via `npm run og`. It's also invoked
by the `prebuild` guard (scripts/og-build.cjs) on a local `npm run build`; on
Vercel (no Python/Pillow) that guard skips and the committed PNG ships as-is.
Re-run after changing the logo, headline, or domain, then commit the new PNG.
"""
from PIL import Image, ImageDraw, ImageFont
import numpy as np
import os

W, H = 1200, 630
# resolve public/ relative to this script so it runs from any checkout
PUB = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public"))

# ---- diagonal two-stop gradient background (warm white -> soft cobalt) ----
c1 = np.array([243, 242, 239])   # #f3f2ef
c2 = np.array([214, 224, 247])   # #d6e0f7
yy, xx = np.mgrid[0:H, 0:W]
t = (xx / W * 0.55 + yy / H * 0.45)
t = np.clip(t, 0, 1)[..., None]
grad = (c1 * (1 - t) + c2 * t).astype(np.uint8)
img = Image.fromarray(grad, "RGB").convert("RGBA")

# ---- soft cobalt orb top-right ----
orb = Image.new("RGBA", (W, H), (0, 0, 0, 0))
od = ImageDraw.Draw(orb)
cx, cy, r = 1080, 70, 380
for i in range(r, 0, -4):
    a = int(34 * (1 - i / r))
    od.ellipse([cx - i, cy - i, cx + i, cy + i], fill=(37, 99, 217, a))
img = Image.alpha_composite(img, orb)

draw = ImageDraw.Draw(img)

_FONT_DIRS = ["C:/Windows/Fonts/", "/usr/share/fonts/truetype/dejavu/",
              "/Library/Fonts/", "/usr/share/fonts/"]
_FONT_ALIASES = {  # bold/semibold -> a sane non-Windows equivalent
    "segoeuib.ttf": "DejaVuSans-Bold.ttf", "seguisb.ttf": "DejaVuSans-Bold.ttf",
}

def font(name, size):
    for d in _FONT_DIRS:
        for cand in (name, _FONT_ALIASES.get(name, name)):
            try:
                return ImageFont.truetype(d + cand, size)
            except OSError:
                continue
    return ImageFont.load_default()

f_head = font("segoeuib.ttf", 66)
f_sub  = font("seguisb.ttf", 31)
f_dom  = font("segoeuib.ttf", 30)
f_tag  = font("seguisb.ttf", 26)

# ---- logo (icon + bangla wordmark) top-left ----
logo = Image.open(PUB + "/kfk-logo-on-light.png").convert("RGBA")
lw = 540
lh = int(logo.height * lw / logo.width)
logo = logo.resize((lw, lh), Image.LANCZOS)
img.alpha_composite(logo, (78, 72))

# ---- headline (wrapped) ----
head_lines = ["Find the best phone", "your budget can buy."]
y = 286
for ln in head_lines:
    draw.text((80, y), ln, font=f_head, fill=(23, 25, 29, 255))
    y += 78

# ---- subline ----
draw.text((82, y + 8), "Live Bangladesh prices, ranked by real reviews — not paid ads.",
          font=f_sub, fill=(92, 98, 106, 255))

# ---- domain pill (bottom-left) ----
dom = "thikphone.tech"
bb = draw.textbbox((0, 0), dom, font=f_dom)
dw, dh = bb[2] - bb[0], bb[3] - bb[1]
px, py = 80, 540
pad_x, pad_y = 22, 14
draw.rounded_rectangle([px, py, px + dw + pad_x * 2, py + dh + pad_y * 2 + 6],
                       radius=99, fill=(37, 99, 217, 255))
draw.text((px + pad_x, py + pad_y), dom, font=f_dom, fill=(255, 255, 255, 255))

# ---- corner tag (bottom-right) ----
tag = "\U0001F1E7\U0001F1E9  made for Bangladesh"
tag = "made for Bangladesh"
tb = draw.textbbox((0, 0), tag, font=f_tag)
draw.text((W - (tb[2] - tb[0]) - 80, 566), tag, font=f_tag, fill=(120, 126, 134, 255))

img.convert("RGB").save(PUB + "/og-image.png", "PNG")
print("wrote og-image.png", img.size)
