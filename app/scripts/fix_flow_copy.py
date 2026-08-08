"""Patch the picker's flow copy in src/i18n.ts, UTF-8 safe.

Bangla must never go through the Edit tool -- it double-encoded mapper.py once
(2026-07-05) and the damage is invisible until a buyer sees it. Every Bangla
string is written here, by a script, in one encoding.

    python scripts/fix_flow_copy.py

Idempotent: each replacement is keyed on the whole `key: {...}` entry, so
running it twice is a no-op.
"""
import io
import re
import sys
from pathlib import Path

SRC = Path(__file__).resolve().parent.parent / "src" / "i18n.ts"

# key -> (en, bn). The add-more screen stopped being a one-pick screen inside a
# popup loop and became one multi-select screen, so its copy has to say so.
COPY = {
    "qc_q2": (
        "What else matters? Add as many as you like.",
        "\u0986\u09b0 \u0995\u09c0 \u0995\u09c0 \u099c\u09b0\u09c1\u09b0\u09bf? \u09af\u09a4 \u0996\u09c1\u09b6\u09bf \u09af\u09cb\u0997 \u0995\u09b0\u09c1\u09a8\u0964",
    ),
    "qc_q2_why": (
        "Tap them in the order they matter to you. Each one counts for less "
        "than the one above it -- the bars show exactly how much.",
        "\u09af\u09c7\u0987 \u0995\u09cd\u09b0\u09ae\u09c7 \u099c\u09b0\u09c1\u09b0\u09bf, \u09b8\u09c7\u0987 \u0995\u09cd\u09b0\u09ae\u09c7\u0987 \u099a\u09be\u09aa\u09c1\u09a8\u0964 \u09aa\u09cd\u09b0\u09a4\u09bf\u099f\u09be \u098f\u09b0 \u0989\u09aa\u09b0\u09c7\u09b0\u099f\u09be\u09b0 \u099a\u09c7\u09af\u09bc\u09c7 \u0995\u09ae \u0997\u09cb\u09a8\u09be \u09b9\u09af\u09bc -- \u09aa\u09be\u09b6\u09c7\u09b0 \u09ac\u09be\u09b0\u0997\u09c1\u09b2\u09cb\u09a4\u09c7 \u0995\u09a4\u099f\u09be \u09a6\u09c7\u0996\u09be \u09af\u09be\u099a\u09cd\u099b\u09c7\u0964",
    ),
    # the divert screen: it no longer bounces back to screen one, so the copy
    # must not promise a question that will not be asked again
    "s_rechannel_widen_sub": (
        "Far more phones at this price. The shop's warranty, usually 10 days.",
        "\u098f\u0987 \u09a6\u09be\u09ae\u09c7 \u0985\u09a8\u09c7\u0995 \u09ac\u09c7\u09b6\u09bf \u09ab\u09cb\u09a8\u0964 \u0993\u09af\u09bc\u09be\u09b0\u09c7\u09a8\u09cd\u099f\u09bf \u09a6\u09cb\u0995\u09be\u09a8\u09c7\u09b0, \u09b8\u09be\u09a7\u09be\u09b0\u09a3\u09a4 \u09e7\u09e6 \u09a6\u09bf\u09a8\u0964",
    ),
    "s_rechannel_keep_sub": (
        "Stay official. We'll take you back to the budget so you can raise it.",
        "\u0985\u09ab\u09bf\u09b6\u09bf\u09af\u09bc\u09be\u09b2\u0987 \u09a5\u09be\u0995\u09c1\u0995\u0964 \u09ac\u09be\u099c\u09c7\u099f\u09c7 \u09ab\u09bf\u09b0\u09bf\u09af\u09bc\u09c7 \u09a8\u09bf\u099a\u09cd\u099b\u09bf, \u09ac\u09be\u09a1\u09bc\u09be\u09a4\u09c7 \u09aa\u09be\u09b0\u09ac\u09c7\u09a8\u0964",
    ),
}


def main() -> int:
    text = SRC.read_text(encoding="utf-8")
    missed = []
    for key, (en, bn) in COPY.items():
        entry = '%s: { en: %s, bn: %s },' % (key, _q(en), _q(bn))
        # match `key: { ... },` across lines, non-greedy up to the closing brace
        pat = re.compile(r"^(\s*)%s:\s*\{.*?\},\s*$" % re.escape(key),
                         re.MULTILINE | re.DOTALL)
        if not pat.search(text):
            missed.append(key)
            continue
        text = pat.sub(lambda m: m.group(1) + entry, text, count=1)

    if missed:
        print("NOT FOUND (nothing written):", ", ".join(missed))
        return 1
    SRC.write_text(text, encoding="utf-8")
    print("patched %d keys in %s" % (len(COPY), SRC.name))
    return 0


def _q(s: str) -> str:
    return '"%s"' % s.replace('\\', '\\\\').replace('"', '\\"')


if __name__ == "__main__":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
    sys.exit(main())
