"""Render every picker tile icon to one HTML sheet, straight from steps.ts.

    python scripts/icon_sheet.py [out.html]

Parses the ICON literal rather than duplicating it, so the sheet cannot drift
from what the app draws. Shows each glyph at its real 28px on both tile states
(paper and the teal "selected"), plus a 4x blow-up where a malformed path is
obvious -- which is how the stray stroke under the tick and the smudged stick
figure got through review on 2026-08-08.
"""
import io
import re
import sys
from pathlib import Path

SRC = Path(__file__).resolve().parent.parent / "src" / "steps.ts"
OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("icon-sheet.html")

TEAL, INK, PAPER, RULE = "#0f5c52", "#12211f", "#f4f7f6", "#dfe6e4"


def icons():
    text = SRC.read_text(encoding="utf-8")
    block = re.search(r"const ICON = \{(.*?)\n\};", text, re.S)
    if not block:
        raise SystemExit("ICON literal not found in steps.ts")
    return re.findall(r'^\s*(\w+):\s*"([^"]+)",', block.group(1), re.M)


def glyph(d, stroke, size=28):
    return (f'<svg width="{size}" height="{size}" viewBox="0 0 24 24" fill="none">'
            f'<path d="{d}" stroke="{stroke}" stroke-width="1.9" '
            f'stroke-linecap="round" stroke-linejoin="round"/></svg>')


def main():
    rows = []
    for name, d in icons():
        rows.append(f"""
        <figure>
          <div class="row">
            <span class="tile paper">{glyph(d, INK)}</span>
            <span class="tile teal">{glyph(d, "#ffffff")}</span>
            <span class="tile paper big">{glyph(d, INK, 112)}</span>
          </div>
          <figcaption>{name}</figcaption>
        </figure>""")

    html = f"""<!doctype html><meta charset="utf-8">
<title>picker icons</title>
<style>
  body {{ margin:0; padding:32px; background:{PAPER}; color:{INK};
         font:15px/1.5 system-ui,-apple-system,Segoe UI,sans-serif; }}
  h1 {{ font-size:20px; margin:0 0 4px; }}
  p.note {{ margin:0 0 26px; color:#5b6b68; font-size:13.5px; }}
  .grid {{ display:grid; grid-template-columns:repeat(auto-fill,minmax(230px,1fr)); gap:18px; }}
  figure {{ margin:0; background:#fff; border:1px solid {RULE}; border-radius:12px; padding:14px; }}
  .row {{ display:flex; align-items:center; gap:12px; }}
  .tile {{ display:flex; align-items:center; justify-content:center;
           width:52px; height:52px; border-radius:10px; flex:none; }}
  .paper {{ background:{PAPER}; border:1px solid {RULE}; }}
  .teal  {{ background:{TEAL}; }}
  .big {{ width:128px; height:128px; margin-left:auto; }}
  figcaption {{ margin-top:11px; font:600 13px ui-monospace,SFMono-Regular,Menlo,monospace;
                color:#3c4b48; }}
</style>
<h1>Picker tile icons</h1>
<p class="note">Straight from <code>src/steps.ts</code>. Left: on a paper tile.
Middle: on the teal selected tile. Right: 4&times; — a broken path shows here first.
Drop <code>src/assets/icon/&lt;option-id&gt;.svg</code> to replace any of these.</p>
<div class="grid">{''.join(rows)}</div>
"""
    OUT.write_text(html, encoding="utf-8")
    print("wrote %s (%d icons)" % (OUT, len(icons())))


if __name__ == "__main__":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
    main()
