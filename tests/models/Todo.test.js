import { ChecklistItem } from '../../src/js/models/ChecklistItem';
import { Todo } from '../../src/js/models/Todo';
import { DEFAULT_PRIORITY, PRIORITIES } from '../../src/js/utils/constants';

describe('Todo', () => {
  describe('constructor', () => {
    test('applies defaults for everything except the title', () => {
      const todo = new Todo({ title: '  Write report  ' });
      expect(typeof todo.id).toBe('string');
      expect(todo.title).toBe('Write report');
      expect(todo.description).toBe('');
      expect(todo.dueDate).toBeNull();
      expect(todo.priority).toBe(DEFAULT_PRIORITY);
      expect(todo.notes).toBe('');
      expect(todo.checklist).toEqual([]);
      expect(todo.completed).toBe(false);
      expect(todo.important).toBe(false);
      expect(typeof todo.createdAt).toBe('number');
    });

    test('accepts every field', () => {
      const todo = new Todo({
        id: 't1',
        title: 'Plan trip',
        description: 'Summer holiday',
        dueDate: '2026-12-01',
        priority: PRIORITIES.HIGH,
        notes: 'Check flights',
        checklist: [{ id: 'c1', text: 'Book hotel', done: true }],
        completed: true,
        important: true,
        createdAt: 123,
      });
      expect(todo.id).toBe('t1');
      expect(todo.description).toBe('Summer holiday');
      expect(todo.dueDate).toBe('2026-12-01');
      expect(todo.priority).toBe('high');
      expect(todo.notes).toBe('Check flights');
      expect(todo.checklist).toHaveLength(1);
      expect(todo.checklist[0]).toBeInstanceOf(ChecklistItem);
      expect(todo.completed).toBe(true);
      expect(todo.important).toBe(true);
      expect(todo.createdAt).toBe(123);
    });

    test.each([undefined, null, '', '   '])('throws on empty title (%p)', (title) => {
      expect(() => new Todo({ title })).toThrow(TypeError);
    });

    test('throws on invalid priority', () => {
      expect(() => new Todo({ title: 'x', priority: 'urgent' })).toThrow(RangeError);
    });

    test('normalizes invalid due dates to null', () => {
      expect(new Todo({ title: 'x', dueDate: 'not a date' }).dueDate).toBeNull();
      expect(new Todo({ title: 'x', dueDate: '' }).dueDate).toBeNull();
    });
  });

  describe('update()', () => {
    test('changes the given fields and returns the todo', () => {
      const todo = new Todo({ title: 'Old' });
      const result = todo.update({
        title: 'New',
        description: 'Desc',
        dueDate: '2026-11-20',
        priority: PRIORITIES.LOW,
        notes: 'Note',
        completed: true,
        important: true,
      });
      expect(result).toBe(todo);
      expect(todo).toMatchObject({
        title: 'New',
        description: 'Desc',
        dueDate: '2026-11-20',
        priority: 'low',
        notes: 'Note',
        completed: true,
        important: true,
      });
    });

    test('leaves fields it was not given unchanged', () => {
      const todo = new Todo({ title: 'Keep', notes: 'Keep notes', priority: PRIORITIES.HIGH });
      todo.update({ description: 'Only this' });
      expect(todo.title).toBe('Keep');
      expect(todo.notes).toBe('Keep notes');
      expect(todo.priority).toBe('high');
    });

    test('ignores id, createdAt, checklist and unknown fields', () => {
      const todo = new Todo({ id: 't1', title: 'x', createdAt: 1 });
      todo.update({ id: 'other', createdAt: 2, checklist: [{ text: 'y' }], foo: 'bar' });
      expect(todo.id).toBe('t1');
      expect(todo.createdAt).toBe(1);
      expect(todo.checklist).toEqual([]);
      expect(todo).not.toHaveProperty('foo');
    });

    test('clears the due date when given null or an empty string', () => {
      const todo = new Todo({ title: 'x', dueDate: '2026-11-20' });
      todo.update({ dueDate: '' });
      expect(todo.dueDate).toBeNull();
    });

    test('rejects an empty title and an invalid priority', () => {
      const todo = new Todo({ title: 'x' });
      expect(() => todo.update({ title: ' ' })).toThrow(TypeError);
      expect(() => todo.update({ priority: 'urgent' })).toThrow(RangeError);
      expect(todo.title).toBe('x');
      expect(todo.priority).toBe(DEFAULT_PRIORITY);
    });
  });

  test('toggleComplete() flips completed and returns the new value', () => {
    const todo = new Todo({ title: 'x' });
    expect(todo.toggleComplete()).toBe(true);
    expect(todo.completed).toBe(true);
    expect(todo.toggleComplete()).toBe(false);
  });

  test('toggleImportant() flips important and returns the new value', () => {
    const todo = new Todo({ title: 'x' });
    expect(todo.toggleImportant()).toBe(true);
    expect(todo.important).toBe(true);
    expect(todo.toggleImportant()).toBe(false);
  });

  describe('setPriority()', () => {
    test.each(Object.values(PRIORITIES))('accepts %s', (priority) => {
      const todo = new Todo({ title: 'x' });
      expect(todo.setPriority(priority)).toBe(priority);
      expect(todo.priority).toBe(priority);
    });

    test.each(['urgent', '', null, undefined, 'HIGH'])('rejects %p', (priority) => {
      const todo = new Todo({ title: 'x', priority: PRIORITIES.LOW });
      expect(() => todo.setPriority(priority)).toThrow(RangeError);
      expect(todo.priority).toBe('low');
    });
  });

  describe('checklist', () => {
    test('addChecklistItem() appends and returns a ChecklistItem', () => {
      const todo = new Todo({ title: 'x' });
      const item = todo.addChecklistItem('Step 1');
      expect(item).toBeInstanceOf(ChecklistItem);
      expect(item.text).toBe('Step 1');
      expect(todo.checklist).toEqual([item]);
    });

    test('addChecklistItem() rejects empty text', () => {
      const todo = new Todo({ title: 'x' });
      expect(() => todo.addChecklistItem('  ')).toThrow(TypeError);
      expect(todo.checklist).toHaveLength(0);
    });

    test('toggleChecklistItem() toggles by id and returns the new state', () => {
      const todo = new Todo({ title: 'x' });
      const item = todo.addChecklistItem('Step');
      expect(todo.toggleChecklistItem(item.id)).toBe(true);
      expect(item.done).toBe(true);
      expect(todo.toggleChecklistItem(item.id)).toBe(false);
    });

    test('toggleChecklistItem() returns null for an unknown id', () => {
      const todo = new Todo({ title: 'x' });
      expect(todo.toggleChecklistItem('missing')).toBeNull();
    });

    test('removeChecklistItem() removes by id and reports the result', () => {
      const todo = new Todo({ title: 'x' });
      const a = todo.addChecklistItem('A');
      const b = todo.addChecklistItem('B');
      expect(todo.removeChecklistItem(a.id)).toBe(true);
      expect(todo.checklist).toEqual([b]);
      expect(todo.removeChecklistItem('missing')).toBe(false);
    });

    test('the checklist getter returns a copy that cannot change the todo', () => {
      const todo = new Todo({ title: 'x' });
      todo.addChecklistItem('A');
      const copy = todo.checklist;
      copy.push(new ChecklistItem({ text: 'Sneaky' }));
      copy.length = 0;
      expect(todo.checklist).toHaveLength(1);
    });
  });

  describe('serialization', () => {
    test('toJSON() returns a plain object with every field', () => {
      const todo = new Todo({
        id: 't1',
        title: 'x',
        dueDate: '2026-11-20',
        priority: PRIORITIES.HIGH,
        checklist: [{ id: 'c1', text: 'Step', done: false }],
        createdAt: 5,
      });
      expect(todo.toJSON()).toEqual({
        id: 't1',
        title: 'x',
        description: '',
        dueDate: '2026-11-20',
        priority: 'high',
        notes: '',
        checklist: [{ id: 'c1', text: 'Step', done: false }],
        completed: false,
        important: false,
        createdAt: 5,
      });
    });

    test('JSON.stringify includes the private checklist', () => {
      const todo = new Todo({ title: 'x' });
      todo.addChecklistItem('Step');
      expect(JSON.parse(JSON.stringify(todo)).checklist).toHaveLength(1);
    });

    test('fromJSON(toJSON()) restores a todo with working methods', () => {
      const original = new Todo({ title: 'Trip', dueDate: '2026-12-01', important: true });
      const step = original.addChecklistItem('Pack');
      const restored = Todo.fromJSON(JSON.parse(JSON.stringify(original)));

      expect(restored).toBeInstanceOf(Todo);
      expect(restored).not.toBe(original);
      expect(restored.toJSON()).toEqual(original.toJSON());
      expect(restored.checklist[0]).toBeInstanceOf(ChecklistItem);

      expect(restored.toggleComplete()).toBe(true);
      expect(restored.toggleChecklistItem(step.id)).toBe(true);
      expect(restored.update({ title: 'Renamed' }).title).toBe('Renamed');
      expect(original.title).toBe('Trip');
    });
  });
});
