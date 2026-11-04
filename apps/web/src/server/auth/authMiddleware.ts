import { NextRequest } from "next/server";
import { verifyToken, TokenPayload } from "./jwt";
import { db } from "../db/store";
import { DbUser } from "../db/schema";

export interface AuthenticatedContext {
  user: DbUser;
  token: string;
}

/** Resolves the signed-in user from a bearer token or cookie. No token means no access. */
export async function authenticateRequest(
  req: NextRequest
): Promise<{ user: DbUser; tokenPayload: TokenPayload } | { error: string; status: number }> {
  const authHeader = req.headers.get("authorization");
  let token: string | null = null;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7).trim();
  } else {
    const cookieToken = req.cookies.get("edux_access_token")?.value;
    if (cookieToken) token = cookieToken;
  }

  if (!token) {
    return { error: "Sign in to continue.", status: 401 };
  }

  const payload = await verifyToken(token);
  if (!payload) {
    return { error: "Your session has expired. Please sign in again.", status: 401 };
  }

  const user = await db.findUserById(payload.sub);
  if (!user) {
    return { error: "This account no longer exists.", status: 401 };
  }

  return { user, tokenPayload: payload };
}
