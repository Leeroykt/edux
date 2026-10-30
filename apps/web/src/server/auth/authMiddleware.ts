import { NextRequest, NextResponse } from "next/server";
import { verifyToken, TokenPayload } from "./jwt";
import { db } from "../db/store";
import { DbUser } from "../db/schema";

export interface AuthenticatedContext {
  user: DbUser;
  token: string;
}

export async function authenticateRequest(
  req: NextRequest
): Promise<{ user: DbUser; tokenPayload: TokenPayload } | { error: string; status: number }> {
  const authHeader = req.headers.get("authorization");
  let token: string | null = null;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7).trim();
  } else {
    // Check cookie fallback
    const cookieToken = req.cookies.get("edux_access_token")?.value;
    if (cookieToken) token = cookieToken;
  }

  if (!token) {
    // If no token supplied, check if demo fallback user is present
    const defaultUser = await db.findUserByEmail("researcher@oxford.ac.uk");
    if (defaultUser) {
      return {
        user: defaultUser,
        tokenPayload: {
          sub: defaultUser.id,
          email: defaultUser.email,
          role: defaultUser.role,
          planType: defaultUser.planType,
        },
      };
    }
    return { error: "Authentication token required", status: 401 };
  }

  const payload = await verifyToken(token);
  if (!payload) {
    return { error: "Invalid or expired authorization token", status: 401 };
  }

  const user = await db.findUserById(payload.sub);
  if (!user) {
    return { error: "User account no longer exists", status: 401 };
  }

  return { user, tokenPayload: payload };
}
