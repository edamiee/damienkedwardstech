import "server-only";
import { randomBytes, createHash, timingSafeEqual } from "crypto";

export const AUTH_CODE_TTL_MS = 5 * 60 * 1000; // 5 minutes, single-use
export const ACCESS_TOKEN_TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

// PKCE (RFC 7636, S256 only) — the code_verifier the client holds must
// hash to the code_challenge it sent at /authorize time.
export function verifyPkce(codeVerifier: string, codeChallenge: string): boolean {
  const computed = createHash("sha256").update(codeVerifier).digest("base64url");
  const a = Buffer.from(computed);
  const b = Buffer.from(codeChallenge);
  return a.length === b.length && timingSafeEqual(a, b);
}
