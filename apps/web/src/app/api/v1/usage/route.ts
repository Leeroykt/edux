import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "../../../../../server/auth/authMiddleware";
import { db } from "../../../../../server/db/store";

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if ("error" in auth) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: auth.error } }, { status: auth.status });
  }

  const usage = await db.getUsageForUser(auth.user.id);
  return NextResponse.json(usage);
}
