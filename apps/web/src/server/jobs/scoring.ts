import { db } from "../db/store";
import { DbSentenceScore } from "../db/schema";
import { modelConnector, isScorable } from "../models/modelConnector";

export interface ScanState {
  documentId: string;
  status: "running" | "done" | "failed";
  total: number;
  done: number;
  startedAt: number;
  finishedAt?: number;
  error?: string;
  /** Scores in the order they were produced; clients read from a cursor. */
  log: DbSentenceScore[];
}

// Survives Next.js hot reloads so a running scan is not forgotten mid-flight.
const g = globalThis as unknown as { __eduxScans?: Map<string, ScanState> };
const scans = (g.__eduxScans ??= new Map<string, ScanState>());

export function getScan(documentId: string): ScanState | null {
  return scans.get(documentId) ?? null;
}

function toDbScore(modelVersion: string, sc: Awaited<ReturnType<typeof modelConnector.detectSentences>>[number]): DbSentenceScore {
  return {
    id: `sc_${sc.sentenceId}`,
    sentenceId: sc.sentenceId,
    modelVersion: sc.engine === "model" ? modelVersion : "reference-heuristic",
    score: sc.score,
    band: sc.band,
    confidence: sc.confidence,
    reasons: sc.reasons,
    engine: sc.engine,
    modelDetails: sc.modelDetails,
  };
}

/**
 * Scores every sentence of a document in the background. Returns at once; the
 * caller polls `getScan` and reads scores as they land in the store.
 */
export function startScan(documentId: string): ScanState {
  const existing = scans.get(documentId);
  if (existing && existing.status === "running") return existing;

  const state: ScanState = {
    documentId,
    status: "running",
    total: 0,
    done: 0,
    startedAt: Date.now(),
    log: [],
  };
  scans.set(documentId, state);

  void (async () => {
    try {
      const sentences = (await db.findSentencesByDocumentId(documentId)).filter(
        (s) => !s.ignored && !s.locked && isScorable(s.text)
      );
      state.total = sentences.length;
      await db.updateDocument(documentId, { status: "scanning", scanDone: 0, scanTotal: sentences.length });

      const version = process.env.MODEL_VERSION || "model-service";
      const results = await modelConnector.detectSentences(
        { documentId, sentences: sentences.map((s) => ({ id: s.id, text: s.text })) },
        async (batch) => {
          const rows = batch.map((b) => toDbScore(version, b));
          await db.upsertScores(rows);
          state.log.push(...rows);
          state.done += batch.length;
          await db.updateDocument(documentId, { scanDone: state.done });
        }
      );

      const all = await db.findScoresByDocumentId(documentId);
      const avg = all.length ? all.reduce((a, s) => a + s.score, 0) / all.length : 0;
      await db.updateDocument(documentId, {
        status: "ready",
        overallAiScore: Number(avg.toFixed(2)),
        scanDone: results.length,
      });
      state.status = "done";
    } catch (err: any) {
      state.status = "failed";
      state.error = err?.message || "Scan failed";
      await db.updateDocument(documentId, { status: "error" });
    } finally {
      state.finishedAt = Date.now();
    }
  })();

  return state;
}
