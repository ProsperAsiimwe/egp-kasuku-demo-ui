import { useEffect, useState } from "react";
import {
  createDemoSession,
  fetchAppData,
  fetchHealth,
  listApps,
  type DemoSession,
  type TabData,
} from "./api";
import type { KasukuApp } from "./apps";
import { ApplicationsHome } from "./ApplicationsHome";
import { AppWorkspace } from "./AppWorkspace";
import { EvaluationDesk } from "./EvaluationDesk";
import { KasukuFab } from "./KasukuFab";

const NAME_KEY = "egp-kasuku-demo-name";
const ROLE_TITLE = "PDE ACCOUNTING OFFICER";

export function App() {
  const [name, setName] = useState(() => localStorage.getItem(NAME_KEY) || "Demo");
  const [session, setSession] = useState<DemoSession | null>(null);
  const [apps, setApps] = useState<KasukuApp[]>([]);
  const [activeApp, setActiveApp] = useState<KasukuApp | null>(null);
  const [tabData, setTabData] = useState<TabData | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);
  const [loadingApps, setLoadingApps] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [health, setHealth] = useState<{ live: boolean; ready: boolean } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const next = await createDemoSession(name);
        if (!cancelled) {
          setSession(next);
          setBootError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setBootError(error instanceof Error ? error.message : "Could not start a demo session.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [name]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingApps(true);
      try {
        const rows = await listApps();
        if (!cancelled) {
          setApps(rows);
          setBootError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setBootError(error instanceof Error ? error.message : "Could not load EGP apps.");
        }
      } finally {
        if (!cancelled) setLoadingApps(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const tick = async () => {
      try {
        setHealth(await fetchHealth());
      } catch {
        setHealth({ live: false, ready: false });
      }
    };
    void tick();
    const id = window.setInterval(() => void tick(), 15000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!activeApp) {
      setTabData(null);
      setDataError(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingData(true);
      setDataError(null);
      try {
        const next = await fetchAppData(activeApp.slug);
        if (!cancelled) setTabData(next);
      } catch (error) {
        if (!cancelled) {
          setDataError(error instanceof Error ? error.message : "Could not load tab data.");
        }
      } finally {
        if (!cancelled) setLoadingData(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeApp]);

  return (
    <div className="acmis-shell">
      <header className="acmis-topbar">
        <button
          type="button"
          className="brand"
          onClick={() => setActiveApp(null)}
        >
          <span>EGP 2.0</span>
          {activeApp ? activeApp.short_name : "MY APPLICATIONS"}
        </button>
        <div className="topbar-meta">
          <label className="name-field">
            <span>Signed in as</span>
            <input
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                localStorage.setItem(NAME_KEY, event.target.value);
              }}
            />
          </label>
          <div className={`pulse ${health?.ready ? "ok" : health?.live ? "warm" : "down"}`}>
            {health?.ready ? "Ready" : health?.live ? "Live, waiting on backends" : "MLOPS offline"}
          </div>
        </div>
      </header>

      <main className="acmis-main">
        {activeApp ? (
          <>
            <nav className="crumb">
              <button type="button" onClick={() => setActiveApp(null)}>
                MY APPLICATIONS
              </button>
              <span>/</span>
              <strong>{activeApp.title}</strong>
            </nav>
            {activeApp.code === "EVALUATION" ? (
              <EvaluationDesk app={activeApp} session={session} />
            ) : null}
            <AppWorkspace app={activeApp} data={tabData} loading={loadingData} error={dataError} />
          </>
        ) : (
          <ApplicationsHome
            apps={apps}
            roleTitle={ROLE_TITLE}
            loading={loadingApps}
            error={bootError}
            onOpen={setActiveApp}
          />
        )}
      </main>

      <footer className="acmis-footer">
        Electronic Government Procurement · EGP 2.0 KASUKU demo
      </footer>

      <KasukuFab app={activeApp} session={session} userName={name} />
    </div>
  );
}
