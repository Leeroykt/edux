import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/server/auth/authMiddleware";
import { db } from "@/server/db/store";
import { ownSentence } from "@/server/auth/access";
import { modelConnector, isScorable } from "@/server/models/modelConnector";

/** Re-scores one sentence, optionally against new text (after a rewrite is applied). */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(req);
  if ("error" in auth) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: auth.error } }, { status: auth.status });
  }

  const { id } = await params;
  const sentence = await ownSentence(auth.user, id);
  if (!sentence) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Sentence not found." } }, { status: 404 });
  }

  let text = sentence.text;
  try {
    const body = await req.json();
    if (typeof body?.text === "string" && body.text.trim()) text = body.text;
  } catch {
    // body is optional
  }

  if (!isScorable(text)) {
    return NextResponse.json({ sentenceId: id, score: null, notScored: true });
  }

  const [result] = await modelConnector.detectSentences({
    documentId: sentence.documentId,
    sentences: [{ id, text }],
  });
  if (!result) {
    return NextResponse.json({ sentenceId: id, score: null, notScored: true });
  }

  await db.upsertScores([
    {
      id: `sc_${id}`,
      sentenceId: id,
      modelVersion: result.engine === "model" ? process.env.MODEL_VERSION || "model-service" : "reference-heuristic",
      score: result.score,
      band: result.band,
      confidence: result.confidence,
      reasons: result.reasons,
      engine: result.engine,
      modelDetails: result.modelDetails,
    },
  ]);

  return NextResponse.json({
    sentenceId: id,
    score: result.score,
    band: result.band,
    confidence: result.confidence,
    reasons: result.reasons,
    engine: result.engine,
    modelDetails: result.modelDetails,
  });
}
