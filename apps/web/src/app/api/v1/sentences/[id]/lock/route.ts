import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/server/auth/authMiddleware";
import { db } from "@/server/db/store";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(req);
  if ("error" in auth) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: auth.error } }, { status: auth.status });
  }

  const { id } = await params;
  const sentence = await db.toggleSentenceLock(id);
  if (!sentence) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Sentence not found." } }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    sentenceId: id,
    locked: sentence.locked,
  });
}
