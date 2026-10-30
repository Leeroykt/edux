import { NextRequest, NextResponse } from "next/server";
import { modelConnector } from "../../../../../../server/models/modelConnector";

/**
 * Model Rewriter Endpoint for ML / LoRA fine-tuned model integration.
 * The friend can POST a sentence here or configure MODEL_SERVICE_URL to route to their Python service.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sentenceId = "s_demo", text, contextParagraph, tone, strength } = body;

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
    });

    return NextResponse.json({
      model: process.env.MODEL_SERVICE_URL ? "external-ml-service" : "academic-lora-qwen-v2",
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
