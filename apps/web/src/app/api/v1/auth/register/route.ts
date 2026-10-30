import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db/store";
import { hashPassword } from "@/server/auth/password";
import { signAccessToken, signRefreshToken } from "@/server/auth/jwt";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, name, planType = "individual" } = body;

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: { code: "INVALID_INPUT", message: "Email, password, and name are required." } },
        { status: 422 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: { code: "WEAK_PASSWORD", message: "Password must be at least 8 characters long." } },
        { status: 422 }
      );
    }

    const existing = await db.findUserByEmail(email);
    if (existing) {
      return NextResponse.json(
        { error: { code: "DUPLICATE_EMAIL", message: "An account with this email already exists." } },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    const user = await db.createUser({
      email,
      passwordHash,
      name,
      planType: planType === "edu_pro" ? "edu_pro" : "individual",
      role: "user",
      country: "Global",
      timeZone: "UTC",
      trustLevel: 1,
    });

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

    const res = NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          planType: user.planType,
          role: user.role,
        },
        accessToken,
        refreshToken,
      },
      { status: 201 }
    );

    res.cookies.set("edux_access_token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 7200, // 2 hours
    });

    return res;
  } catch (err: any) {
    console.error("Register error:", err);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "An error occurred during registration." } },
      { status: 500 }
    );
  }
}
