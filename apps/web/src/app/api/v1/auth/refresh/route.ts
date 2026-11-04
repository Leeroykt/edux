import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db/store";
import { verifyToken, signAccessToken, signRefreshToken } from "@/server/auth/jwt";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const refreshToken: string | undefined = req.cookies.get("edux_refresh_token")?.value || body.refreshToken;

    if (!refreshToken) {
      return NextResponse.json(
        { error: { code: "TOKEN_REQUIRED", message: "Refresh token is required." } },
        { status: 400 }
      );
    }

    const payload = await verifyToken(refreshToken);
    if (!payload) {
      return NextResponse.json(
        { error: { code: "INVALID_TOKEN", message: "Invalid or expired refresh token." } },
        { status: 401 }
      );
    }

    const session = await db.findSessionByToken(refreshToken);
    if (!session) {
      return NextResponse.json(
        { error: { code: "REVOKED_SESSION", message: "Session was revoked." } },
        { status: 401 }
      );
    }

    const user = await db.findUserById(payload.sub);
    if (!user) {
      return NextResponse.json(
        { error: { code: "USER_NOT_FOUND", message: "User does not exist." } },
        { status: 401 }
      );
    }

    // Rotate refresh token
    await db.deleteSession(refreshToken);

    const tokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      planType: user.planType,
    };

    const newAccessToken = await signAccessToken(tokenPayload);
    const newRefreshToken = await signRefreshToken(tokenPayload);

    await db.createSession(
      user.id,
      newRefreshToken,
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    );

    const res = NextResponse.json({
      accessToken: newAccessToken,
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
    });

    res.cookies.set("edux_access_token", newAccessToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 7200,
    });
    res.cookies.set("edux_refresh_token", newRefreshToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/api/v1/auth",
      maxAge: 7 * 24 * 60 * 60,
    });

    return res;
  } catch (err: any) {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Refresh token error." } },
      { status: 500 }
    );
  }
}
