import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/server/auth/authMiddleware";
import { db } from "@/server/db/store";
import { modelConnector } from "@/server/models/modelConnector";

export async function GET(
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

  // Check cached suggestions in DB first
  const existing = await db.findSuggestionsBySentenceId(id);
  if (existing.length > 0) {
    return NextResponse.json(existing);
  }

  // Generate rewrites via modelConnector
  const candidates = await modelConnector.generateRewrites({
    sentenceId: id,
    text: sentence.text,
  });

  return NextResponse.json(candidates);
}

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

  let options: any = {};
  try {
    options = await req.json();
  } catch {
    // optional body
  }

  // Generate rewrites via modelConnector with options
  const candidates = await modelConnector.generateRewrites({
    sentenceId: id,
    text: sentence.text,
    tone: options.tone,
    strength: options.strength,
  });

  return NextResponse.json(candidates);
}
