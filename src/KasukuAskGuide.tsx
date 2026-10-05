import { useEffect, useRef, useState } from "react";
import type { GuideSection } from "./guides";

const HIDE_DELAY_MS = 280;

export function KasukuAskGuide({
  guide,
}: {
  guide: { title: string; sections: GuideSection[] };
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<number | null>(null);

  const cancelHide = () => {
    if (hideTimer.current) {
      window.clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  };

  const show = () => {
    cancelHide();
    setOpen(true);
  };

  const hideSoon = () => {
    cancelHide();
    hideTimer.current = window.setTimeout(() => setOpen(false), HIDE_DELAY_MS);
  };

  useEffect(() => () => cancelHide(), []);

  if (!guide.sections.length) return null;

  return (
    <div
      ref={wrapRef}
      className={`acmis-copilot-guide${open ? " is-open" : ""}`}
      onMouseEnter={show}
      onMouseLeave={hideSoon}
      onFocus={show}
      onBlur={(event) => {
        if (!wrapRef.current?.contains(event.relatedTarget as Node)) {
          hideSoon();
        }
      }}
    >
      <button
        type="button"
        className="acmis-copilot-icon-btn"
        aria-label={guide.title}
        aria-expanded={open}
        aria-describedby="egp-kasuku-ask-guide"
        onClick={() => {
          cancelHide();
          setOpen((current) => !current);
        }}
      >
        i
      </button>
      <div id="egp-kasuku-ask-guide" className="acmis-copilot-guide-pop" role="tooltip">
        <strong>{guide.title}</strong>
        {guide.sections.map((section) => (
          <div key={section.title} className="acmis-copilot-guide-section">
            <span>{section.title}</span>
            <p>{section.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
