import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "../../../../../../../server/auth/authMiddleware";
import { db } from "../../../../../../../server/db/store";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(req);
  if ("error" in auth) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: auth.error } }, { status: auth.status });
  }

  const { id } = await params;
  try {
    const body = await req.json();
    const { stage } = body;
    if (!stage) {
      return NextResponse.json({ error: { code: "BAD_REQUEST", message: "Stage is required." } }, { status: 400 });
    }

    const updated = await db.updateDocument(id, { stage });
    if (!updated) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Document not found." } }, { status: 404 });
    }

    return NextResponse.json({ success: true, document: updated });
  } catch (err: any) {
    return NextResponse.json({ error: { code: "ERROR", message: err.message } }, { status: 500 });
  }
}
