/**
 * Small in-memory limiter for sign-in attempts. It slows password guessing on a
 * single server; put a shared store behind it when running more than one instance.
 */
const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 10;

export function checkLoginAllowed(key: string): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.resetAt <= now) return { ok: true };
  if (entry.count >= MAX_ATTEMPTS) return { ok: false, retryAfterSec: Math.ceil((entry.resetAt - now) / 1000) };
  return { ok: true };
}

export function recordLoginFailure(key: string) {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.resetAt <= now) attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
  else entry.count += 1;
}

export function clearLoginFailures(key: string) {
  attempts.delete(key);
}
