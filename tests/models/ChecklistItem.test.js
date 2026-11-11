import { ChecklistItem } from '../../src/js/models/ChecklistItem';

describe('ChecklistItem', () => {
  test('creates an item with a generated id, trimmed text and done = false', () => {
    const item = new ChecklistItem({ text: '  Buy milk  ' });
    expect(typeof item.id).toBe('string');
    expect(item.id.length).toBeGreaterThan(0);
    expect(item.text).toBe('Buy milk');
    expect(item.done).toBe(false);
  });

  test('keeps a given id and done state', () => {
    const item = new ChecklistItem({ id: 'abc', text: 'Step', done: true });
    expect(item.id).toBe('abc');
    expect(item.done).toBe(true);
  });

  test.each([undefined, null, '', '   '])('throws on empty text (%p)', (text) => {
    expect(() => new ChecklistItem({ text })).toThrow(TypeError);
  });

  test('toggle() flips done and returns the new value', () => {
    const item = new ChecklistItem({ text: 'Step' });
    expect(item.toggle()).toBe(true);
    expect(item.done).toBe(true);
    expect(item.toggle()).toBe(false);
    expect(item.done).toBe(false);
  });

  test('toJSON() returns a plain object', () => {
    const item = new ChecklistItem({ id: 'abc', text: 'Step', done: true });
    expect(item.toJSON()).toEqual({ id: 'abc', text: 'Step', done: true });
  });

  test('fromJSON(toJSON()) round-trips into a working instance', () => {
    const original = new ChecklistItem({ text: 'Step' });
    const restored = ChecklistItem.fromJSON(JSON.parse(JSON.stringify(original)));
    expect(restored).toBeInstanceOf(ChecklistItem);
    expect(restored.toJSON()).toEqual(original.toJSON());
    expect(restored.toggle()).toBe(true);
  });
});
