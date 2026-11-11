import { ChecklistItem } from '../../src/js/models/ChecklistItem';
import { Project } from '../../src/js/models/Project';
import { Todo } from '../../src/js/models/Todo';
import { PROJECT_COLORS } from '../../src/js/utils/constants';

describe('Project', () => {
  describe('constructor', () => {
    test('applies defaults for everything except the name', () => {
      const project = new Project({ name: '  Work  ' });
      expect(typeof project.id).toBe('string');
      expect(project.name).toBe('Work');
      expect(project.color).toBe(PROJECT_COLORS[0]);
      expect(project.isDefault).toBe(false);
      expect(project.todos).toEqual([]);
    });

    test('accepts every field and turns plain todos into Todo instances', () => {
      const project = new Project({
        id: 'p1',
        name: 'Inbox',
        color: '#123456',
        isDefault: true,
        todos: [{ id: 't1', title: 'First' }],
      });
      expect(project.id).toBe('p1');
      expect(project.color).toBe('#123456');
      expect(project.isDefault).toBe(true);
      expect(project.todos).toHaveLength(1);
      expect(project.todos[0]).toBeInstanceOf(Todo);
    });

    test.each([undefined, null, '', '   '])('throws on empty name (%p)', (name) => {
      expect(() => new Project({ name })).toThrow(TypeError);
    });

    test.each([undefined, null, '', 42])('falls back to the first color for %p', (color) => {
      expect(new Project({ name: 'x', color }).color).toBe(PROJECT_COLORS[0]);
    });
  });

  describe('addTodo()', () => {
    test('adds a Todo instance and returns the same instance', () => {
      const project = new Project({ name: 'x' });
      const todo = new Todo({ title: 'A' });
      expect(project.addTodo(todo)).toBe(todo);
      expect(project.todos).toEqual([todo]);
    });

    test('builds a Todo from plain fields', () => {
      const project = new Project({ name: 'x' });
      const todo = project.addTodo({ title: 'From fields', priority: 'high' });
      expect(todo).toBeInstanceOf(Todo);
      expect(todo.priority).toBe('high');
      expect(project.getTodo(todo.id)).toBe(todo);
    });

    test('rejects a duplicate id', () => {
      const project = new Project({ name: 'x' });
      const todo = project.addTodo({ title: 'A' });
      expect(() => project.addTodo(todo)).toThrow(/already in project/);
      expect(project.todos).toHaveLength(1);
    });

    test('passes Todo validation errors through', () => {
      const project = new Project({ name: 'x' });
      expect(() => project.addTodo({ title: '' })).toThrow(TypeError);
      expect(() => project.addTodo({ title: 'A', priority: 'urgent' })).toThrow(RangeError);
      expect(project.todos).toHaveLength(0);
    });
  });

  describe('removeTodo()', () => {
    test('removes by id and returns the removed todo', () => {
      const project = new Project({ name: 'x' });
      const a = project.addTodo({ title: 'A' });
      const b = project.addTodo({ title: 'B' });
      expect(project.removeTodo(a.id)).toBe(a);
      expect(project.todos).toEqual([b]);
    });

    test('returns null for an unknown id', () => {
      const project = new Project({ name: 'x' });
      expect(project.removeTodo('missing')).toBeNull();
    });

    test('a removed todo can be added to another project', () => {
      const from = new Project({ name: 'From' });
      const to = new Project({ name: 'To' });
      const todo = from.addTodo({ title: 'Moving' });
      to.addTodo(from.removeTodo(todo.id));
      expect(from.getTodo(todo.id)).toBeNull();
      expect(to.getTodo(todo.id)).toBe(todo);
    });
  });

  test('getTodo() returns the todo or null', () => {
    const project = new Project({ name: 'x' });
    const todo = project.addTodo({ title: 'A' });
    expect(project.getTodo(todo.id)).toBe(todo);
    expect(project.getTodo('missing')).toBeNull();
  });

  describe('rename()', () => {
    test('sets a trimmed name and returns it', () => {
      const project = new Project({ name: 'Old' });
      expect(project.rename('  New  ')).toBe('New');
      expect(project.name).toBe('New');
    });

    test.each([undefined, null, '', '   '])('rejects an empty name (%p)', (name) => {
      const project = new Project({ name: 'Keep' });
      expect(() => project.rename(name)).toThrow(TypeError);
      expect(project.name).toBe('Keep');
    });
  });

  test('the todos getter returns a copy that cannot change the project', () => {
    const project = new Project({ name: 'x' });
    project.addTodo({ title: 'A' });
    const copy = project.todos;
    copy.length = 0;
    expect(project.todos).toHaveLength(1);
  });

  describe('serialization', () => {
    test('toJSON() returns a plain object including serialized todos', () => {
      const project = new Project({ id: 'p1', name: 'Work', color: '#123456' });
      const todo = project.addTodo({ id: 't1', title: 'A', createdAt: 1 });
      expect(project.toJSON()).toEqual({
        id: 'p1',
        name: 'Work',
        color: '#123456',
        isDefault: false,
        todos: [todo.toJSON()],
      });
    });

    test('fromJSON(toJSON()) rehydrates the whole subtree with working methods', () => {
      const original = new Project({ name: 'Work', isDefault: true });
      const todo = original.addTodo({ title: 'Trip', dueDate: '2026-12-01' });
      const step = todo.addChecklistItem('Pack');

      const restored = Project.fromJSON(JSON.parse(JSON.stringify(original)));

      expect(restored).toBeInstanceOf(Project);
      expect(restored.toJSON()).toEqual(original.toJSON());

      const restoredTodo = restored.getTodo(todo.id);
      expect(restoredTodo).toBeInstanceOf(Todo);
      expect(restoredTodo).not.toBe(todo);
      expect(restoredTodo.checklist[0]).toBeInstanceOf(ChecklistItem);
      expect(restoredTodo.toggleChecklistItem(step.id)).toBe(true);
      expect(restored.rename('Renamed')).toBe('Renamed');
      expect(restored.removeTodo(todo.id)).toBe(restoredTodo);
    });
  });
});
