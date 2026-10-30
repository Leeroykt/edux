import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/server/auth/authMiddleware";
import { db } from "@/server/db/store";

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

  const report = {
    id: `rep_${id}`,
    documentId: id,
    overallPercentage: doc.similarityScore || 16,
    aiLikelihoodBand: (doc.overallAiScore || 0.38) > 0.6 ? "likely_machine" : "uncertain",
    poolsSearched: ["open_scholarly", "web_index", "edux_repository"],
    exclusionsApplied: {
      excludeQuotes: true,
      excludeBibliography: true,
      excludeSmallMatches: true,
    },
    matches: [
      {
        id: "match_01",
        sentenceId: "s_02",
        sourceId: "src_01",
        similarityScore: 92,
        matchedLength: 124,
      },
      {
        id: "match_02",
        sentenceId: "s_04",
        sourceId: "src_02",
        similarityScore: 84,
        matchedLength: 88,
      },
    ],
    matchedSources: [
      {
        id: "src_01",
        name: "Attention Is All You Need (arXiv:1706.03762)",
        sourcePool: "open_scholarly",
        url: "https://arxiv.org/abs/1706.03762",
        authors: "Vaswani, A., Shazeer, N., Parmar, N., et al.",
        publicationYear: 2017,
        matchPercentage: 9.2,
        matchedWordCount: 353,
      },
      {
        id: "src_02",
        name: "Journal of Educational Linguistics & Machine Writing",
        sourcePool: "web_index",
        url: "https://doi.org/10.1016/j.linged.2024.10129",
        authors: "Harrison, M. & Gallagher, S.",
        publicationYear: 2024,
        matchPercentage: 4.8,
        matchedWordCount: 184,
      },
      {
        id: "src_03",
        name: "Cross-Institutional Dissertation Index (UK Academic Database)",
        sourcePool: "edux_repository",
        matchPercentage: 2.0,
        matchedWordCount: 77,
      },
    ],
  };

  return NextResponse.json(report);
}
