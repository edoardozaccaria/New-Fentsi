import crypto from 'node:crypto';

/**
 * Generate a cryptographically secure random token (hex-encoded).
 * @param bytes Number of random bytes (default 32 → 64 hex chars).
 */
export function generateToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Hash a token using SHA-256. Useful for storing tokens in the database
 * so the raw token is never persisted.
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Constant-time comparison of a raw token against a stored SHA-256 hash.
 * Hashes the candidate and compares digests to prevent timing attacks.
 */
export function compareHash(candidateToken: string, storedHash: string): boolean {
  const candidateHash = hashToken(candidateToken);
  const a = Buffer.from(candidateHash, 'hex');
  const b = Buffer.from(storedHash, 'hex');

  if (a.length !== b.length) {
    return false;
  }

  return crypto.timingSafeEqual(a, b);
}
