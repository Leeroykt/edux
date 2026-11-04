import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db/store";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const refreshToken: string | undefined = req.cookies.get("edux_refresh_token")?.value || body.refreshToken;

    if (refreshToken) {
      await db.deleteSession(refreshToken);
    }

    const res = NextResponse.json({ success: true, message: "Logged out successfully." });
    res.cookies.delete("edux_access_token");
    res.cookies.set("edux_refresh_token", "", { httpOnly: true, path: "/api/v1/auth", maxAge: 0 });
    return res;
  } catch (err: any) {
    return NextResponse.json(
      { error: { code: "LOGOUT_ERROR", message: "Failed to process logout." } },
      { status: 500 }
    );
  }
}
