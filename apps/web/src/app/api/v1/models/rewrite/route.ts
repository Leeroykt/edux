import { NextRequest, NextResponse } from "next/server";
import { modelConnector } from "@/server/models/modelConnector";

/**
 * Model Rewriter Endpoint for ML / LoRA fine-tuned model integration.
 * The friend can POST a sentence here or configure MODEL_SERVICE_URL to route to their Python service.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sentenceId = "s_demo", text, contextParagraph, tone, strength } = body;
    const dialect = body.dialect === "en-US" ? "en-US" : body.dialect === "en-GB" ? "en-GB" : undefined;

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "Sentence text is required." } },
        { status: 400 }
      );
    }

    const suggestions = await modelConnector.generateRewrites({
      sentenceId,
      text,
      contextParagraph,
      tone,
      strength,
      dialect,
    });

    return NextResponse.json({
      engines: Array.from(new Set(suggestions.map((r) => r.engine))),
      sentenceId,
      suggestions,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: { code: "MODEL_ERROR", message: err.message || "Failed to generate rewrites." } },
      { status: 500 }
    );
  }
}
