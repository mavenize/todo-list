import { createId } from '../../src/js/utils/id';

describe('createId', () => {
  test('returns a non-empty string', () => {
    const id = createId();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  test('returns unique ids', () => {
    const ids = new Set(Array.from({ length: 1000 }, () => createId()));
    expect(ids.size).toBe(1000);
  });

  test('falls back when crypto.randomUUID is unavailable', () => {
    const original = globalThis.crypto;
    Object.defineProperty(globalThis, 'crypto', { value: undefined, configurable: true });
    try {
      const a = createId();
      const b = createId();
      expect(a).toMatch(/^[a-z0-9]+-[a-z0-9]+$/);
      expect(a).not.toBe(b);
    } finally {
      Object.defineProperty(globalThis, 'crypto', { value: original, configurable: true });
    }
  });
});
