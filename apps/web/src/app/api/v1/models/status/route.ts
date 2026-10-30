import { NextResponse } from "next/server";

export async function GET() {
  const modelUrl = process.env.MODEL_SERVICE_URL || null;

  return NextResponse.json({
    status: "online",
    integrationMode: modelUrl ? "connected_remote_service" : "integrated_reference_engine",
    modelServiceUrl: modelUrl,
    contracts: {
      detect: {
        method: "POST",
        path: "/api/v1/models/detect",
        payload: {
          documentId: "string (optional)",
          sentences: [{ id: "string", text: "string" }],
        },
      },
      rewrite: {
        method: "POST",
        path: "/api/v1/models/rewrite",
        payload: {
          sentenceId: "string",
          text: "string",
          tone: "'academic' | 'neutral' | 'conversational' (optional)",
          strength: "'light' | 'moderate' | 'full' (optional)",
          contextParagraph: "string (optional)",
        },
      },
    },
    documentation:
      "To connect an external Python FastAPI / PyTorch model service, run your model server and set MODEL_SERVICE_URL=http://your-host:8000. It must expose POST /v1/detect and POST /v1/rewrite.",
  });
}
