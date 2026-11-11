import { EventBus } from '../../src/js/core/EventBus';
import { ProjectManager } from '../../src/js/core/ProjectManager';
import { hydrateProjectManager } from '../../src/js/core/hydrate';
import { Todo } from '../../src/js/models/Todo';

describe('hydrateProjectManager', () => {
  test('rebuilds a manager from saved data and uses the given bus', () => {
    const original = new ProjectManager();
    const todo = original.addTodo(null, { title: 'Saved' });
    const bus = new EventBus();

    const { manager, restored, error } = hydrateProjectManager(
      { version: 1, ...JSON.parse(JSON.stringify(original)) },
      bus,
    );

    expect(restored).toBe(true);
    expect(error).toBeNull();
    expect(manager.bus).toBe(bus);
    expect(manager.findTodo(todo.id).todo).toBeInstanceOf(Todo);
  });

  test.each([null, undefined])('starts fresh with only the Inbox for %p', (saved) => {
    const { manager, restored, error } = hydrateProjectManager(saved, new EventBus());
    expect(restored).toBe(false);
    expect(error).toBeNull();
    expect(manager.projects.map((p) => p.name)).toEqual(['Inbox']);
  });

  test.each([
    ['a project without a name', { version: 1, projects: [{ id: 'p1' }] }],
    [
      'a todo with an invalid priority',
      { version: 1, projects: [{ name: 'Work', todos: [{ title: 'x', priority: 'urgent' }] }] },
    ],
    ['projects that are not objects', { version: 1, projects: [null] }],
  ])('starts fresh and reports the error for %s', (_, saved) => {
    const bus = new EventBus();
    const { manager, restored, error } = hydrateProjectManager(saved, bus);
    expect(restored).toBe(false);
    expect(error).toBeInstanceOf(Error);
    expect(manager.bus).toBe(bus);
    expect(manager.projects.map((p) => p.name)).toEqual(['Inbox']);
  });
});
