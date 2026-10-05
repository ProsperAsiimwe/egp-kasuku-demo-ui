import type { KasukuApp } from "./apps";
import { initials } from "./apps";

const TILE_TONES = [
  "#2f97c1",
  "#1f6f8b",
  "#0f766e",
  "#b45309",
  "#7c3aed",
  "#be123c",
  "#0369a1",
  "#15803d",
  "#c2410c",
  "#4338ca",
  "#0f766e",
  "#a16207",
  "#334155",
];

export function ApplicationsHome({
  apps,
  roleTitle,
  loading,
  error,
  onOpen,
}: {
  apps: KasukuApp[];
  roleTitle: string;
  loading: boolean;
  error: string | null;
  onOpen: (app: KasukuApp) => void;
}) {
  if (loading && !apps.length) {
    return (
      <div className="empty-apps">
        <p>Please wait…</p>
      </div>
    );
  }

  if (error && !apps.length) {
    return (
      <div className="empty-apps is-error">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <>
      <div className="apps-alert" role="status">
        YOU HAVE {apps.length} APPS AS {roleTitle}
      </div>
      <div className="app-grid">
        {apps.map((app, index) => (
          <button
            key={app.slug}
            type="button"
            className="app-tile"
            onClick={() => onOpen(app)}
          >
            <header className="app-tile-title">{app.title}</header>
            <div className="app-tile-body">
              <span
                className="app-tile-mark"
                style={{ background: TILE_TONES[index % TILE_TONES.length] }}
                aria-hidden="true"
              >
                {initials(app.short_name || app.title)}
              </span>
              <small>{app.desc}</small>
            </div>
          </button>
        ))}
      </div>
    </>
  );
}
