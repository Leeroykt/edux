/**
 * Sign in with Google (OpenID Connect, authorization code flow).
 *
 * Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in apps/web/.env.local. The redirect URI to register in
 * Google Cloud Console is <your site>/api/v1/auth/google/callback (APP_URL decides <your site> when set).
 */
import { NextRequest } from "next/server";

export const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
export const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
export const GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";
export const GOOGLE_ISSUERS = ["https://accounts.google.com", "accounts.google.com"];

export const STATE_COOKIE = "edux_google_state";

export function googleConfig(): { clientId: string; clientSecret: string } | null {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

/** The site's own address, used to build the redirect URI Google sends the user back to. */
export function siteOrigin(req: NextRequest): string {
  const configured = process.env.APP_URL?.trim().replace(/\/+$/, "");
  if (configured) return configured;
  // The address the browser used. (The server's own origin can be 0.0.0.0 when it listens on every address.)
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") || req.nextUrl.protocol.replace(":", "");
  return host && /^[A-Za-z0-9.-]+(:\d+)?$/.test(host) ? `${proto}://${host}` : req.nextUrl.origin;
}

export function redirectUri(req: NextRequest): string {
  return `${siteOrigin(req)}/api/v1/auth/google/callback`;
}

/** Only paths inside this site are allowed as the place to return to after signing in. */
export function safeNext(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return "/documents";
  return value;
}
