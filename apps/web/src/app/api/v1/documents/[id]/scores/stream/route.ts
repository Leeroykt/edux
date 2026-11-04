import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/server/auth/authMiddleware";
import { ownDocument } from "@/server/auth/access";
import { db } from "@/server/db/store";
import { getScan } from "@/server/jobs/scoring";

export const dynamic = "force-dynamic";

/**
 * Pushes scoring progress as it happens over one open connection (server-sent
 * events), so the browser does not have to keep asking. `?after=N` resumes from
 * the scores the client already has.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(req);
  if ("error" in auth) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: auth.error } }, { status: auth.status });
  }

  const { id } = await params;
  const doc = await ownDocument(auth.user, id);
  if (!doc) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Document not found." } }, { status: 404 });
  }

  let cursor = Math.max(0, Number(req.nextUrl.searchParams.get("after")) || 0);
  const encoder = new TextEncoder();
  const toScore = (s: { sentenceId: string; score: number; band: any; confidence: number; reasons: any; engine?: any; modelDetails?: any }) => ({
    sentenceId: s.sentenceId,
    score: s.score,
    band: s.band,
    confidence: s.confidence,
    reasons: s.reasons,
    engine: s.engine,
    modelDetails: s.modelDetails,
  });

  const stream = new ReadableStream({
    async start(controller) {
      const send = (payload: unknown) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      const started = Date.now();
      let lastDone = -1;
      let lastBeat = Date.now();

      try {
        while (!req.signal.aborted && Date.now() - started < 10 * 60_000) {
          const scan = getScan(id);

          if (!scan) {
            // Nothing running here (finished earlier, or the server restarted): send what is stored.
            const rows = cursor === 0 ? await db.findScoresByDocumentId(id) : [];
            send({ status: "done", total: rows.length, done: rows.length, cursor: cursor === 0 ? rows.length : cursor, scores: rows.map(toScore) });
            break;
          }

          const rows = scan.log.slice(cursor);
          if (rows.length > 0 || scan.done !== lastDone || scan.status !== "running") {
            cursor = scan.log.length;
            lastDone = scan.done;
            send({ status: scan.status, total: scan.total, done: scan.done, error: scan.error, cursor, scores: rows.map(toScore) });
          } else if (Date.now() - lastBeat > 15_000) {
            controller.enqueue(encoder.encode(": keep-alive\n\n"));
            lastBeat = Date.now();
          }

          if (scan.status !== "running") break;
          // This wait is inside the server, not a network request.
          await new Promise((r) => setTimeout(r, 350));
        }
      } catch {
        // client went away
      } finally {
        try {
          controller.close();
        } catch {
          // already closed
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
