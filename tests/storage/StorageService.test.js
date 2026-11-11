import { ProjectManager } from '../../src/js/core/ProjectManager';
import { StorageService } from '../../src/js/storage/StorageService';
import { STORAGE_KEY, STORAGE_VERSION } from '../../src/js/utils/constants';

/** In-memory stand-in for window.localStorage. */
class FakeStorage {
  #data = new Map();

  getItem(key) {
    return this.#data.has(key) ? this.#data.get(key) : null;
  }

  setItem(key, value) {
    this.#data.set(key, String(value));
  }

  removeItem(key) {
    this.#data.delete(key);
  }
}

/** Storage whose every method throws, like a blocked or full localStorage. */
const throwingStorage = {
  getItem() {
    throw new Error('SecurityError');
  },
  setItem() {
    throw new Error('QuotaExceededError');
  },
  removeItem() {
    throw new Error('SecurityError');
  },
};

const sampleState = { projects: [{ id: 'p1', name: 'Inbox', isDefault: true }], activeView: 'x' };

describe('StorageService', () => {
  test('uses the todoui.v1 key by default', () => {
    expect(STORAGE_KEY).toBe('todoui.v1');
    expect(new StorageService(new FakeStorage()).key).toBe(STORAGE_KEY);
  });

  describe('save()', () => {
    test('writes { version: 1, ...state } as JSON under the key', () => {
      const storage = new FakeStorage();
      const service = new StorageService(storage);
      expect(service.save(sampleState)).toBe(true);
      expect(JSON.parse(storage.getItem(STORAGE_KEY))).toEqual({
        version: STORAGE_VERSION,
        ...sampleState,
      });
    });

    test('uses a custom key', () => {
      const storage = new FakeStorage();
      new StorageService(storage, 'custom').save(sampleState);
      expect(storage.getItem('custom')).not.toBeNull();
      expect(storage.getItem(STORAGE_KEY)).toBeNull();
    });

    test('ignores a version passed in the state', () => {
      const storage = new FakeStorage();
      new StorageService(storage).save({ ...sampleState, version: 99 });
      expect(JSON.parse(storage.getItem(STORAGE_KEY)).version).toBe(STORAGE_VERSION);
    });

    test('serializes class instances through their toJSON()', () => {
      const storage = new FakeStorage();
      const manager = new ProjectManager();
      manager.addTodo(null, { title: 'Saved' });
      new StorageService(storage).save(manager.toJSON());
      const saved = JSON.parse(storage.getItem(STORAGE_KEY));
      expect(saved.projects[0].todos[0].title).toBe('Saved');
    });

    test('returns false when storage throws', () => {
      expect(new StorageService(throwingStorage).save(sampleState)).toBe(false);
    });

    test('returns false when the state cannot be serialized', () => {
      const circular = { projects: [] };
      circular.self = circular;
      expect(new StorageService(new FakeStorage()).save(circular)).toBe(false);
    });

    test('returns false without storage', () => {
      expect(new StorageService(null).save(sampleState)).toBe(false);
    });
  });

  describe('load()', () => {
    test('returns what save() wrote', () => {
      const service = new StorageService(new FakeStorage());
      service.save(sampleState);
      expect(service.load()).toEqual({ version: STORAGE_VERSION, ...sampleState });
    });

    test('round-trips a ProjectManager into working class instances', () => {
      const service = new StorageService(new FakeStorage());
      const manager = new ProjectManager();
      const todo = manager.addTodo(null, { title: 'Persist me' });
      service.save(manager.toJSON());

      const restored = ProjectManager.fromJSON(service.load());
      expect(restored.findTodo(todo.id).todo.toggleComplete()).toBe(true);
    });

    test('returns null when nothing is saved', () => {
      expect(new StorageService(new FakeStorage()).load()).toBeNull();
    });

    test.each([
      ['corrupt JSON', '{broken'],
      ['an empty string', ''],
      ['JSON null', 'null'],
      ['a JSON array', '[]'],
      ['a JSON string', '"hello"'],
      ['a JSON number', '42'],
      ['a missing version', JSON.stringify({ projects: [] })],
      ['an unknown version', JSON.stringify({ version: 2, projects: [] })],
      ['a version as string', JSON.stringify({ version: '1', projects: [] })],
      ['missing projects', JSON.stringify({ version: 1 })],
      ['projects not an array', JSON.stringify({ version: 1, projects: {} })],
    ])('returns null for %s', (_, raw) => {
      const storage = new FakeStorage();
      storage.setItem(STORAGE_KEY, raw);
      const service = new StorageService(storage);
      expect(() => service.load()).not.toThrow();
      expect(service.load()).toBeNull();
    });

    test('returns null when storage throws', () => {
      expect(new StorageService(throwingStorage).load()).toBeNull();
    });

    test('returns null without storage', () => {
      expect(new StorageService(undefined).load()).toBeNull();
    });
  });

  describe('clear()', () => {
    test('removes the saved payload', () => {
      const storage = new FakeStorage();
      const service = new StorageService(storage);
      service.save(sampleState);
      expect(service.clear()).toBe(true);
      expect(storage.getItem(STORAGE_KEY)).toBeNull();
      expect(service.load()).toBeNull();
    });

    test('leaves other keys alone', () => {
      const storage = new FakeStorage();
      storage.setItem('other', 'keep');
      new StorageService(storage).clear();
      expect(storage.getItem('other')).toBe('keep');
    });

    test('returns false when storage throws or is missing', () => {
      expect(new StorageService(throwingStorage).clear()).toBe(false);
      expect(new StorageService(null).clear()).toBe(false);
    });
  });
});
