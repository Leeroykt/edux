import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/server/auth/authMiddleware";
import { db } from "@/server/db/store";
import { ownDocument } from "@/server/auth/access";
import { startScan } from "@/server/jobs/scoring";

/** Starts (or restarts) scoring for a document. Answers at once with 202. */
export async function POST(
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

  const scan = startScan(id);
  return NextResponse.json({ documentId: id, status: scan.status, total: scan.total }, { status: 202 });
}
