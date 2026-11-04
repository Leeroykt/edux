import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db/store";
import { verifyPassword } from "@/server/auth/password";
import { signAccessToken, signRefreshToken } from "@/server/auth/jwt";
import { checkLoginAllowed, clearLoginFailures, recordLoginFailure } from "@/server/auth/rateLimit";

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

    const key = `${(req.headers.get("x-forwarded-for") || "local").split(",")[0].trim()}|${String(email).toLowerCase()}`;
    const allowed = checkLoginAllowed(key);
    if (!allowed.ok) {
      return NextResponse.json(
        { error: { code: "TOO_MANY_ATTEMPTS", message: `Too many sign-in attempts. Try again in ${Math.ceil(allowed.retryAfterSec / 60)} minutes.` } },
        { status: 429, headers: { "Retry-After": String(allowed.retryAfterSec) } }
      );
    }

    const user = await db.findUserByEmail(email);
    if (!user) {
      recordLoginFailure(key);
      return NextResponse.json(
        { error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password." } },
        { status: 401 }
      );
    }

    const isMatch = await verifyPassword(password, user.passwordHash);
    if (!isMatch) {
      recordLoginFailure(key);
      return NextResponse.json(
        { error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password." } },
        { status: 401 }
      );
    }

    clearLoginFailures(key);
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
    });

    res.cookies.set("edux_access_token", accessToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 7200,
    });
    // The refresh token is only ever sent to the auth endpoints, and page scripts cannot read it.
    res.cookies.set("edux_refresh_token", refreshToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/api/v1/auth",
      maxAge: 7 * 24 * 60 * 60,
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
