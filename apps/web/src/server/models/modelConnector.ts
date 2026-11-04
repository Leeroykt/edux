import { ScoreBand, ReasonChip, RewriteStrategy, ScoreEngine } from "@edux/schema";
import { convertSpelling, Dialect } from "@/lib/dialect";

export interface DetectionModelInput {
  documentId: string;
  sentences: { id: string; text: string }[];
}

export interface DetectionModelOutput {
  sentenceId: string;
  score: number; // 0.0 to 1.0
  band: ScoreBand;
  confidence: number;
  reasons: ReasonChip[];
  engine: ScoreEngine;
  modelDetails?: {
    perplexityScore?: number;
    burstinessScore?: number;
    stylometricDelta?: number;
  };
}

export interface RewriteModelInput {
  sentenceId: string;
  text: string;
  contextParagraph?: string;
  tone?: string;
  strength?: string;
  /** Spelling variant the rewrite must be written in. */
  dialect?: Dialect;
}

export interface RewriteModelOutput {
  id: string;
  sentenceId: string;
  text: string;
  strategy: RewriteStrategy;
  meaningScore: number;
  scoreDelta: number;
  plainExplanation: string;
  engine: ScoreEngine;
}

const ALLOWED_REASONS: ReasonChip[] = [
  "uniform_rhythm",
  "generic_phrasing",
  "stock_transitions",
  "low_specificity",
  "repetitive_openers",
  "academic_formulaic",
  "repetitive_structure",
  "cliche_collocations",
  "unnatural_symmetry",
];

const ALLOWED_STRATEGIES: RewriteStrategy[] = [
  "restructure",
  "vary_rhythm",
  "replace_generic",
  "plain_phrasing",
  "split",
  "merge",
  "academic_tone",
  "scholarly_hedging",
];

/** Sentences per request sent to the model service. */
const DETECT_BATCH_SIZE = Number(process.env.MODEL_DETECT_BATCH || 24);
/** Parallel batches in flight at once. */
const DETECT_CONCURRENCY = Number(process.env.MODEL_DETECT_CONCURRENCY || 2);
const MIN_SCORED_WORDS = 8;

function serviceUrl(): string | null {
  const url = process.env.MODEL_SERVICE_URL?.trim().replace(/\/+$/, "");
  return url || null;
}

function timeoutMs(): number {
  return Number(process.env.MODEL_TIMEOUT_MS || 30000);
}

function serviceHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    // Free tunnels (ngrok) otherwise answer with an HTML interstitial page.
    "ngrok-skip-browser-warning": "1",
  };
  const token = process.env.MODEL_SERVICE_TOKEN?.trim();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function bandFor(score: number): ScoreBand {
  return score >= 0.6 ? "likely_machine" : score >= 0.3 ? "uncertain" : "likely_human";
}

function clamp(n: unknown, lo: number, hi: number, fallback: number): number {
  const v = typeof n === "number" && Number.isFinite(n) ? n : fallback;
  return Math.min(hi, Math.max(lo, v));
}

export function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

/** True when a sentence has too little signal to be scored on its own. */
export function isScorable(text: string): boolean {
  return wordCount(text) >= MIN_SCORED_WORDS;
}

async function postJson(path: string, body: unknown): Promise<any> {
  const base = serviceUrl();
  if (!base) throw new Error("MODEL_SERVICE_URL is not set");
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: serviceHeaders(),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs()),
  });
  if (!res.ok) throw new Error(`Model service ${path} answered ${res.status}`);
  return res.json();
}

function normaliseDetection(raw: any, engine: ScoreEngine): DetectionModelOutput | null {
  if (!raw || typeof raw.sentenceId !== "string") return null;
  const score = clamp(raw.score, 0, 1, 0);
  return {
    sentenceId: raw.sentenceId,
    score,
    band: bandFor(score),
    confidence: clamp(raw.confidence, 0, 1, 0.5),
    reasons: Array.isArray(raw.reasons)
      ? raw.reasons.filter((r: any): r is ReasonChip => ALLOWED_REASONS.includes(r))
      : [],
    engine,
    modelDetails: raw.modelDetails && typeof raw.modelDetails === "object" ? raw.modelDetails : undefined,
  };
}

function referenceDetect(sentences: { id: string; text: string }[]): DetectionModelOutput[] {
  return sentences.map((s) => {
    const text = s.text;
    const hasGenericStock =
      /furthermore|moreover|in conclusion|delve|testament|crucial|pivotal|landscape|it is essential to note/i.test(text);
    const isLongUniform = wordCount(text) > 22;
    // Length alone is not evidence of machine writing, so it never raises the score.
    const score = hasGenericStock ? 0.78 : isLongUniform ? 0.2 : 0.08;

    const reasons: ReasonChip[] = [];
    if (hasGenericStock) reasons.push("stock_transitions", "generic_phrasing");
    if (isLongUniform) reasons.push("uniform_rhythm");

    return {
      sentenceId: s.id,
      score,
      band: bandFor(score),
      confidence: 0.4,
      reasons,
      engine: "reference" as const,
    };
  });
}

export interface ConnectorStatus {
  configured: boolean;
  url: string | null;
  reachable: boolean | null;
  lastError: string | null;
  lastOkAt: string | null;
}

export class ModelConnector {
  private lastError: string | null = null;
  private lastOkAt: string | null = null;

  private markOk() {
    this.lastError = null;
    this.lastOkAt = new Date().toISOString();
  }

  private markFail(err: unknown) {
    this.lastError = err instanceof Error ? err.message : String(err);
    console.warn("Model service call failed, using reference engine:", this.lastError);
  }

