import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/server/auth/authMiddleware";
import { db } from "@/server/db/store";
import { startScan } from "@/server/jobs/scoring";
import { DbDocument, DbDocumentNode, DbSentence } from "@/server/db/schema";

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if ("error" in auth) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: auth.error } }, { status: auth.status });
  }

  const { user } = auth;
  const docs = await db.findDocumentsByOwner(user.id);
  return NextResponse.json({ documents: docs });
}

const CLIENT_ID = /^[A-Za-z0-9_-]{4,64}$/;

/**
 * Stores the parsed document and returns straight away. Scoring runs in the
 * background; clients follow it through GET /documents/:id/scores.
 */
export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if ("error" in auth) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: auth.error } }, { status: auth.status });
  }

  const { user } = auth;

  try {
    const body = await req.json();
    const { title, paragraphs, folderId, ownerDeclaredOwn = true } = body;

    if (!title || !paragraphs || !Array.isArray(paragraphs)) {
      return NextResponse.json(
        { error: { code: "INVALID_DOCUMENT", message: "Title and paragraphs array are required." } },
        { status: 422 }
      );
    }

    const wanted = typeof body.id === "string" && CLIENT_ID.test(body.id) ? body.id : null;
    if (wanted && (await db.findDocumentById(wanted))) {
      return NextResponse.json(
        { error: { code: "CONFLICT", message: "A document with this id already exists." } },
        { status: 409 }
      );
    }
    const docId = wanted ?? `doc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const versionId = "v_01";

    let totalWords = 0;
    const dbNodes: DbDocumentNode[] = [];
    const dbSentences: DbSentence[] = [];

    paragraphs.forEach((p: any, pIdx: number) => {
      const nodeId = typeof p.id === "string" ? p.id : `node_${docId}_${pIdx + 1}`;
      dbNodes.push({
        id: nodeId,
        documentId: docId,
        versionId,
        type: p.type || "paragraph",
        styleName: p.styleName || "Body Text",
        orderNo: pIdx + 1,
      });

      if (Array.isArray(p.sentences)) {
        p.sentences.forEach((s: any, sIdx: number) => {
          const sText = typeof s.text === "string" ? s.text : "";
          totalWords += sText.split(/\s+/).filter(Boolean).length;
          // Headings and quotations are not scored on their own.
          const skip = p.type === "heading" || p.type === "blockquote";

          dbSentences.push({
            id: s.id || `s_${docId}_${pIdx}_${sIdx}`,
            nodeId,
            documentId: docId,
            paragraphIndex: pIdx,
            text: sText,
            charStart: s.charStart || 0,
            charEnd: s.charEnd || sText.length,
            locked: !!s.locked,
            ignored: !!s.ignored || skip,
          });
        });
      }
    });

    await db.saveDocumentStructure(docId, dbNodes, dbSentences);

    const now = new Date().toISOString();
    const newDoc: DbDocument = {
      id: docId,
      ownerId: user.id,
      folderId,
      title,
      status: "scanning",
      stage: "uploaded",
      currentVersionId: versionId,
      ownerDeclaredOwn,
      wordCount: totalWords,
      pageCount: Math.max(1, Math.ceil(totalWords / 320)),
      overallAiScore: 0,
      similarityScore: 0,
      createdAt: now,
      updatedAt: now,
    };

    await db.createDocument(newDoc);
    await db.incrementUsage(user.id, totalWords, 0);
    startScan(docId);

    return NextResponse.json({ document: newDoc }, { status: 201 });
  } catch (err: any) {
    console.error("Document creation error:", err);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to process document." } },
      { status: 500 }
    );
  }
}
