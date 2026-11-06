import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { GOOGLE_AUTH_URL, STATE_COOKIE, googleConfig, redirectUri, safeNext, siteOrigin } from "@/server/auth/google";

/** Starts "Sign in with Google": sends the visitor to Google's sign-in page. */
export async function GET(req: NextRequest) {
  const config = googleConfig();
  const next = safeNext(req.nextUrl.searchParams.get("next"));
  if (!config) {
    return NextResponse.redirect(`${siteOrigin(req)}/?auth_error=google_not_configured`);
  }

  // The state ties Google's answer to this browser, so nobody can sign you in to their account.
  const state = randomBytes(24).toString("base64url");
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: redirectUri(req),
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });

  const res = NextResponse.redirect(`${GOOGLE_AUTH_URL}?${params}`);
  res.cookies.set(STATE_COOKIE, JSON.stringify({ state, next }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/v1/auth/google",
    maxAge: 600,
  });
  return res;
}
