import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/server/auth/authMiddleware";
import { db } from "@/server/db/store";

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
      institution: user.institution,
      fieldOfStudy: user.fieldOfStudy,
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
  // A plan can only change through billing, never through a profile edit.
  const clean = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : undefined);
  const name = clean(body.name, 120);
  const country = clean(body.country, 80);
  const timeZone = clean(body.timeZone, 80);
  const institution = clean(body.institution, 160);
  const fieldOfStudy = clean(body.fieldOfStudy, 160);

  if (body.name !== undefined && !name) {
    return NextResponse.json({ error: { code: "INVALID_PAYLOAD", message: "Your name cannot be empty." } }, { status: 422 });
  }

  const updated = await db.updateUser(user.id, {
    ...(name ? { name } : {}),
    ...(country !== undefined ? { country } : {}),
    ...(timeZone ? { timeZone } : {}),
    ...(institution !== undefined ? { institution } : {}),
    ...(fieldOfStudy !== undefined ? { fieldOfStudy } : {}),
  });

  if (!updated) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Account not found." } }, { status: 404 });
  }

  return NextResponse.json({
    user: {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      planType: updated.planType,
      role: updated.role,
      country: updated.country,
      timeZone: updated.timeZone,
      trustLevel: updated.trustLevel,
      institution: updated.institution,
      fieldOfStudy: updated.fieldOfStudy,
      createdAt: updated.createdAt,
    },
  });

}
