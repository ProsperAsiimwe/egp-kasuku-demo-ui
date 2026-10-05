import { useCallback, useEffect, useMemo, useState } from "react";
import {
  deleteThread,
  getThread,
  listThreads,
  sendChat,
  type ChatMessage,
  type ChatThread,
  type DemoSession,
} from "./api";
import type { KasukuApp } from "./apps";

function draftThread(): ChatThread {
  return {
    id: `draft_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    title: "New chat",
    updated_at: new Date().toISOString(),
    isDraft: true,
    messages: [],
  };
}

export function useKasukuThreads(session: DemoSession | null, app: KasukuApp) {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeId, setActiveId] = useState<number | string | null>(null);
  const [loadingThreads, setLoadingThreads] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamingId, setStreamingId] = useState<string | number | null>(null);

  const activeThread = useMemo(
    () => threads.find((row) => row.id === activeId) || threads[0] || null,
    [threads, activeId],
  );

  const load = useCallback(async () => {
    if (!session) return;
    setLoadingThreads(true);
    setError(null);
    try {
      const remote = await listThreads(session, app);
      if (remote.length) {
        setActiveId(remote[0].id);
        try {
          const full = await getThread(session, app, Number(remote[0].id));
          setThreads(
            remote.map((row) =>
              row.id === remote[0].id
                ? { ...row, ...full, messages: full.messages || [] }
                : row,
            ),
          );
        } catch {
          setThreads(remote);
        }
      } else {
        const draft = draftThread();
        setThreads([draft]);
        setActiveId(draft.id);
      }
    } catch (err) {
      const draft = draftThread();
      setThreads([draft]);
      setActiveId(draft.id);
      setError(err instanceof Error ? err.message : "Unable to load past threads.");
    } finally {
      setLoadingThreads(false);
    }
  }, [session, app]);

  useEffect(() => {
    void load();
  }, [load]);

  const startNewThread = useCallback(() => {
    const existing = threads.find((row) => row.isDraft);
    if (existing) {
      setActiveId(existing.id);
      return;
    }
    const draft = draftThread();
    setThreads((prev) => [draft, ...prev]);
    setActiveId(draft.id);
    setStreamingId(null);
  }, [threads]);

  const selectThread = useCallback(
    async (threadId: number | string) => {
      if (!session) return;
      setActiveId(threadId);
      const current = threads.find((row) => row.id === threadId);
      if (!current || current.isDraft || current.messages) return;
      setLoadingMessages(true);
      try {
        const full = await getThread(session, app, Number(threadId));
        setThreads((prev) =>
          prev.map((row) =>
            row.id === threadId ? { ...row, ...full, messages: full.messages || [] } : row,
          ),
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load the thread.");
      } finally {
        setLoadingMessages(false);
      }
    },
    [session, app, threads],
  );

  const removeThread = useCallback(
    async (threadId: number | string) => {
      const target = threads.find((row) => row.id === threadId);
      if (target?.isDraft) {
        const next = threads.filter((row) => row.id !== threadId);
        const fallback = next[0] || draftThread();
        setThreads(next.length ? next : [fallback]);
        setActiveId((next[0] || fallback).id);
        return;
      }
      if (!session) return;
      await deleteThread(session, app, Number(threadId));
      const next = threads.filter((row) => row.id !== threadId);
      if (!next.length) {
        const draft = draftThread();
        setThreads([draft]);
        setActiveId(draft.id);
        return;
      }
      setThreads(next);
      if (activeId === threadId) setActiveId(next[0].id);
    },
    [session, app, threads, activeId],
  );

  const send = useCallback(
    async (text: string) => {
      if (!session || !activeThread || sending) return;
      const localId = activeThread.id;
      const serverId = activeThread.isDraft ? null : Number(activeThread.id);
      const userMsg: ChatMessage = {
        id: `local_${Date.now()}`,
        role: "user",
        content: text,
      };
      setThreads((prev) =>
        prev.map((row) =>
          row.id === localId
            ? { ...row, messages: [...(row.messages || []), userMsg] }
            : row,
        ),
      );
      setSending(true);
      setError(null);
      try {
        const result = await sendChat(session, app, text, serverId);
        const assistantId = `msg_${Date.now()}_a`;
        setThreads((prev) => {
          const withoutDraft = prev.filter((row) => row.id !== localId);
          const next: ChatThread = {
            id: result.thread_id,
            title: result.title,
            updated_at: new Date().toISOString(),
            messages: [
              ...(activeThread.messages || []),
              userMsg,
              { id: assistantId, role: "assistant", content: result.reply },
            ],
          };
          return [next, ...withoutDraft.filter((row) => row.id !== result.thread_id)];
        });
        setActiveId(result.thread_id);
        setStreamingId(assistantId);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Kasuku could not answer.";
        setThreads((prev) =>
          prev.map((row) =>
            row.id === localId
              ? {
                  ...row,
                  messages: [
                    ...(row.messages || []),
                    { id: `err_${Date.now()}`, role: "error", content: message },
                  ],
                }
              : row,
          ),
        );
      } finally {
        setSending(false);
      }
    },
    [session, app, activeThread, sending],
  );

  return {
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
  };
}
