import { NextResponse } from "next/server";
import { modelConnector } from "@/server/models/modelConnector";

export async function GET() {
  const configured = modelConnector.status().configured;
  const reachable = configured ? await modelConnector.ping() : false;
  const status = modelConnector.status();

  return NextResponse.json({
    status: "online",
    integrationMode: !configured
      ? "reference_engine"
      : reachable
      ? "connected_remote_service"
      : "remote_unreachable_using_reference",
    configured,
    reachable,
    lastError: status.lastError,
    lastOkAt: status.lastOkAt,
    contracts: {
      detect: "POST {MODEL_SERVICE_URL}/v1/detect",
      rewrite: "POST {MODEL_SERVICE_URL}/v1/rewrite",
      health: "GET {MODEL_SERVICE_URL}/v1/health",
    },
    env: ["MODEL_SERVICE_URL", "MODEL_SERVICE_TOKEN", "MODEL_TIMEOUT_MS", "MODEL_DETECT_BATCH", "MODEL_VERSION"],
  });
}
