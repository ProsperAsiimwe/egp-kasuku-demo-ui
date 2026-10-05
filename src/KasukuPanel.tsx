import { useEffect, useRef, useState } from "react";
import type { DemoSession } from "./api";
import type { KasukuApp } from "./apps";
import { initials } from "./apps";
import { getAskGuide } from "./guides";
import { KasukuAskGuide } from "./KasukuAskGuide";
import { KasukuMark } from "./KasukuMark";
import { useKasukuThreads } from "./useKasukuThreads";

function formatThreadTime(value?: string) {
  if (!value) return "";
  try {
    return new Date(value).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function StreamBubble({
  content,
  streaming,
  onProgress,
  onDone,
}: {
  content: string;
  streaming: boolean;
  onProgress: () => void;
  onDone: () => void;
}) {
  const [shown, setShown] = useState(streaming ? "" : content);

  useEffect(() => {
    if (!streaming) {
      setShown(content);
      return;
    }
    let index = 0;
    const tick = window.setInterval(() => {
      index += 3;
      setShown(content.slice(0, index));
      onProgress();
      if (index >= content.length) {
        window.clearInterval(tick);
        onDone();
      }
    }, 16);
    return () => window.clearInterval(tick);
    // Replay only when the assistant message or stream flag changes.
  }, [content, streaming]);

  return (
    <div className="acmis-copilot-bubble">
      {shown}
      {streaming && shown.length < content.length ? <span className="acmis-copilot-caret" /> : null}
    </div>
  );
}

export function KasukuPanel({
  app,
  session,
  userName,
  open,
  onClose,
}: {
  app: KasukuApp;
  session: DemoSession | null;
  userName: string;
  open: boolean;
  onClose: () => void;
}) {
  const {
    threads,
    activeThread,
    loadingThreads,
    loadingMessages,
    sending,
    error,
    streamingId,
    setStreamingId,
    startNewThread,
    selectThread,
    removeThread,
    send,
  } = useKasukuThreads(session, app);

  const [draft, setDraft] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const askGuide = getAskGuide(app.code);
  const userInitials = initials(userName);

  const scrollToLatest = (smooth = false) => {
    messagesEndRef.current?.scrollIntoView({
      behavior: smooth ? "smooth" : "auto",
      block: "end",
    });
  };

  const resizeComposer = () => {
    const field = inputRef.current;
    if (!field) return;
    field.style.height = "auto";
    const styles = window.getComputedStyle(field);
    const maxHeight = Number.parseFloat(styles.maxHeight) || 240;
    const next = Math.min(field.scrollHeight, maxHeight);
    field.style.height = `${next}px`;
    field.style.overflowY = field.scrollHeight > maxHeight ? "auto" : "hidden";
  };

  useEffect(() => {
    if (open) {
      const id = window.setTimeout(() => {
        inputRef.current?.focus();
        resizeComposer();
      }, 120);
      return () => window.clearTimeout(id);
    }
    return undefined;
  }, [open, app.code, activeThread?.id]);

  useEffect(() => {
    resizeComposer();
  }, [draft]);

  useEffect(() => {
    scrollToLatest(true);
  }, [activeThread?.messages, sending, loadingMessages]);

  if (!open) return null;

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || sending || !activeThread) return;
    setDraft("");
    await send(text);
  };

  return (
    <div className="acmis-copilot-panel" role="dialog" aria-label="EGP 2.0 KASUKU">
      <div className="acmis-copilot-header">
        <div className="acmis-copilot-brand">
          <div className="acmis-copilot-avatar">
            <KasukuMark />
          </div>
          <div>
            <h2 className="acmis-copilot-title">EGP 2.0 KASUKU</h2>
            <p className="acmis-copilot-subtitle">Ask Kasuku.</p>
            <span className="acmis-copilot-app-chip" title={app.title}>
              {app.short_name || app.title}
            </span>
          </div>
        </div>
        <div className="acmis-copilot-header-actions">
          <button
            type="button"
            className="acmis-copilot-icon-btn"
            onClick={() => {
              setStreamingId(null);
              startNewThread();
            }}
            aria-label="Start new thread"
            title="New thread"
          >
            +
          </button>
          <KasukuAskGuide guide={askGuide} />
          <button
            type="button"
            className="acmis-copilot-icon-btn"
            onClick={onClose}
            aria-label="Close Kasuku"
            title="Close"
          >
            ×
          </button>
        </div>
      </div>

      <div className="acmis-copilot-body">
        <aside className="acmis-copilot-threads">
          <div className="acmis-copilot-threads-head">
            <button
              type="button"
              className="acmis-copilot-new-thread"
              onClick={() => {
                setStreamingId(null);
                startNewThread();
              }}
            >
              + New thread
            </button>
          </div>
          <div className="acmis-copilot-thread-list">
            {loadingThreads ? (
              <div className="acmis-copilot-threads-loading">Loading…</div>
            ) : (
              threads.map((thread) => (
                <div
                  key={String(thread.id)}
                  className={`acmis-copilot-thread-item ${
                    thread.id === activeThread?.id ? "is-active" : ""
                  }`}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setStreamingId(null);
                    void selectThread(thread.id);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setStreamingId(null);
                      void selectThread(thread.id);
                    }
                  }}
                >
                  <span className="acmis-copilot-thread-title">{thread.title}</span>
                  <span className="acmis-copilot-thread-meta">
                    {thread.isDraft ? "Draft" : formatThreadTime(thread.updated_at)}
                  </span>
                  {(threads.length > 1 || !thread.isDraft) && (
                    <button
                      type="button"
                      className="acmis-copilot-icon-btn"
                      style={{ marginTop: 4, width: 24, height: 24 }}
                      onClick={(event) => {
                        event.stopPropagation();
                        void removeThread(thread.id);
                      }}
                      aria-label="Delete thread"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </aside>

        <section className="acmis-copilot-chat">
          <div className="acmis-copilot-messages">
            {error && !(activeThread?.messages || []).length ? (
              <div className="acmis-copilot-banner">{error}</div>
            ) : null}

            {loadingMessages ? (
              <div className="acmis-copilot-empty">Loading thread…</div>
            ) : !(activeThread?.messages || []).length && !sending ? (
              <div className="acmis-copilot-empty">
                <strong>Start a conversation</strong>
                Ask anything about {app.short_name || app.title}. Your first question becomes the
                thread title.
              </div>
            ) : (
              (activeThread?.messages || []).map((message) => {
                const isUser = message.role === "user";
                const isError = message.role === "error";
                return (
                  <div
                    key={String(message.id || message.content)}
                    className={`acmis-copilot-msg ${
                      isUser ? "is-user" : isError ? "is-assistant is-error" : "is-assistant"
                    }`}
                  >
                    <div className="acmis-copilot-msg-row">
                      {!isUser ? <KasukuMark className="acmis-copilot-face" alt="Kasuku" /> : null}
                      {message.role === "assistant" ? (
                        <StreamBubble
                          content={message.content}
                          streaming={streamingId === message.id}
                          onProgress={() => scrollToLatest(false)}
                          onDone={() => {
                            setStreamingId((current) =>
                              current === message.id ? null : current,
                            );
                          }}
                        />
                      ) : (
                        <div className="acmis-copilot-bubble">{message.content}</div>
                      )}
                      {isUser ? (
                        <span
                          className="acmis-copilot-face acmis-copilot-initials"
                          aria-label={userName}
                          title={userName}
                        >
                          {userInitials}
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}

            {sending ? (
              <div className="acmis-copilot-msg is-assistant">
                <div className="acmis-copilot-msg-row">
                  <KasukuMark className="acmis-copilot-face" alt="Kasuku" />
                  <div className="acmis-copilot-typing" aria-label="Kasuku is typing">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              </div>
            ) : null}
            <div ref={messagesEndRef} />
          </div>

          <div className="acmis-copilot-composer">
            <textarea
              ref={inputRef}
              className="acmis-copilot-input"
              placeholder="Message Kasuku…"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void handleSend();
                }
              }}
              rows={1}
              disabled={sending}
              aria-label="Message Kasuku"
            />
            <button
              type="button"
              className="acmis-copilot-send"
              onClick={() => void handleSend()}
              disabled={sending || !draft.trim() || !session}
              aria-label="Send message"
            >
              ➤
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
