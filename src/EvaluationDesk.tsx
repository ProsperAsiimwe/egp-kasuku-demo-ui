import { useEffect, useState, type FormEvent } from "react";
import {
  listBidBoard,
  listBidSamples,
  clearBidBoard,
  submitBid,
  type BidResearch,
  type BidSample,
  type BidSubmission,
  type DemoSession,
} from "./api";
import { KasukuMark } from "./KasukuMark";
import type { KasukuApp } from "./apps";

const ACCEPT =
  ".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const REQUIRED_UPLOADS = [
  { key: "nssf_file", label: "NSSF clearance", required: true },
  { key: "trading_licence_file", label: "Trading licence", required: true },
  { key: "tax_clearance_file", label: "Tax clearance", required: true },
  { key: "experience_file", label: "Minimum experience", required: true },
  { key: "registration_file", label: "Registration", required: true },
  { key: "nita_file", label: "NITA-U certificate", required: false },
] as const;

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

type ResearchPage = BidResearch["pages"][number];

function formatPublished(value?: string | null): string {
  if (!value) return "Date not published · time not published";
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?([+-]\d{2}:\d{2})?/.exec(value);
  const month = match ? MONTHS[Number(match[2]) - 1] : "";
  if (!match || !month) return "Date not published · time not published";
  const date = `${Number(match[3])} ${month} ${match[1]}`;
  if (!match[4]) return `${date} · time not published`;
  const zone = match[6] === "+03:00" ? "EAT" : match[6] === "+00:00" ? "UTC" : match[6] || "";
  return zone ? `${date}, ${match[4]}:${match[5]} ${zone}` : `${date}, ${match[4]}:${match[5]}`;
}

function sourceLabel(source?: string): string {
  const name = (source || "source").replaceAll("_", " ");
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function byRecency(pages: ResearchPage[]): ResearchPage[] {
  return [...pages].sort((left, right) => {
    const leftStamp = left.published_at ? Date.parse(left.published_at) : Number.NaN;
    const rightStamp = right.published_at ? Date.parse(right.published_at) : Number.NaN;
    if (Number.isNaN(leftStamp) && Number.isNaN(rightStamp)) return 0;
    if (Number.isNaN(leftStamp)) return 1;
    if (Number.isNaN(rightStamp)) return -1;
    return rightStamp - leftStamp;
  });
}

function outcomeLabel(outcome: string): string {
  if (outcome === "pass") return "Pass";
  if (outcome === "fail") return "Fail";
  if (outcome === "not_applicable") return "Not applicable";
  return outcome;
}

function SourceCards({ pages }: { pages: ResearchPage[] }) {
  return (
    <>
      {pages.map((page) =>
        page.url ? (
          <article key={page.url} className="source-card">
            <p className="source-when">{formatPublished(page.published_at)}</p>
            <p className="source-kind">{sourceLabel(page.source)}</p>
            <a href={page.url} target="_blank" rel="noreferrer">
              {page.title || page.url}
            </a>
            {page.excerpt ? <p>{page.excerpt}</p> : null}
            {page.note ? <p className="source-note">{page.note}</p> : null}
          </article>
        ) : null,
      )}
    </>
  );
}

function ResearchReport({ research }: { research: BidResearch }) {
  const pages = research.pages ?? [];
  const opened = byRecency(
    pages.filter((page) => page.opened !== false && page.source !== "company_website"),
  );
  const website = pages.filter((page) => page.source === "company_website");
  const skipped = byRecency(pages.filter((page) => page.opened === false));
  const decision = (
    research.summary ||
    research.error ||
    "No public pages were opened."
  )
    .split(/\n\n(?:Research|Sources opened)/)[0]
    .trim();

  return (
    <div className="research-card">
      <strong>Company check · {research.legitimacy}</strong>
      <p className="research-decision">{decision}</p>
      {opened.length ? (
        <div className="source-list">
          <h4>Sources, newest first</h4>
          <SourceCards pages={opened} />
        </div>
      ) : null}
      {website.length ? (
        <div className="source-list source-aside">
          <h4>Company website</h4>
          <p>Opened for context only. It was not used to pass or fail the check.</p>
          <SourceCards pages={website} />
        </div>
      ) : null}
      {skipped.length ? (
        <div className="source-list source-aside">
          <h4>Found, not opened</h4>
          <SourceCards pages={skipped} />
        </div>
      ) : null}
      {research.flags?.length ? (
        <div className="source-list">
          <h4>Finding</h4>
          {research.flags.map((flag) => (
            <article key={flag.url} className="source-card">
              <a href={flag.url} target="_blank" rel="noreferrer">
                {flag.title}
              </a>
              <p>{flag.note}</p>
            </article>
          ))}
        </div>
      ) : null}
    </div>
  );
}

const STAGES = [
  {
    title: "Preliminary",
    text: "Pass or fail. NSSF, trading licence, tax clearance, experience, registration, and NITA-U where it applies. One fail ends the bid.",
  },
  {
    title: "Company check",
    text: "Kasuku searches public news, blogs, and posts outside the company website. A pass needs those sources. A confirmed misconduct finding removes the bidder before scoring.",
  },
  {
    title: "Technical, then financial",
    text: "Only bidders who are still in. Each stage needs 70%. The best evaluated bidder is the one who clears every gate with the highest combined score.",
  },
];

const PROGRESS_STAGES = [
  { until: 14, label: "Reading the uploaded documents" },
  { until: 36, label: "Checking the bid against the template" },
  { until: 58, label: "Checking certificates and experience" },
  { until: 78, label: "Researching public pages about the company" },
  { until: 100, label: "Scoring technical and financial offers" },
];

function progressLabel(percent: number) {
  return (
    PROGRESS_STAGES.find((stage) => percent <= stage.until)?.label ??
    PROGRESS_STAGES[PROGRESS_STAGES.length - 1].label
  );
}

function EvalProgress({ percent }: { percent: number }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(100, percent) / 100);
  return (
    <div className="eval-progress" role="status" aria-live="polite">
      <div className="eval-ring">
        <svg viewBox="0 0 140 140" aria-hidden="true">
          <circle className="eval-ring-track" cx="70" cy="70" r={radius} />
          <circle
            className="eval-ring-value"
            cx="70"
            cy="70"
            r={radius}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <strong>{percent}%</strong>
      </div>
      <div>
        <p className="eval-progress-kicker">
          <span className="kasuku-thinking" aria-hidden="true">
            <KasukuMark className="kasuku-thinking-img" alt="" />
          </span>
          Kasuku is thinking
        </p>
        <h3>{progressLabel(percent)}</h3>
        <span>The result is saved to your account when this finishes.</span>
      </div>
    </div>
  );
}

