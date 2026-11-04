"use client";

import { useEffect, useRef, useState } from "react";
import { SentenceScore } from "@edux/schema";
import { apiClient, ScanProgress } from "../services/api/apiClient";

export interface ScanView {
  status: "idle" | "running" | "done" | "failed";
  done: number;
  total: number;
  error?: string;
}

const IDLE: ScanView = { status: "idle", done: 0, total: 0 };

interface Options {
  /** Document to follow. Pass null to stay idle. */
  documentId: string | null;
  /** Bump to follow a fresh scan of the same document. */
  runKey: number;
  /** Called whenever new scores arrive. */
  onScores: (scores: SentenceScore[]) => void;
  /** Called when the server no longer knows the document. Return true if it was re-created. */
  onMissing?: () => Promise<boolean>;
}

/**
 * Follows a background scan. Progress is pushed over one open stream, so the
 * browser makes a single request instead of asking again and again. If the
 * stream cannot be opened, or drops before the scan ends, it falls back to
 * asking at a relaxed pace.
 */
export function useScan({ documentId, runKey, onScores, onMissing }: Options): ScanView {
  const [view, setView] = useState<ScanView>(IDLE);
  const onScoresRef = useRef(onScores);
  const onMissingRef = useRef(onMissing);
  onScoresRef.current = onScores;
  onMissingRef.current = onMissing;

  useEffect(() => {
    if (!documentId) {
      setView(IDLE);
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const controller = new AbortController();
    let cursor = 0;
    let finished = false;
    let recreated = false;

    setView({ status: "running", done: 0, total: 0 });

    /** Applies one progress message. Returns true when the scan has ended. */
    const apply = (p: ScanProgress): boolean => {
      if (p.scores.length > 0) onScoresRef.current(p.scores);
      cursor = Math.max(cursor, p.cursor);
      if (p.status === "running") {
        setView({ status: "running", done: p.done, total: p.total });
        return false;
      }
      finished = true;
      setView(
        p.status === "failed"
          ? { status: "failed", done: p.done, total: p.total, error: p.error }
          : { status: "done", done: p.total, total: p.total }
      );
      return true;
    };

    const missing = async (): Promise<boolean> => {
      if (!recreated && onMissingRef.current) {
        recreated = true;
        if (await onMissingRef.current()) return true;
      }
      setView({ status: "failed", done: 0, total: 0, error: "The server no longer has this document." });
      return false;
    };

    // Fallback: ask at a relaxed pace, slowing down while nothing changes.
    let idleRounds = 0;
    let failures = 0;
    const poll = async () => {
      if (cancelled || finished) return;
      if (typeof document !== "undefined" && document.hidden) {
        timer = setTimeout(poll, 3000);
        return;
      }
      const res = await apiClient.getScanProgress(documentId, cursor);
      if (cancelled) return;

      if (res === "missing") {
        if (await missing()) timer = setTimeout(run, 400);
        return;
      }
      if (!res) {
        failures += 1;
        if (failures >= 5) {
          setView((v) => ({ ...v, status: "failed", error: "Lost connection to the server." }));
          return;
        }
        timer = setTimeout(poll, Math.min(1500 * 2 ** failures, 15000));
        return;
      }
      failures = 0;
      idleRounds = res.scores.length > 0 ? 0 : idleRounds + 1;
      if (!apply(res)) timer = setTimeout(poll, Math.min(1500 + idleRounds * 750, 6000));
    };

    const run = async () => {
      if (cancelled) return;
      const result = await apiClient.streamScan(documentId, cursor, apply, controller.signal);
      if (cancelled || finished) return;

      if (result === "missing") {
        if (await missing()) timer = setTimeout(run, 400);
        return;
      }
      // The stream could not be opened or ended early: carry on by asking.
      void poll();
    };

    void run();

    return () => {
      cancelled = true;
      controller.abort();
      if (timer) clearTimeout(timer);
    };
  }, [documentId, runKey]);

  return view;
}
