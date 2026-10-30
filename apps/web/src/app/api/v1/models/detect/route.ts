import { NextRequest, NextResponse } from "next/server";
import { modelConnector } from "@/server/models/modelConnector";

/**
 * Model Detection Endpoint for ML / AI model integration.
 * The friend can POST batch sentences here or configure MODEL_SERVICE_URL to route to their Python service.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { documentId = "doc_ext", sentences } = body;

    if (!Array.isArray(sentences) || sentences.length === 0) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "Sentences array with { id, text } is required." } },
        { status: 400 }
      );
    }

    const results = await modelConnector.detectSentences({
      documentId,
      sentences,
    });

    return NextResponse.json({
      model: process.env.MODEL_SERVICE_URL ? "external-ml-service" : "stylometric-ensemble-v1.2",
      count: results.length,
      scores: results,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: { code: "MODEL_ERROR", message: err.message || "Failed to execute detection." } },
      { status: 500 }
    );
  }
}
