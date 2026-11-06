import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { db } from "@/server/db/store";
import { hashPassword } from "@/server/auth/password";
import { signAccessToken, signRefreshToken } from "@/server/auth/jwt";
import {
  GOOGLE_ISSUERS,
  GOOGLE_JWKS_URL,
  GOOGLE_TOKEN_URL,
  STATE_COOKIE,
  googleConfig,
  redirectUri,
  safeNext,
  siteOrigin,
} from "@/server/auth/google";

const jwks = createRemoteJWKSet(new URL(GOOGLE_JWKS_URL));

/** Google sends the visitor back here. The account is matched by verified email, or created. */
export async function GET(req: NextRequest) {
  const origin = siteOrigin(req);
  const fail = (code: string) => {
    const res = NextResponse.redirect(`${origin}/?auth_error=${code}`);
    res.cookies.delete({ name: STATE_COOKIE, path: "/api/v1/auth/google" });
    return res;
  };

  const config = googleConfig();
  if (!config) return fail("google_not_configured");

  const url = req.nextUrl;
  if (url.searchParams.get("error")) return fail("google_cancelled");
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  let saved: { state?: string; next?: string } = {};
  try {
    saved = JSON.parse(req.cookies.get(STATE_COOKIE)?.value || "{}");
  } catch {
    saved = {};
  }
  if (!code || !state || !saved.state || saved.state !== state) return fail("google_state");

  try {
    // Swap the one-time code for Google's signed identity token.
    const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: redirectUri(req),
        grant_type: "authorization_code",
      }),
    });
    if (!tokenRes.ok) return fail("google_token");
    const { id_token } = (await tokenRes.json()) as { id_token?: string };
    if (!id_token) return fail("google_token");

    // The identity token must be signed by Google, for this app, and still valid.
    const { payload } = await jwtVerify(id_token, jwks, { issuer: GOOGLE_ISSUERS, audience: config.clientId });
    const email = typeof payload.email === "string" ? payload.email.toLowerCase() : "";
    if (!email || payload.email_verified !== true) return fail("google_email");

    let user = await db.findUserByEmail(email);
    if (!user) {
      const name = (typeof payload.name === "string" && payload.name.trim()) || email.split("@")[0];
      user = await db.createUser({
        email,
        // Google accounts have no eduX password; this random one can never be typed.
        passwordHash: await hashPassword(randomBytes(32).toString("base64url")),
        name,
        planType: "individual",
        role: "user",
        country: "Global",
        timeZone: "UTC",
        trustLevel: 1,
      });
    }

    const tokenPayload = { sub: user.id, email: user.email, role: user.role, planType: user.planType };
    const accessToken = await signAccessToken(tokenPayload);
    const refreshToken = await signRefreshToken(tokenPayload);
    await db.createSession(user.id, refreshToken, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString());

    // Back to where the visitor started; the page picks the session up from the cookie.
    const next = safeNext(saved.next);
    const target = new URL(next, origin);
    target.searchParams.set("signed_in", "google");
    const res = NextResponse.redirect(target.toString());
    const secure = process.env.NODE_ENV === "production";
    res.cookies.set("edux_access_token", accessToken, { httpOnly: true, sameSite: "lax", secure, path: "/", maxAge: 7200 });
    res.cookies.set("edux_refresh_token", refreshToken, { httpOnly: true, sameSite: "lax", secure, path: "/api/v1/auth", maxAge: 7 * 24 * 60 * 60 });
    res.cookies.delete({ name: STATE_COOKIE, path: "/api/v1/auth/google" });
    return res;
  } catch (err) {
    console.error("Google sign-in error:", err);
    return fail("google_failed");
  }
}
