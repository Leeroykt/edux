import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/server/auth/authMiddleware";
import { db } from "@/server/db/store";
import { ownSentence } from "@/server/auth/access";
import { modelConnector } from "@/server/models/modelConnector";
import { DbSuggestion } from "@/server/db/schema";
import { keepsEquations } from "@/lib/equations";

/** Cached suggestions for a sentence, if any. Never calls the model. */
export async function GET(
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

  return NextResponse.json(await db.findSuggestionsBySentenceId(id));
}

/** Generates fresh rewrite candidates using the sentence's paragraph as context. */
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
  if (sentence.locked) {
    return NextResponse.json(
      { error: { code: "LOCKED", message: "This sentence is locked and cannot be rewritten." } },
      { status: 409 }
    );
  }

  let options: any = {};
  try {
    options = await req.json();
  } catch {
    // optional body
  }

  const siblings = (await db.findSentencesByDocumentId(sentence.documentId))
    .filter((s) => s.nodeId === sentence.nodeId)
    .map((s) => s.text);

  const candidates = await modelConnector.generateRewrites({
    sentenceId: id,
    text: sentence.text,
    contextParagraph: siblings.join(" "),
    tone: options.tone,
    strength: options.strength,
    dialect: options.dialect === "en-US" ? "en-US" : options.dialect === "en-GB" ? "en-GB" : undefined,
  });

  // A rewrite that loses an equation would change the paper's meaning, so it is never offered.
  const rows: DbSuggestion[] = candidates
    .filter((c) => keepsEquations(sentence.text, c.text))
    .map((c) => ({
    id: c.id,
    sentenceId: id,
    modelVersion: c.engine === "model" ? process.env.MODEL_VERSION || "model-service" : "reference-heuristic",
    text: c.text,
    strategy: c.strategy,
    meaningScore: c.meaningScore,
    scoreDelta: c.scoreDelta,
    plainExplanation: c.plainExplanation,
    lockedTokensPreserved: true,
    engine: c.engine,
  }));
  await db.replaceSuggestions(id, rows);

  return NextResponse.json(rows);
}
