/**
 * Returns a unique string id.
 * Uses crypto.randomUUID where available (secure contexts: https, localhost),
 * otherwise falls back to a time + random based id.
 */
export function createId() {
  const { crypto } = globalThis;
  if (crypto && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