  status(): ConnectorStatus {
    const url = serviceUrl();
    return {
      configured: !!url,
      url,
      reachable: url ? (this.lastError ? false : this.lastOkAt ? true : null) : null,
      lastError: this.lastError,
      lastOkAt: this.lastOkAt,
    };
  }

  /** Checks the remote service right now (used by the status endpoint). */
  async ping(): Promise<boolean> {
    const base = serviceUrl();
    if (!base) return false;
    try {
      const res = await fetch(`${base}/v1/health`, {
        headers: serviceHeaders(),
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        this.markOk();
        return true;
      }
      this.markFail(new Error(`health answered ${res.status}`));
    } catch (err) {
      this.markFail(err);
    }
    return false;
  }

  /**
   * Scores sentences. Short sentences (under 8 words) are not scored on their
   * own and are left out of the result. Sentences go to the model service in
   * batches with limited concurrency. A failed batch falls back to the
   * reference engine and says so in each score's `engine` field.
   * `onBatch` fires as each batch finishes so callers can stream results.
   */
  async detectSentences(
    input: DetectionModelInput,
    onBatch?: (batch: DetectionModelOutput[]) => void | Promise<void>
  ): Promise<DetectionModelOutput[]> {
    const scorable = input.sentences.filter((s) => isScorable(s.text));
    const batches: { id: string; text: string }[][] = [];
    for (let i = 0; i < scorable.length; i += DETECT_BATCH_SIZE) {
      batches.push(scorable.slice(i, i + DETECT_BATCH_SIZE));
    }

    const results: DetectionModelOutput[] = [];
    let next = 0;

    const runBatch = async (batch: { id: string; text: string }[]) => {
      let out: DetectionModelOutput[] | null = null;
      if (serviceUrl()) {
        try {
          const raw = await postJson("/v1/detect", { documentId: input.documentId, sentences: batch });
          const list = Array.isArray(raw) ? raw : Array.isArray(raw?.scores) ? raw.scores : [];
          const parsed = list
            .map((r: any) => normaliseDetection(r, "model"))
            .filter((r: DetectionModelOutput | null): r is DetectionModelOutput => r !== null);
          const returned = new Set(parsed.map((p: DetectionModelOutput) => p.sentenceId));
          const missing = batch.filter((s) => !returned.has(s.id));
          out = [...parsed, ...referenceDetect(missing)];
          this.markOk();
        } catch (err) {
          this.markFail(err);
        }
      }
      if (!out) out = referenceDetect(batch);
      results.push(...out);
      if (onBatch) await onBatch(out);
    };

    const worker = async () => {
      while (next < batches.length) {
        const mine = batches[next++];
        await runBatch(mine);
      }
    };

    await Promise.all(Array.from({ length: Math.min(DETECT_CONCURRENCY, batches.length) }, worker));
    return results;
  }

  /** Produces rewrite candidates for one sentence, spelt in the writer's English variant. */
  async generateRewrites(input: RewriteModelInput): Promise<RewriteModelOutput[]> {
    const out = await this.rewriteRaw(input);
    if (!input.dialect) return out;
    const dialect = input.dialect;
    return out.map((c) => ({ ...c, text: convertSpelling(c.text, dialect).text }));
  }

  private async rewriteRaw(input: RewriteModelInput): Promise<RewriteModelOutput[]> {
    if (serviceUrl()) {
      try {
        const raw = await postJson("/v1/rewrite", input);
        const list = Array.isArray(raw) ? raw : Array.isArray(raw?.suggestions) ? raw.suggestions : [];
        const parsed: RewriteModelOutput[] = list
          .filter((r: any) => r && typeof r.text === "string" && r.text.trim().length > 0)
          .slice(0, 4)
          .map((r: any, i: number) => ({
            id: typeof r.id === "string" ? r.id : `sug_${input.sentenceId}_${i + 1}`,
            sentenceId: input.sentenceId,
            text: r.text,
            strategy: ALLOWED_STRATEGIES.includes(r.strategy) ? r.strategy : "plain_phrasing",
            meaningScore: Math.round(clamp(r.meaningScore, 0, 100, 0)),
            scoreDelta: Math.round(clamp(r.scoreDelta, -100, 100, 0)),
            plainExplanation: typeof r.plainExplanation === "string" ? r.plainExplanation : "",
            engine: "model" as const,
          }));
        if (parsed.length > 0) {
          this.markOk();
          return parsed;
        }
      } catch (err) {
        this.markFail(err);
      }
    }

    const clean = input.text.replace(
      /furthermore|moreover|in conclusion|delve|testament|crucial|pivotal|landscape/gi,
      (match) => {
        const lower = match.toLowerCase();
        const swap =
          lower === "furthermore" ? "specifically"
          : lower === "moreover" ? "in addition"
          : lower === "crucial" ? "essential"
          : lower === "pivotal" ? "central"
          : lower === "landscape" ? "field"
          : lower === "delve" ? "examine"
          : "clear";
        // Keep the capital when the original word opened a sentence.
        return match[0] === match[0].toUpperCase() ? swap[0].toUpperCase() + swap.slice(1) : swap;
      }
    );
    if (clean === input.text) return [];

    return [
      {
        id: `sug_${input.sentenceId}_ref1`,
        sentenceId: input.sentenceId,
        text: clean,
        strategy: "plain_phrasing",
        meaningScore: 0,
        scoreDelta: 0,
        plainExplanation:
          "Reference engine: swapped a stock phrase for a plainer one. Connect the model service for checked rewrites.",
        engine: "reference",
      },
    ];
  }
}

export const modelConnector = new ModelConnector();
