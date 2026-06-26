/**
 * Limiteur de tentatives de connexion, en mémoire (par instance).
 * Suffisant pour un site à admin unique ; pour un déploiement multi-instances,
 * remplacer par un store partagé (Upstash Redis).
 */
const WINDOW_MS = 15 * 60 * 1000; // 15 min
const MAX_ATTEMPTS = 8;

const attempts = new Map<string, { count: number; first: number }>();

function key(email: string) {
  return email.toLowerCase();
}

export function allowAttempt(email: string): boolean {
  const k = key(email);
  const now = Date.now();
  const entry = attempts.get(k);
  if (!entry || now - entry.first > WINDOW_MS) return true;
  return entry.count < MAX_ATTEMPTS;
}

export function recordFailure(email: string): void {
  const k = key(email);
  const now = Date.now();
  const entry = attempts.get(k);
  if (!entry || now - entry.first > WINDOW_MS) {
    attempts.set(k, { count: 1, first: now });
  } else {
    entry.count += 1;
  }
}

export function resetAttempts(email: string): void {
  attempts.delete(key(email));
}
