import { SignJWT, jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "edux_super_secure_academic_integrity_secret_key_2026"
);

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
