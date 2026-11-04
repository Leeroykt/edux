import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/server/auth/authMiddleware";
import { db } from "@/server/db/store";
import { hashPassword, verifyPassword } from "@/server/auth/password";

/** Changes the signed-in user's password after checking the current one. */
export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if ("error" in auth) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: auth.error } }, { status: auth.status });
  }

  let body: { currentPassword?: string; newPassword?: string } = {};
  try {
    body = await req.json();
  } catch {
    // handled below
  }
  const { currentPassword, newPassword } = body;

  if (!currentPassword || !newPassword) {
    return NextResponse.json(
      { error: { code: "INVALID_PAYLOAD", message: "Enter your current and new password." } },
      { status: 400 }
    );
  }
  if (newPassword.length < 8) {
    return NextResponse.json(
      { error: { code: "WEAK_PASSWORD", message: "Choose a password of at least 8 characters." } },
      { status: 422 }
    );
  }
  if (!(await verifyPassword(currentPassword, auth.user.passwordHash))) {
    return NextResponse.json(
      { error: { code: "WRONG_PASSWORD", message: "Your current password is not correct." } },
      { status: 403 }
    );
  }

  await db.updateUser(auth.user.id, { passwordHash: await hashPassword(newPassword) });
  await db.recordAudit(auth.user.id, "password_changed", `user:${auth.user.id}`, req.headers.get("x-forwarded-for") || undefined);
  return NextResponse.json({ success: true });
}
