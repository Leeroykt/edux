import { SignJWT, jwtVerify } from "jose";

function loadSecret(): Uint8Array {
  const configured = process.env.JWT_SECRET?.trim();
  if (configured && configured.length >= 32) return new TextEncoder().encode(configured);
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET must be set to a random value of at least 32 characters in production.");
  }
  // Local development only. Sessions made with this value are worthless in production.
  return new TextEncoder().encode("dev-only-secret-do-not-use-in-production-0123456789");
}

const JWT_SECRET = loadSecret();

export interface TokenPayload {
  sub: string; // User ID
  email: string;
  role: string;
  planType: string;
}

export async function signAccessToken(payload: TokenPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("2h")
    .sign(JWT_SECRET);
}

export async function signRefreshToken(payload: TokenPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      sub: payload.sub as string,
      email: payload.email as string,
      role: payload.role as string,
      planType: payload.planType as string,
    };
  } catch (err) {
    return null;
  }
}
