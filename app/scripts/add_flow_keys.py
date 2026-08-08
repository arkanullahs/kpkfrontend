# -*- coding: utf-8 -*-
"""Insert the flow-graph screens' i18n keys into src/i18n.ts with correct UTF-8.

The Edit tool has double-encoded Bangla in this repo before, so Bangla-bearing
strings are patched with a script that writes UTF-8 directly. Bangla drafted;
the file's own convention ("owner: verify every bn string") applies here too.

Idempotent: bails if the anchor already carries the block.
"""
import io
import sys

PATH = "src/i18n.ts"
ANCHOR = "  s_skip_memory:"  # insert the block right after this line

BLOCK = """
  // ---- flow-graph screens (spec 2026-08-08). elderly fork, rechannel divert,
  // china-vs-global software, custom-rom support. owner: verify every bn string.
  s_elderly_t: { en: "Is this phone for an elderly person?", bn: "এই ফোনটি কি কোনো বয়স্ক মানুষের জন্য?" },
  s_elderly_why: { en: "We'll keep it simple — clear text, real service, no confusing extras.", bn: "আমরা সহজ রাখব — বড় পরিষ্কার লেখা, আসল সার্ভিস, কোনো ঝামেলা নয়।" },
  s_elderly_yes: { en: "Yes, for an elder", bn: "হ্যাঁ, বয়স্কদের জন্য" },
  s_elderly_yes_sub: { en: "We'll pick an easy, reliable phone", bn: "আমরা সহজ, নির্ভরযোগ্য ফোন বাছব" },
  s_elderly_no: { en: "No, general use", bn: "না, সাধারণ ব্যবহারে" },
  s_elderly_no_sub: { en: "A few quick questions instead", bn: "বদলে কয়েকটা দ্রুত প্রশ্ন" },

  s_rechannel_t: { en: "Very few official phones at this budget", bn: "এই বাজেটে অফিশিয়াল ফোন খুব কম" },
  s_rechannel_why: { en: "Unofficial sets cost less and there are far more of them. Include them?", bn: "আনঅফিশিয়াল সেট সস্তা আর অনেক বেশি। যোগ করব?" },
  s_rechannel_widen: { en: "Yes, include unofficial", bn: "হ্যাঁ, আনঅফিশিয়াল যোগ করুন" },
  s_rechannel_widen_sub: { en: "Many more phones to choose from", bn: "বাছার জন্য অনেক বেশি ফোন" },
  s_rechannel_keep: { en: "No, official only", bn: "না, শুধু অফিশিয়াল" },
  s_rechannel_keep_sub: { en: "Warranty support matters more", bn: "ওয়ারেন্টি সার্ভিস বেশি জরুরি" },

  s_soft_t: { en: "Global software, or is a China ROM fine?", bn: "গ্লোবাল সফটওয়্যার, না চায়না রম চলবে?" },
  s_soft_why: { en: "China-ROM phones cost less but need a software flash for Google apps and English.", bn: "চায়না-রম ফোন সস্তা, কিন্তু গুগল অ্যাপ আর ইংরেজির জন্য সফটওয়্যার ফ্ল্যাশ লাগে।" },
  s_soft_global: { en: "Global software only", bn: "শুধু গ্লোবাল সফটওয়্যার" },
  s_soft_global_sub: { en: "Works out of the box", bn: "খুলেই ব্যবহার করা যায়" },
  s_soft_cn: { en: "A China ROM is fine", bn: "চায়না রম চলবে" },
  s_soft_cn_sub: { en: "Cheaper, if you'll flash it", bn: "সস্তা, যদি ফ্ল্যাশ করেন" },

  s_rom_support_t: { en: "Custom ROM support?", bn: "কাস্টম রম সাপোর্ট?" },
"""

# s_type_why still promised a software question that plat_e no longer asks.
OLD_TYPE_WHY = '  s_type_why: { en: "Two different worlds, and you cannot move apps between them. Say Android and we will ask about the software next.", bn: "দুটো আলাদা জগৎ, অ্যাপ একটা থেকে আরকটায় নেওয়া যায় না। অ্যান্ডরয়েড বললে সফটওয়্যার নিয়ে পরে জিজ্ঞেস করব।" },'
NEW_TYPE_WHY = '  s_type_why: { en: "Two different worlds, and you cannot move apps or data between them.", bn: "দুটো আলাদা জগৎ, অ্যাপ বা ডেটা একটা থেকে আরকটায় নেওয়া যায় না।" },'


def main():
    with io.open(PATH, encoding="utf-8") as fh:
        src = fh.read()

    if "s_elderly_t:" in src:
        print("flow keys already present — nothing to do")
        return 0

    lines = src.splitlines(keepends=True)
    out = []
    inserted = False
    for ln in lines:
        out.append(ln)
        if not inserted and ln.startswith(ANCHOR):
            out.append(BLOCK)
            inserted = True
    if not inserted:
        print(f"anchor {ANCHOR!r} not found", file=sys.stderr)
        return 1

    src2 = "".join(out)
    if OLD_TYPE_WHY in src2:
        src2 = src2.replace(OLD_TYPE_WHY, NEW_TYPE_WHY)
    else:
        print("WARN: s_type_why anchor not found, left as-is", file=sys.stderr)

    with io.open(PATH, "w", encoding="utf-8", newline="") as fh:
        fh.write(src2)
    print("inserted flow keys + rewrote s_type_why")
    return 0


if __name__ == "__main__":
    sys.exit(main())
