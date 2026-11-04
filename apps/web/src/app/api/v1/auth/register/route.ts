import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db/store";
import { hashPassword } from "@/server/auth/password";
import { signAccessToken, signRefreshToken } from "@/server/auth/jwt";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, name } = body;

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: { code: "INVALID_INPUT", message: "Email, password, and name are required." } },
        { status: 422 }
      );
    }

    if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: { code: "INVALID_EMAIL", message: "Enter a valid email address." } },
        { status: 422 }
      );
    }

    if (typeof password !== "string" || password.length < 8) {
      return NextResponse.json(
        { error: { code: "WEAK_PASSWORD", message: "Choose a password of at least 8 characters." } },
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
      // A paid plan can only come from billing, never from the sign-up form.
      planType: "individual",
      role: "user",
      country: "Global",
      timeZone: "UTC",
      trustLevel: 1,
    });

    // Best Practice: Do NOT set auth session cookie on registration.
    // The user must explicitly sign in using their credentials.
    return NextResponse.json(
      {
        message: "Account created successfully.",
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          planType: user.planType,
          role: user.role,
        },
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("Register error:", err);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "An error occurred during registration." } },
      { status: 500 }
    );
  }
}
