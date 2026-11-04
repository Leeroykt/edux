import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/server/auth/authMiddleware";
import { ownDocument } from "@/server/auth/access";
import { db } from "@/server/db/store";
import { DbSentence } from "@/server/db/schema";

const NODE_TYPES = ["paragraph", "heading", "list_item", "table_cell", "table", "blockquote", "image"] as const;

/**
 * Saves edits made by typing. The body names the paragraphs that changed, the
 * ones that were removed, and the document's paragraph order.
 */
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

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: { code: "BAD_REQUEST", message: "Send JSON." } }, { status: 400 });
  }

  const nodes = Array.isArray(body.nodes) ? body.nodes.slice(0, 50) : [];
  const removed: string[] = Array.isArray(body.removedNodeIds) ? body.removedNodeIds.filter((x: unknown) => typeof x === "string").slice(0, 50) : [];
  const order: string[] = Array.isArray(body.order) ? body.order.filter((x: unknown) => typeof x === "string").slice(0, 20000) : [];

  const clean = nodes
    .filter((n: any) => n && typeof n.id === "string" && NODE_TYPES.includes(n.type) && Array.isArray(n.sentences))
    .map((n: any) => ({
      id: n.id as string,
      type: n.type,
      styleName: typeof n.styleName === "string" ? n.styleName.slice(0, 60) : undefined,
      sentences: n.sentences.slice(0, 400).map((s: any, i: number): DbSentence => ({
        id: String(s.id),
        nodeId: n.id,
        documentId: id,
        paragraphIndex: 0,
        text: typeof s.text === "string" ? s.text.slice(0, 5000) : "",
        charStart: 0,
        charEnd: typeof s.text === "string" ? Math.min(s.text.length, 5000) : 0,
        locked: !!s.locked,
        ignored: !!s.ignored,
      })),
    }));

  await db.syncNodes(id, clean, removed, order);

  const words = Number(body.wordCount);
  if (Number.isFinite(words) && words >= 0) {
    await db.updateDocument(id, { wordCount: Math.round(words), pageCount: Math.max(1, Math.ceil(words / 320)) });
  }
  return NextResponse.json({ success: true });
}
