import { useEffect, useState } from "react";
import type { DemoSession } from "./api";
import type { KasukuApp } from "./apps";
import { KasukuMark } from "./KasukuMark";
import { KasukuPanel } from "./KasukuPanel";

export function KasukuFab({
  app,
  session,
  userName,
}: {
  app: KasukuApp | null;
  session: DemoSession | null;
  userName: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [app?.code]);

  if (!app) return null;

  return (
    <div className="acmis-copilot-root" style={{ ["--copilot-accent" as string]: "#2f97c1" }}>
      <KasukuPanel
        key={app.code}
        app={app}
        session={session}
        userName={userName}
        open={open}
        onClose={() => setOpen(false)}
      />
      <button
        type="button"
        className={`acmis-copilot-fab${open ? "" : " is-kasuku"}`}
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-label={open ? "Close Kasuku" : "Open Kasuku"}
        title={open ? "Close Kasuku" : "Ask Kasuku."}
      >
        {open ? <span aria-hidden="true">×</span> : <KasukuMark className="acmis-copilot-fab-mark" />}
      </button>
    </div>
  );
}
