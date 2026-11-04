import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/server/auth/authMiddleware";
import { db } from "@/server/db/store";
import { ownDocument } from "@/server/auth/access";
import { CITATION_STYLES, WRITING_MODES } from "@edux/schema";

export async function GET(
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

  return NextResponse.json({ document: doc });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(req);
  if ("error" in auth) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: auth.error } }, { status: auth.status });
  }

  const { id } = await params;
  if (!(await ownDocument(auth.user, id))) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Document not found." } }, { status: 404 });
  }
  const body = await req.json();
  const { title, stage, status, folderId, dialect, writingMode, citationStyle } = body;

  const updated = await db.updateDocument(id, {
    ...(title ? { title } : {}),
    ...(stage ? { stage } : {}),
    ...(status ? { status } : {}),
    ...(folderId !== undefined ? { folderId } : {}),
    ...(dialect === "en-GB" || dialect === "en-US" ? { dialect } : {}),
    ...(WRITING_MODES.includes(writingMode) ? { writingMode } : {}),
    ...(CITATION_STYLES.includes(citationStyle) ? { citationStyle } : {}),
  });

  if (!updated) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Document not found." } }, { status: 404 });
  }

  return NextResponse.json({ document: updated });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(req);
  if ("error" in auth) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: auth.error } }, { status: auth.status });
  }

  const { id } = await params;
  if (!(await ownDocument(auth.user, id))) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Document not found." } }, { status: 404 });
  }
  const deleted = await db.deleteDocument(id);
  if (!deleted) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Document not found." } }, { status: 404 });
  }

  return NextResponse.json({ success: true, message: "Document deleted." });
}
