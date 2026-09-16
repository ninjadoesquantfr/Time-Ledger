// Simple in-memory rate limiter for login attempts
// For production, swap with Redis (Upstash) or Vercel KV

interface Attempt {
  count: number;
  firstAttempt: number;
  lockedUntil?: number;
}

const store = new Map<string, Attempt>();

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

export function checkRateLimit(identifier: string): {
  allowed: boolean;
  remainingMs?: number;
} {
  const now = Date.now();
  const entry = store.get(identifier);

  if (!entry) {
    return { allowed: true };
  }

  // Check if locked
  if (entry.lockedUntil && now < entry.lockedUntil) {
    return { allowed: false, remainingMs: entry.lockedUntil - now };
  }

  // Reset if window expired
  if (now - entry.firstAttempt > WINDOW_MS) {
    store.delete(identifier);
    return { allowed: true };
  }

  if (entry.count >= MAX_ATTEMPTS) {
    return { allowed: false, remainingMs: entry.lockedUntil ? entry.lockedUntil - now : LOCKOUT_MS };
  }

  return { allowed: true };
}

export function recordFailedAttempt(identifier: string): void {
  const now = Date.now();
  const entry = store.get(identifier);

  if (!entry || now - entry.firstAttempt > WINDOW_MS) {
    store.set(identifier, { count: 1, firstAttempt: now });
    return;
  }

  const newCount = entry.count + 1;
  const updates: Attempt = { ...entry, count: newCount };

  if (newCount >= MAX_ATTEMPTS) {
    updates.lockedUntil = now + LOCKOUT_MS;
  }

  store.set(identifier, updates);
}

export function clearAttempts(identifier: string): void {
  store.delete(identifier);
}

// Clean up expired entries periodically
setInterval(
  () => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (now - entry.firstAttempt > WINDOW_MS * 2) {
        store.delete(key);
      }
    }
  },
  5 * 60 * 1000,
);
