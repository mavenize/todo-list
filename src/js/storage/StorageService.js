import { STORAGE_KEY, STORAGE_VERSION } from '../utils/constants';

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Versioned persistence on top of a Web Storage-like object (`getItem`, `setItem`, `removeItem`).
 * The storage is injected, so this class never reaches for the global localStorage and tests can pass a fake.
 * None of the methods throw: storage errors and bad data are reported through return values.
 */
export class StorageService {
  #storage;
  #key;

  /** `storage` may be null (e.g. when localStorage is blocked); every call then fails softly. */
  constructor(storage, key = STORAGE_KEY) {
    this.#storage = storage ?? null;
    this.#key = key;
  }

  get key() {
    return this.#key;
  }

  /**
   * Writes `{ version, ...state }` as JSON. A `version` in `state` is ignored.
   * Returns true on success, false when there is no storage, it throws (quota, privacy mode)
   * or the state can't be serialized.
   */
  save(state = {}) {
    if (!this.#storage) return false;
    try {
      this.#storage.setItem(this.#key, JSON.stringify({ ...state, version: STORAGE_VERSION }));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Returns the saved payload `{ version, projects, ... }`, or null when there is none,
   * it can't be read or parsed, it has an unknown version, or `projects` isn't an array.
   * Never throws.
   */
  load() {
    if (!this.#storage) return null;
    let raw;
    try {
      raw = this.#storage.getItem(this.#key);
    } catch {
      return null;
    }
    if (typeof raw !== 'string') return null;

    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      return null;
    }
    if (!isPlainObject(data)) return null;
    if (data.version !== STORAGE_VERSION) return null;
    if (!Array.isArray(data.projects)) return null;
    return data;
  }

  /** Removes the saved payload. Returns true on success, false when storage fails. */
  clear() {
    if (!this.#storage) return false;
    try {
      this.#storage.removeItem(this.#key);
      return true;
    } catch {
      return false;
    }
  }
}
