import type { KasukuApp } from "./apps";

const API = "/egp-mlops-microservice/v1";

export type DemoSession = {
  token: string;
  role_id: number;
  user_id: number;
  email: string;
  display_name: string;
};

export type ChatMessage = {
  id?: number | string;
  role: "user" | "assistant" | "error";
  content: string;
};

export type ChatThread = {
  id: number | string;
  title: string;
  updated_at?: string;
  isDraft?: boolean;
  messages?: ChatMessage[];
};

export type TabCard = {
  name: string;
  value: string | null;
  source: string;
};

export type TabData = {
  app: KasukuApp;
  params: Record<string, string[]>;
  cards: TabCard[];
  embed_url: string | null;
  source: string;
  warning: string | null;
};

async function parseJson(response: Response): Promise<any> {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new Error(text || `HTTP ${response.status}`);
  }
}

export async function fetchHealth(): Promise<{ live: boolean; ready: boolean }> {
  const [liveRes, readyRes] = await Promise.all([
    fetch("/health/live"),
    fetch("/health/ready"),
  ]);
  return { live: liveRes.ok, ready: readyRes.ok };
}

export async function createDemoSession(displayName: string): Promise<DemoSession> {
  const response = await fetch(`${API}/demo/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ display_name: displayName }),
  });
  const body = await parseJson(response);
  if (!response.ok) {
    throw new Error(body.detail || "Could not start a demo session.");
  }
  return body as DemoSession;
}

export async function listApps(): Promise<KasukuApp[]> {
  const response = await fetch(`${API}/demo/apps`);
  const body = await parseJson(response);
  if (!response.ok) {
    throw new Error(body.detail || "Could not load EGP apps.");
  }
  return (body.apps || []) as KasukuApp[];
}

export async function fetchAppData(slug: string): Promise<TabData> {
  const response = await fetch(`${API}/demo/apps/${slug}/data`);
  const body = await parseJson(response);
  if (!response.ok) {
    throw new Error(body.detail || "Could not load tab data.");
  }
  return body as TabData;
}

function staffHeaders(session: DemoSession, app: KasukuApp): HeadersInit {
  return {
    Authorization: `Bearer ${session.token}`,
    "Content-Type": "application/json",
    Role: String(session.role_id),
    App: app.code,
  };
}

export async function listThreads(session: DemoSession, app: KasukuApp): Promise<ChatThread[]> {
  const response = await fetch(`${API}/copilot/${app.slug}/threads`, {
    headers: staffHeaders(session, app),
  });
  const body = await parseJson(response);
  if (!response.ok || body.server?.status === false) {
    throw new Error(body.error || body.server?.message || "Could not load threads.");
  }
  return (body.data || []) as ChatThread[];
}

export async function getThread(
  session: DemoSession,
  app: KasukuApp,
  threadId: number,
): Promise<ChatThread> {
  const response = await fetch(`${API}/copilot/${app.slug}/threads/${threadId}`, {
    headers: staffHeaders(session, app),
  });
  const body = await parseJson(response);
  if (!response.ok || body.server?.status === false) {
    throw new Error(body.error || body.server?.message || "Could not load the thread.");
  }
  return body.data as ChatThread;
}

export async function deleteThread(
  session: DemoSession,
  app: KasukuApp,
  threadId: number,
): Promise<void> {
  const response = await fetch(`${API}/copilot/${app.slug}/threads/${threadId}`, {
    method: "DELETE",
    headers: staffHeaders(session, app),
  });
  const body = await parseJson(response);
  if (!response.ok || body.server?.status === false) {
    throw new Error(body.error || body.server?.message || "Could not delete the thread.");
  }
}

export async function sendChat(
  session: DemoSession,
  app: KasukuApp,
  message: string,
  threadId: number | null,
): Promise<{ reply: string; thread_id: number; title: string }> {
  const response = await fetch(`${API}/copilot/${app.slug}/chat`, {
    method: "POST",
    headers: staffHeaders(session, app),
    body: JSON.stringify({
      message,
      thread_id: threadId,
      app_code: app.code,
    }),
  });
  const body = await parseJson(response);
  if (!response.ok || body.server?.status === false) {
    throw new Error(body.error || body.server?.message || "Kasuku could not answer.");
  }
  return {
    reply: String(body.reply || ""),
    thread_id: Number(body.thread_id),
    title: String(body.title || "New chat"),
  };
}
