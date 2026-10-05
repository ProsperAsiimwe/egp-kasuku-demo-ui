import type { TabData } from "./api";
import type { KasukuApp } from "./apps";

function formatValue(value: string | null) {
  if (value == null || value === "") return "—";
  const numeric = Number(value);
  if (!Number.isNaN(numeric) && /^-?\d+(\.\d+)?$/.test(value)) {
    return numeric.toLocaleString();
  }
  return value;
}

export function AppWorkspace({
  app,
  data,
  loading,
  error,
}: {
  app: KasukuApp;
  data: TabData | null;
  loading: boolean;
  error: string | null;
}) {
  const cards = data?.cards?.length ? data.cards : app.representative_cards.map((name) => ({
    name,
    value: null,
    source: app.collection,
  }));

  return (
    <section className="workspace">
      <header className="workspace-head">
        <div>
          <p className="workspace-kicker">{app.collection}</p>
          <h2>{app.title}</h2>
          <p className="workspace-desc">{app.desc}</p>
        </div>
        <p className="workspace-focus">{app.data_focus}</p>
      </header>

      {error ? <p className="workspace-banner">{error}</p> : null}
      {data?.warning ? <p className="workspace-banner">{data.warning}</p> : null}

      <div className="kpi-grid">
        {loading && !data ? (
          <article className="kpi-card">
            <span>Loading warehouse cards…</span>
            <strong>…</strong>
          </article>
        ) : (
          cards.map((card) => (
            <article key={card.name} className="kpi-card">
              <span>{card.name}</span>
              <strong>{formatValue(card.value)}</strong>
              <em>{card.source}</em>
            </article>
          ))
        )}
      </div>

      {data?.params ? (
        <details className="embed-params">
          <summary>Makeshift embed defaults</summary>
          <dl>
            {Object.entries(data.params).map(([key, values]) => (
              <div key={key}>
                <dt>{key}</dt>
                <dd>{values.join(", ") || "—"}</dd>
              </div>
            ))}
          </dl>
        </details>
      ) : null}

      {data?.embed_url ? (
        <iframe
          className="embed-frame"
          title={`${app.title} warehouse view`}
          src={data.embed_url}
        />
      ) : null}
    </section>
  );
}