function verdictLabel(verdict: string) {
  if (verdict === "recommended") return "Recommended";
  if (verdict === "eliminated") return "Eliminated";
  if (verdict === "error") return "Could not finish";
  return verdict;
}

export function EvaluationDesk({
  app,
  session,
}: {
  app: KasukuApp;
  session: DemoSession | null;
}) {
  const [samples, setSamples] = useState<BidSample[]>([]);
  const [board, setBoard] = useState<BidSubmission[]>([]);
  const [templateKey, setTemplateKey] = useState("");
  const [bidFile, setBidFile] = useState<File | null>(null);
  const [requiredFiles, setRequiredFiles] = useState<
    Record<string, File | null>
  >({});
  const [companyName, setCompanyName] = useState("");
  const [website, setWebsite] = useState("");
  const [result, setResult] = useState<BidSubmission | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    (async () => {
      try {
        const [nextSamples, nextBoard] = await Promise.all([
          listBidSamples(session, app),
          listBidBoard(session, app),
        ]);
        if (cancelled) return;
        setSamples(nextSamples);
        setBoard(nextBoard);
        setTemplateKey(
          (current) => current || nextSamples[0]?.sample_key || "",
        );
        setBootError(null);
      } catch (err) {
        if (!cancelled) {
          setBootError(
            err instanceof Error ? err.message : "Could not open evaluation.",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session, app]);

  useEffect(() => {
    if (!loading) return;
    const started = Date.now();
    const timer = window.setInterval(() => {
      const seconds = (Date.now() - started) / 1000;
      const next = Math.min(96, Math.round(100 * (1 - Math.exp(-seconds / 18))));
      setProgress(next);
    }, 200);
    return () => window.clearInterval(timer);
  }, [loading]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!session) return;
    setLoading(true);
    setProgress(4);
    setError(null);
    try {
      if (!bidFile) {
        setError("Upload the bidder's PDF or DOCX.");
        setLoading(false);
        return;
      }
      const missing = REQUIRED_UPLOADS.filter(
        (item) => item.required && !requiredFiles[item.key],
      );
      if (missing.length) {
        setError(`Upload ${missing.map((item) => item.label).join(", ")}.`);
        setLoading(false);
        return;
      }
      const next = await submitBid(session, app, {
        company_name: companyName.trim(),
        website: website.trim(),
        template_key: templateKey,
        bid_file: bidFile,
        nssf_file: requiredFiles.nssf_file as File,
        trading_licence_file: requiredFiles.trading_licence_file as File,
        tax_clearance_file: requiredFiles.tax_clearance_file as File,
        experience_file: requiredFiles.experience_file as File,
        registration_file: requiredFiles.registration_file as File,
        nita_file: requiredFiles.nita_file ?? null,
      });
      setProgress(100);
      setResult(next.submission);
      setBoard(next.board);
      await new Promise((resolve) => window.setTimeout(resolve, 700));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Kasuku could not evaluate that bid.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function onClearBoard() {
    if (!session || clearing) return;
    setClearing(true);
    setError(null);
    try {
      const nextBoard = await clearBidBoard(session, app);
      setBoard(nextBoard);
      setResult((current) =>
        current && nextBoard.some((row) => row.id === current.id) ? current : null,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not clear the best evaluated bidders.",
      );
    } finally {
      setClearing(false);
    }
  }

  const checks = result?.checks || [];
  const preliminary = checks.filter((item) => item.stage === "preliminary");
  const technical = checks.find((item) => item.stage === "technical");
  const financial = checks.find((item) => item.stage === "financial");
  const ranked = board.filter((row) => row.rank != null);

  return (
    <section className="eval-desk">
      <header className="eval-head">
        <p className="workspace-kicker">Kasuku evaluation</p>
        <h2>Guidelines for evaluating bids</h2>
        <p>
          Upload the bidder’s bidding documents. Kasuku checks the submitted
          bidding documents and recommends a bidder. It does not award the
          contract.
        </p>
      </header>

      <ol className="eval-steps">
        {STAGES.map((stage) => (
          <li key={stage.title}>
            <strong>{stage.title}</strong>
            <span>{stage.text}</span>
          </li>
        ))}
      </ol>

      {bootError ? <p className="workspace-banner">{bootError}</p> : null}

      <form className="eval-form" onSubmit={onSubmit}>
        <fieldset disabled={loading || !session}>
          <legend>Upload a bid</legend>
          <label className="template-pick">
            Choose one of the standard bidding documents that your bid is
            written against.
            <select
              value={templateKey}
              onChange={(event) => setTemplateKey(event.target.value)}
              required>
              {samples.map((sample) => (
                <option key={sample.sample_key} value={sample.sample_key}>
                  {sample.title}
                </option>
              ))}
            </select>
          </label>
          <div className="eval-fields">
            <label className="bid-file">
              Bidder’s document
              <input
                type="file"
                accept={ACCEPT}
                required
                onChange={(event) =>
                  setBidFile(event.target.files?.[0] ?? null)
                }
              />
            </label>
            <label>
              Company name
              <input
                value={companyName}
                onChange={(event) => setCompanyName(event.target.value)}
                placeholder="Bidder registered name"
                required
              />
            </label>
            <label>
              Company website
              <input
                value={website}
                onChange={(event) => setWebsite(event.target.value)}
                placeholder="https://example.go.ug"
                required
              />
            </label>
          </div>
          <p className="eval-note">Required documents</p>
          <div className="eval-fields">
            {REQUIRED_UPLOADS.map((item) => (
              <label key={item.key} className="bid-file">
                {item.label}
                {item.required ? "" : " (optional for works)"}
                <input
                  type="file"
                  accept={ACCEPT}
                  required={item.required}
                  onChange={(event) =>
                    setRequiredFiles((current) => ({
                      ...current,
                      [item.key]: event.target.files?.[0] ?? null,
                    }))
                  }
                />
              </label>
            ))}
          </div>
          <p className="eval-note">
            Kasuku fails a certificate when the upload is blank or does not
            follow that certificate’s template. The words “shall submit” are not
            proof the bidder attached it. Works bids may leave NITA-U empty.
          </p>
          <button type="submit" className="eval-submit">
            {loading
              ? "Kasuku is working through the gates…"
              : "Ask Kasuku to evaluate"}
          </button>
        </fieldset>
      </form>

      {loading ? <EvalProgress percent={progress} /> : null}

      {error ? <p className="workspace-banner">{error}</p> : null}

      {result ? (
        <article className={`eval-result ${result.verdict}`}>
          <p className="eval-verdict">{verdictLabel(result.verdict)}</p>
          <h3>{result.company_name}</h3>
          <p className="eval-against">
            Uploaded {result.document_title}. Checked against{" "}
            {samples.find((item) => item.sample_key === result.sample_key)
              ?.title || result.sample_key}
            .
          </p>
          <p>{result.summary}</p>
          {result.upload_dir ? (
            <p className="eval-against">Saved for your account.</p>
          ) : null}
          {preliminary.length ? (
            <ul className="check-list">
              {preliminary.map((item) => (
                <li key={item.criterion_id} className={item.outcome}>
                  <strong>{item.label}</strong>
                  <em>{outcomeLabel(item.outcome)}</em>
                  <span>{item.evidence}</span>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="score-row">
            <p>
              <span>Technical</span>
              <strong>
                {technical?.score == null
                  ? "Not scored"
                  : `${technical.score}%`}
              </strong>
              {technical?.evidence ? <em>{technical.evidence}</em> : null}
            </p>
            <p>
              <span>Financial</span>
              <strong>
                {financial?.score == null
                  ? "Not scored"
                  : `${financial.score}%`}
              </strong>
              {financial?.evidence ? <em>{financial.evidence}</em> : null}
            </p>
          </div>
          {result.research ? <ResearchReport research={result.research} /> : null}
        </article>
      ) : null}

      {ranked.length ? (
        <div className="rank-board">
          <div className="rank-board-head">
            <h3>Best evaluated bidders</h3>
            <button
              type="button"
              className="rank-clear"
              onClick={onClearBoard}
              disabled={clearing || loading}
            >
              {clearing ? "Clearing…" : "Clear list"}
            </button>
          </div>
          <p>
            Only bidders who passed every gate. Rank is combined technical and
            financial score.
          </p>
          <ol>
            {ranked.map((row) => (
              <li key={row.id}>
                <strong>
                  {row.rank}. {row.company_name}
                  {row.best_evaluated ? " · best evaluated" : ""}
                </strong>
                <span>
                  Technical {row.technical_score}% · Financial{" "}
                  {row.financial_score}%
                </span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </section>
  );
}
