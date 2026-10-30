import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "../../../../../server/auth/authMiddleware";
import { db } from "../../../../../server/db/store";
import { modelConnector } from "../../../../../server/models/modelConnector";
import { DbDocument, DbDocumentNode, DbSentence, DbSentenceScore, DbSuggestion } from "../../../../../server/db/schema";

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if ("error" in auth) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: auth.error } }, { status: auth.status });
  }

  const { user } = auth;
  const docs = await db.findDocumentsByOwner(user.id);
  return NextResponse.json({ documents: docs });
}

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

    const docId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const versionId = "v_01";

    let totalWords = 0;
    const dbNodes: DbDocumentNode[] = [];
    const dbSentences: DbSentence[] = [];
    const rawSentencesForScoring: { id: string; text: string }[] = [];

    paragraphs.forEach((p: any, pIdx: number) => {
      const nodeId = `node_${docId}_${pIdx + 1}`;
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
          const sText = s.text || "";
          totalWords += sText.split(/\s+/).filter(Boolean).length;
          const sentenceId = s.id || `s_${docId}_${pIdx}_${sIdx}`;

          dbSentences.push({
            id: sentenceId,
            nodeId,
            documentId: docId,
            paragraphIndex: pIdx,
            text: sText,
            charStart: s.charStart || 0,
            charEnd: s.charEnd || sText.length,
            locked: !!s.locked,
            ignored: !!s.ignored,
          });

          rawSentencesForScoring.push({ id: sentenceId, text: sText });
        });
      }
    });

    const calculatedPages = Math.max(1, Math.ceil(totalWords / 320));

    // Run AI detection (connects to friend's model server or fallback)
    const scoresOutput = await modelConnector.detectSentences({
      documentId: docId,
      sentences: rawSentencesForScoring,
    });

    const dbScores: DbSentenceScore[] = scoresOutput.map((sc) => ({
      id: `sc_${sc.sentenceId}`,
      sentenceId: sc.sentenceId,
      modelVersion: "v1.2-ensemble",
      score: sc.score,
      band: sc.band,
      confidence: sc.confidence,
      reasons: sc.reasons,
      modelDetails: sc.modelDetails,
    }));

    // Pre-generate suggestions for flagged sentences
    const dbSuggestions: DbSuggestion[] = [];
    for (const sc of scoresOutput) {
      if (sc.score >= 0.45) {
        const sentenceObj = rawSentencesForScoring.find((s) => s.id === sc.sentenceId);
        if (sentenceObj) {
          const rewrites = await modelConnector.generateRewrites({
            sentenceId: sentenceObj.id,
            text: sentenceObj.text,
          });
          rewrites.forEach((rw) => {
            dbSuggestions.push({
              id: rw.id,
              sentenceId: rw.sentenceId,
              modelVersion: "qwen-academic-lora-v2",
              text: rw.text,
              strategy: rw.strategy,
              meaningScore: rw.meaningScore,
              scoreDelta: rw.scoreDelta,
              plainExplanation: rw.plainExplanation,
              lockedTokensPreserved: true,
            });
          });
        }
      }
    }

    // Save structure & scores into store
    await db.saveDocumentStructure(docId, dbNodes, dbSentences, dbScores, dbSuggestions);

    // Compute overall AI score
    const avgAiScore =
      dbScores.length > 0
        ? Number((dbScores.reduce((acc, s) => acc + s.score, 0) / dbScores.length).toFixed(2))
        : 0.15;

    const newDoc: DbDocument = {
      id: docId,
      ownerId: user.id,
      folderId,
      title,
      status: "ready",
      stage: "uploaded",
      currentVersionId: versionId,
      ownerDeclaredOwn,
      wordCount: totalWords,
      pageCount: calculatedPages,
      overallAiScore: avgAiScore,
      similarityScore: 12,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.createDocument(newDoc);
    await db.incrementUsage(user.id, totalWords, 0);

    return NextResponse.json({ document: newDoc }, { status: 201 });
  } catch (err: any) {
    console.error("Document creation error:", err);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to process document." } },
      { status: 500 }
    );
  }
}
