import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/server/auth/authMiddleware";
import { db } from "@/server/db/store";
import { DocumentParagraphNode, DocumentSentence } from "@edux/schema";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(req);
  if ("error" in auth) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: auth.error } }, { status: auth.status });
  }

  const { id } = await params;
  const doc = await db.findDocumentById(id);
  if (!doc) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Document not found." } }, { status: 404 });
  }

  const nodes = await db.findNodesByDocumentId(id);
  const sentences = await db.findSentencesByDocumentId(id);

  // Group sentences by nodeId
  const sentencesByNode: Record<string, DocumentSentence[]> = {};
  for (const s of sentences) {
    const score = await db.findScoresBySentenceId(s.id);
    const sentenceObj: DocumentSentence = {
      id: s.id,
      nodeId: s.nodeId,
      paragraphIndex: s.paragraphIndex,
      text: s.text,
      charStart: s.charStart,
      charEnd: s.charEnd,
      locked: s.locked,
      ignored: s.ignored,
      score: score
        ? {
            sentenceId: s.id,
            score: score.score,
            band: score.band,
            confidence: score.confidence,
            reasons: score.reasons,
            modelDetails: score.modelDetails,
          }
        : undefined,
    };

    if (!sentencesByNode[s.nodeId]) {
      sentencesByNode[s.nodeId] = [];
    }
    sentencesByNode[s.nodeId].push(sentenceObj);
  }

  const structure: DocumentParagraphNode[] = nodes.map((n) => ({
    id: n.id,
    documentId: n.documentId,
    type: n.type,
    styleName: n.styleName,
    orderNo: n.orderNo,
    sentences: sentencesByNode[n.id] || [],
  }));

  // Fetch suggestions map
  const suggestionsMap: Record<string, any[]> = {};
  for (const s of sentences) {
    const suggs = await db.findSuggestionsBySentenceId(s.id);
    if (suggs.length > 0) {
      suggestionsMap[s.id] = suggs;
    }
  }

  return NextResponse.json({
    documentId: id,
    paragraphs: structure,
    suggestionsMap,
  });
}
