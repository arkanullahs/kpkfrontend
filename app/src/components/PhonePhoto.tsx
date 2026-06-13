import { useState } from "react";
import { st } from "../theme";

/** Product photo from scraped shop data, with a graceful striped placeholder
    when there's no image or the URL fails to load. */
export function PhonePhoto({ src, w, h, radius = 14, label = "photo" }: {
  src?: string | null; w: string; h: string; radius?: number; label?: string;
}) {
  const [failed, setFailed] = useState(false);
  const box = `width:${w}; height:${h}; border-radius:${radius}px; flex-shrink:0; box-shadow:inset 0 0 0 1px rgba(15,25,35,.06); overflow:hidden;`;

  if (src && !failed) {
    return (
      <div style={st(box + " background:#fff; display:flex; align-items:center; justify-content:center;")}>
        <img src={src} alt="" loading="lazy" onError={() => setFailed(true)}
          style={st("width:100%; height:100%; object-fit:contain;")} />
      </div>
    );
  }
  return (
    <div style={st(box + " background:repeating-linear-gradient(45deg,#eef0f3,#eef0f3 5px,#e6e9ee 5px,#e6e9ee 10px); display:flex; align-items:flex-end; justify-content:center; padding-bottom:6px;")}>
      <span style={st("font-family:ui-monospace,monospace; font-size:8px; color:#aab0b8;")}>{label}</span>
    </div>
  );
}
