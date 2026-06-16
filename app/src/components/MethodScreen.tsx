import { st } from "../theme";
import { t } from "../i18n";

const STEPS: [string, string][] = [
  ["rag1_t", "rag1_s"],   // filter by budget
  ["rag2_t", "rag2_s"],   // match what you need (semantic retrieval)
  ["rag3_t", "rag3_s"],   // read real reviews (evidence)
  ["rag4_t", "rag4_s"],   // LLM ranks + writes verdicts
];

const STEP_ICON = [
  "M3 6h18M6 12h12M10 18h4",                                  // filter
  "M11 4a7 7 0 100 14 7 7 0 000-14zM16 16l5 5",               // search
  "M5 4h11l3 3v13H5zM8 9h8M8 13h8M8 17h5",                    // document
  "M4 18l5-5 4 4 7-8M14 9h5v5",                               // chart up
];

/** Dedicated "how it works" page — the RAG method explained in full, reached
    from the results banner. Plain language a parent understands, but it names
    the real machinery (evidence files, retrieval, an LLM) so it doesn't read as
    a toy. */
export function MethodScreen({ onBack }: { onBack: () => void }) {
  return (
    <div style={st("max-width:760px; margin:0 auto; animation:kfade .45s cubic-bezier(.2,.7,.2,1) both;")}>
      <button onClick={onBack} className="k-press" style={st("display:flex; align-items:center; gap:9px; margin-top:clamp(10px,2.5vh,28px); padding:9px 16px 9px 12px; border-radius:99px; border:none; cursor:pointer; background:rgba(255,255,255,.7); box-shadow:inset 0 0 0 1px rgba(15,25,35,.06); font-size:13.5px; font-weight:600; color:#41464d;")}>
        <svg width="8" height="13" viewBox="0 0 9 15" fill="none"><path d="M7.5 1.5l-6 6 6 6" stroke="#41464d" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        {t("back_to_results")}
      </button>

      <div style={st("display:flex; align-items:center; gap:14px; margin-top:22px;")}>
        <span style={st("display:flex; align-items:center; justify-content:center; width:52px; height:52px; border-radius:16px; background:var(--ac); flex-shrink:0; box-shadow:0 8px 22px var(--acglow);")}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M9.5 18h5M10.5 21h3M12 3a6 6 0 00-3.8 10.6c.5.5.8 1.1.8 1.8V16h6v-.6c0-.7.3-1.3.8-1.8A6 6 0 0012 3z" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </span>
        <h1 style={st("font-family:var(--f-display); margin:0; font-size:clamp(28px,4.4vw,40px); font-weight:600; letter-spacing:-1.2px; line-height:1.1; text-wrap:balance;")}>{t("results_how_t")}</h1>
      </div>

      <p style={st("margin:20px 0 0; font-size:16px; color:#363b42; line-height:1.7; text-wrap:pretty;")}>{t("results_how")}</p>

      <div style={st("font-size:12px; font-weight:700; letter-spacing:1.8px; text-transform:uppercase; color:#9a9da4; margin:34px 0 0;")}>{t("method_steps_h")}</div>
      <div style={st("display:flex; flex-direction:column; gap:13px; margin-top:18px;")}>
        {STEPS.map(([tt, ss], i) => (
          <div key={tt} style={st("display:flex; gap:15px; align-items:flex-start; padding:18px 20px; border-radius:18px; background:rgba(255,255,255,.92); box-shadow:0 1px 2px rgba(15,25,35,.05), 0 8px 24px rgba(15,25,35,.06);")}>
            <span style={st("position:relative; display:flex; align-items:center; justify-content:center; width:44px; height:44px; border-radius:13px; background:var(--acsoft); color:var(--acd); flex-shrink:0;")}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d={STEP_ICON[i]} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
              <span style={st("position:absolute; top:-7px; right:-7px; width:21px; height:21px; border-radius:50%; background:var(--ac); color:#fff; font-size:12px; font-weight:700; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 6px var(--acglow);")}>{i + 1}</span>
            </span>
            <div style={st("min-width:0;")}>
              <div style={st("font-size:16.5px; font-weight:700; color:#17191d; line-height:1.25;")}>{t(tt)}</div>
              <p style={st("margin:5px 0 0; font-size:14.5px; color:#5c626a; line-height:1.55; text-wrap:pretty;")}>{t(ss)}</p>
            </div>
          </div>
        ))}
      </div>

      <div style={st("display:flex; gap:12px; align-items:flex-start; margin-top:20px; padding:17px 19px; border-radius:18px; background:var(--acsoft); border:.5px solid var(--acsoft2);")}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={st("flex-shrink:0; margin-top:1px;")}><path d="M9 12.5l2 2 4.5-4.5M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" stroke="var(--ac)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
        <p style={st("margin:0; font-size:14.5px; color:#363b42; line-height:1.6; text-wrap:pretty;")}>{t("rag_worth")}</p>
      </div>
    </div>
  );
}
