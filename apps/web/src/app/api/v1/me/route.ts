import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "../../../../../server/auth/authMiddleware";
import { db } from "../../../../../server/db/store";

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if ("error" in auth) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: auth.error } }, { status: auth.status });
  }

  const { user } = auth;
  const usage = await db.getUsageForUser(user.id);

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      planType: user.planType,
      role: user.role,
      country: user.country,
      timeZone: user.timeZone,
      trustLevel: user.trustLevel,
      createdAt: user.createdAt,
    },
    usage,
  });
}

export async function PATCH(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if ("error" in auth) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: auth.error } }, { status: auth.status });
  }

  const { user } = auth;
  const body = await req.json();
  const { name, country, timeZone, planType } = body;

  const updated = await db.updateUser(user.id, {
    ...(name ? { name } : {}),
    ...(country ? { country } : {}),
    ...(timeZone ? { timeZone } : {}),
    ...(planType ? { planType } : {}),
  });

  return NextResponse.json({ user: updated });
}
