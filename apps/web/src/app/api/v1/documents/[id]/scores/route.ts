import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/server/auth/authMiddleware";
import { db } from "@/server/db/store";
import { ownDocument } from "@/server/auth/access";
import { getScan } from "@/server/jobs/scoring";

/**
 * Progress and scores for a document. `?after=N` returns only the scores
 * produced since the client last asked, so polling stays cheap on long papers.
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

  const after = Math.max(0, Number(req.nextUrl.searchParams.get("after")) || 0);
  const scan = getScan(id);

  let rows;
  let cursor: number;
  if (scan) {
    rows = scan.log.slice(after);
    cursor = scan.log.length;
  } else {
    // No live scan (finished before a restart): hand back what is stored.
    rows = after === 0 ? await db.findScoresByDocumentId(id) : [];
    cursor = after === 0 ? rows.length : after;
  }

  return NextResponse.json({
    documentId: id,
    status: scan ? scan.status : doc.status === "scanning" ? "failed" : "done",
    total: scan?.total ?? doc.scanTotal ?? rows.length,
    done: scan?.done ?? doc.scanDone ?? rows.length,
    error: scan?.error,
    cursor,
    overallAiScore: doc.overallAiScore,
    scores: rows.map((s) => ({
      sentenceId: s.sentenceId,
      score: s.score,
      band: s.band,
      confidence: s.confidence,
      reasons: s.reasons,
      engine: s.engine,
      modelDetails: s.modelDetails,
    })),
  });
}
