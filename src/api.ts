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

export type BidSample = {
  sample_key: string;
  title: string;
  procurement_type: string;
};

export type BidCheck = {
  stage: string;
  criterion_id: string;
  label: string;
  outcome: string;
  score: number | null;
  evidence: string;
};

export type BidFlag = {
  title: string;
  url: string;
  note: string;
};

export type BidResearch = {
  website: string;
  pages: {
    url?: string;
    title?: string;
    source?: string;
    excerpt?: string;
    published_at?: string | null;
    opened?: boolean;
    note?: string;
    wrongdoing?: string[];
  }[];
  legitimacy: string;
  summary: string;
  flags: BidFlag[];
  error: string | null;
};

export type BidSubmission = {
  id: number;
  company_name: string;
  website: string;
  sample_key: string;
  document_title: string;
  procurement_type: string;
  status: string;
  preliminary_outcome: string | null;
  technical_score: number | null;
  financial_score: number | null;
  combined_score: number | null;
  integrity_outcome: string | null;
  verdict: string;
  summary: string;
  error: string | null;
  upload_dir?: string | null;
  created_at?: string;
  rank?: number | null;
  best_evaluated?: boolean;
  checks?: BidCheck[];
  research?: BidResearch | null;
};

function staffError(body: any, fallback: string): string {
  return body.error || body.server?.message || fallback;
}

export async function listBidSamples(session: DemoSession, app: KasukuApp): Promise<BidSample[]> {
  const response = await fetch(`${API}/copilot/evaluation/samples`, {
    headers: staffHeaders(session, app),
  });
  const body = await parseJson(response);
  if (!response.ok || body.server?.status === false) {
    throw new Error(staffError(body, "Could not load evaluation templates."));
  }
  return (body.samples || []) as BidSample[];
}

export async function listBidBoard(session: DemoSession, app: KasukuApp): Promise<BidSubmission[]> {
  const response = await fetch(`${API}/copilot/evaluation/bids`, {
    headers: staffHeaders(session, app),
  });
  const body = await parseJson(response);
  if (!response.ok || body.server?.status === false) {
    throw new Error(staffError(body, "Could not load evaluations."));
  }
  return (body.board || []) as BidSubmission[];
}

export async function clearBidBoard(
  session: DemoSession,
  app: KasukuApp,
  scope: "recommended" | "rejected" = "recommended",
): Promise<BidSubmission[]> {
  const response = await fetch(`${API}/copilot/evaluation/bids?scope=${scope}`, {
    method: "DELETE",
    headers: staffHeaders(session, app),
  });
  const body = await parseJson(response);
  if (!response.ok || body.server?.status === false) {
    throw new Error(
      staffError(
        body,
        scope === "rejected"
          ? "Could not clear the rejected bidders."
          : "Could not clear the best evaluated bidders.",
      ),
    );
  }
  return (body.board || []) as BidSubmission[];
}

export async function getBid(
  session: DemoSession,
  app: KasukuApp,
  submissionId: number,
): Promise<BidSubmission> {
  const response = await fetch(`${API}/copilot/evaluation/bids/${submissionId}`, {
    headers: staffHeaders(session, app),
  });
  const body = await parseJson(response);
  if (!response.ok || body.server?.status === false) {
    throw new Error(staffError(body, "Could not open that evaluation."));
  }
  return body.submission as BidSubmission;
}

export async function submitBid(
  session: DemoSession,
  app: KasukuApp,
  input: {
    company_name: string;
    website: string;
    template_key: string;
    bid_file: File;
    nssf_file: File;
    trading_licence_file: File;
    tax_clearance_file: File;
    experience_file: File;
    registration_file: File;
    nita_file: File | null;
  },
): Promise<{ submission: BidSubmission; board: BidSubmission[] }> {
  const form = new FormData();
  form.set("company_name", input.company_name);
  form.set("website", input.website);
  form.set("template_key", input.template_key);
  form.set("bid_file", input.bid_file);
  form.set("nssf_file", input.nssf_file);
  form.set("trading_licence_file", input.trading_licence_file);
  form.set("tax_clearance_file", input.tax_clearance_file);
  form.set("experience_file", input.experience_file);
  form.set("registration_file", input.registration_file);
  if (input.nita_file) form.set("nita_file", input.nita_file);
  const headers = staffHeaders(session, app) as Record<string, string>;
  delete headers["Content-Type"];
  const response = await fetch(`${API}/copilot/evaluation/bids`, {
    method: "POST",
    headers,
    body: form,
  });
  const body = await parseJson(response);
  if (!response.ok || body.server?.status === false) {
    throw new Error(staffError(body, "Kasuku could not evaluate that bid."));
  }
  return {
    submission: body.submission as BidSubmission,
    board: (body.board || []) as BidSubmission[],
  };
}
