import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../../../server/db/store";
import { verifyPassword } from "../../../../../server/auth/password";
import { signAccessToken, signRefreshToken } from "../../../../../server/auth/jwt";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: { code: "INVALID_CREDENTIALS", message: "Email and password are required." } },
        { status: 400 }
      );
    }

    const user = await db.findUserByEmail(email);
    if (!user) {
      return NextResponse.json(
        { error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password." } },
        { status: 401 }
      );
    }

    const isMatch = await verifyPassword(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        { error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password." } },
        { status: 401 }
      );
    }

    const tokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      planType: user.planType,
    };

    const accessToken = await signAccessToken(tokenPayload);
    const refreshToken = await signRefreshToken(tokenPayload);

    await db.createSession(
      user.id,
      refreshToken,
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    );

    const res = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        planType: user.planType,
        role: user.role,
        country: user.country,
        timeZone: user.timeZone,
        trustLevel: user.trustLevel,
      },
      accessToken,
      refreshToken,
    });

    res.cookies.set("edux_access_token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 7200,
    });

    return res;
  } catch (err: any) {
    console.error("Login error:", err);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Authentication service error." } },
      { status: 500 }
    );
  }
}
