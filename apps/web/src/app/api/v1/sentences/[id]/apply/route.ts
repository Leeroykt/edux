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
  const sentence = await db.findSentenceById(id);
  if (!sentence) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Sentence not found." } }, { status: 404 });
  }

  try {
    const body = await req.json();
    const { text, suggestionId } = body;

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: { code: "INVALID_PAYLOAD", message: "Replacement text is required." } },
        { status: 400 }
      );
    }

    const updated = await db.updateSentenceText(id, text, auth.user.id);
    if (!updated) {
      return NextResponse.json(
        { error: { code: "UPDATE_FAILED", message: "Could not apply rewrite." } },
        { status: 500 }
      );
    }

    // Increment suggestions quota count
    await db.incrementUsage(auth.user.id, 0, 1);

    // Record audit
    await db.recordAudit(
      auth.user.id,
      "sentence_rewrite_applied",
      `sentence:${id}`,
      req.headers.get("x-forwarded-for") || undefined
    );

    const newVersionId = `v_${Date.now().toString(36)}`;

    return NextResponse.json({
      success: true,
      newVersionId,
      sentenceId: id,
      text: updated.text,
      suggestionId,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: err.message || "Failed to apply suggestion." } },
      { status: 500 }
    );
  }
}
