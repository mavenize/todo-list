import { EventBus } from '../../src/js/core/EventBus';
import { ProjectManager } from '../../src/js/core/ProjectManager';
import { ChecklistItem } from '../../src/js/models/ChecklistItem';
import { Project } from '../../src/js/models/Project';
import { Todo } from '../../src/js/models/Todo';
import { DEFAULT_PROJECT, EVENTS, PROJECT_COLORS } from '../../src/js/utils/constants';

/** A manager whose emitted `state:changed` payloads are collected in `events`. */
function setup(options = {}) {
  const bus = new EventBus();
  const events = [];
  bus.on(EVENTS.STATE_CHANGED, (payload) => events.push(payload));
  const manager = new ProjectManager({ bus, ...options });
  return { bus, events, manager };
}

describe('ProjectManager', () => {
  describe('default Inbox project', () => {
    test('a new manager has only the Inbox', () => {
      const { manager } = setup();
      expect(manager.projects).toHaveLength(1);
      const inbox = manager.defaultProject;
      expect(inbox).toBeInstanceOf(Project);
      expect(inbox.isDefault).toBe(true);
      expect(inbox.name).toBe(DEFAULT_PROJECT.name);
      expect(inbox.color).toBe(DEFAULT_PROJECT.color);
    });

    test('creates the Inbox first when the given projects have no default', () => {
      const { manager } = setup({ projects: [{ name: 'Work' }] });
      expect(manager.projects.map((p) => p.name)).toEqual(['Inbox', 'Work']);
    });

    test('keeps an existing default project and moves it first', () => {
      const { manager } = setup({
        projects: [{ name: 'Work' }, { id: 'inbox', name: 'Inbox', isDefault: true }],
      });
      expect(manager.projects.map((p) => p.id)[0]).toBe('inbox');
      expect(manager.projects).toHaveLength(2);
    });

    test('keeps only the first of several default projects', () => {
      const { manager } = setup({
        projects: [
          { id: 'a', name: 'A', isDefault: true },
          { id: 'b', name: 'B', isDefault: true },
        ],
      });
      expect(manager.projects.filter((p) => p.isDefault).map((p) => p.id)).toEqual(['a']);
    });

    test('cannot be renamed or deleted', () => {
      const { events, manager } = setup();
      const inboxId = manager.defaultProject.id;
      expect(() => manager.renameProject(inboxId, 'Other')).toThrow(/cannot be renamed/);
      expect(() => manager.deleteProject(inboxId)).toThrow(/cannot be deleted/);
      expect(manager.defaultProject.name).toBe('Inbox');
      expect(events).toEqual([]);
    });

    test('creating the Inbox emits nothing', () => {
      const { events } = setup();
      expect(events).toEqual([]);
    });
  });

  test('uses a new EventBus when none is given', () => {
    expect(new ProjectManager().bus).toBeInstanceOf(EventBus);
  });

  test('the projects getter returns a copy', () => {
    const { manager } = setup();
    manager.projects.length = 0;
    expect(manager.projects).toHaveLength(1);
  });

  test('getProject() returns the project or null', () => {
    const { manager } = setup();
    const inbox = manager.defaultProject;
    expect(manager.getProject(inbox.id)).toBe(inbox);
    expect(manager.getProject('missing')).toBeNull();
  });

  describe('projects', () => {
    test('createProject() adds a project and emits', () => {
      const { events, manager } = setup();
      const project = manager.createProject({ name: 'Work', color: '#123456' });
      expect(project).toBeInstanceOf(Project);
      expect(project.isDefault).toBe(false);
      expect(project.color).toBe('#123456');
      expect(manager.projects).toContain(project);
      expect(events).toEqual([{ action: 'createProject', projectId: project.id }]);
    });

    test('createProject() cycles through the palette when no color is given', () => {
      const { manager } = setup();
      const colors = PROJECT_COLORS.map((_, i) => manager.createProject({ name: `P${i}` }).color);
      expect(colors).toEqual([...PROJECT_COLORS]);
      expect(manager.createProject({ name: 'Wrap' }).color).toBe(PROJECT_COLORS[0]);
    });

    test('createProject() with an empty name throws and emits nothing', () => {
      const { events, manager } = setup();
      expect(() => manager.createProject({ name: ' ' })).toThrow(TypeError);
      expect(manager.projects).toHaveLength(1);
      expect(events).toEqual([]);
    });

    test('renameProject() renames and emits', () => {
      const { events, manager } = setup();
      const project = manager.createProject({ name: 'Old' });
      events.length = 0;
      expect(manager.renameProject(project.id, 'New')).toBe(project);
      expect(project.name).toBe('New');
      expect(events).toEqual([{ action: 'renameProject', projectId: project.id }]);
    });

    test('renameProject() with an empty name throws and emits nothing', () => {
      const { events, manager } = setup();
      const project = manager.createProject({ name: 'Keep' });
      events.length = 0;
      expect(() => manager.renameProject(project.id, '')).toThrow(TypeError);
      expect(project.name).toBe('Keep');
      expect(events).toEqual([]);
    });

    test('deleteProject() removes the project with its todos and emits', () => {
      const { events, manager } = setup();
      const project = manager.createProject({ name: 'Work' });
      const todo = manager.addTodo(project.id, { title: 'A' });
      events.length = 0;
      expect(manager.deleteProject(project.id)).toBe(project);
      expect(manager.getProject(project.id)).toBeNull();
      expect(manager.findTodo(todo.id)).toBeNull();
      expect(events).toEqual([{ action: 'deleteProject', projectId: project.id }]);
    });

    test.each([
      ['renameProject', (m) => m.renameProject('missing', 'x')],
      ['deleteProject', (m) => m.deleteProject('missing')],
    ])('%s() throws for an unknown project', (_, call) => {
      const { events, manager } = setup();
      expect(() => call(manager)).toThrow(/not found/);
      expect(events).toEqual([]);
    });
  });

  describe('todos', () => {
    test('addTodo() adds to the given project, returns a Todo and emits', () => {
      const { events, manager } = setup();
      const project = manager.createProject({ name: 'Work' });
      events.length = 0;
      const todo = manager.addTodo(project.id, { title: 'A', priority: 'high' });
      expect(todo).toBeInstanceOf(Todo);
      expect(project.getTodo(todo.id)).toBe(todo);
      expect(events).toEqual([{ action: 'addTodo', projectId: project.id, todoId: todo.id }]);
    });

    test('addTodo() with a null project id adds to the Inbox', () => {
      const { manager } = setup();
      const todo = manager.addTodo(null, { title: 'A' });
      expect(manager.defaultProject.getTodo(todo.id)).toBe(todo);
    });

    test('addTodo() always generates a fresh id and createdAt', () => {
      const { manager } = setup();
      const todo = manager.addTodo(null, { title: 'A', id: 'forced', createdAt: 1 });
      expect(todo.id).not.toBe('forced');
      expect(todo.createdAt).not.toBe(1);
    });

    test('addTodo() throws for an unknown project or invalid data and emits nothing', () => {
      const { events, manager } = setup();
      expect(() => manager.addTodo('missing', { title: 'A' })).toThrow(/not found/);
      expect(() => manager.addTodo(null, { title: '' })).toThrow(TypeError);
      expect(() => manager.addTodo(null, { title: 'A', priority: 'x' })).toThrow(RangeError);
      expect(manager.defaultProject.todos).toHaveLength(0);
      expect(events).toEqual([]);
    });

    test('updateTodo() updates fields and emits', () => {
      const { events, manager } = setup();
      const todo = manager.addTodo(null, { title: 'A' });
      events.length = 0;
      expect(manager.updateTodo(todo.id, { title: 'B', notes: 'n' })).toBe(todo);
      expect(todo.title).toBe('B');
      expect(todo.notes).toBe('n');
      expect(events).toEqual([
        { action: 'updateTodo', projectId: manager.defaultProject.id, todoId: todo.id },
      ]);
    });

    test('updateTodo() with invalid fields throws and emits nothing', () => {
      const { events, manager } = setup();
      const todo = manager.addTodo(null, { title: 'A' });
      events.length = 0;
      expect(() => manager.updateTodo(todo.id, { priority: 'x' })).toThrow(RangeError);
      expect(events).toEqual([]);
    });

    test('deleteTodo() removes the todo, returns it and emits', () => {
      const { events, manager } = setup();
      const todo = manager.addTodo(null, { title: 'A' });
      events.length = 0;
      expect(manager.deleteTodo(todo.id)).toBe(todo);
      expect(manager.findTodo(todo.id)).toBeNull();
      expect(events).toEqual([
        { action: 'deleteTodo', projectId: manager.defaultProject.id, todoId: todo.id },
      ]);
    });

    test('toggleTodoComplete() and toggleTodoImportant() return the new value and emit', () => {
      const { events, manager } = setup();
      const todo = manager.addTodo(null, { title: 'A' });
      events.length = 0;
      expect(manager.toggleTodoComplete(todo.id)).toBe(true);
      expect(manager.toggleTodoImportant(todo.id)).toBe(true);
      expect(manager.toggleTodoComplete(todo.id)).toBe(false);
      expect(events.map((e) => e.action)).toEqual([
        'toggleTodoComplete',
        'toggleTodoImportant',
        'toggleTodoComplete',
      ]);
    });

    test('findTodo() returns { project, todo } or null', () => {
      const { manager } = setup();
      const project = manager.createProject({ name: 'Work' });
      const todo = manager.addTodo(project.id, { title: 'A' });
      expect(manager.findTodo(todo.id)).toEqual({ project, todo });
      expect(manager.findTodo('missing')).toBeNull();
    });

    test.each([
      ['updateTodo', (m) => m.updateTodo('missing', { title: 'x' })],
      ['deleteTodo', (m) => m.deleteTodo('missing')],
      ['toggleTodoComplete', (m) => m.toggleTodoComplete('missing')],
      ['toggleTodoImportant', (m) => m.toggleTodoImportant('missing')],
      ['moveTodo', (m) => m.moveTodo('missing', m.defaultProject.id)],
      ['addChecklistItem', (m) => m.addChecklistItem('missing', 'x')],
      ['toggleChecklistItem', (m) => m.toggleChecklistItem('missing', 'x')],
      ['removeChecklistItem', (m) => m.removeChecklistItem('missing', 'x')],
    ])('%s() throws for an unknown todo and emits nothing', (_, call) => {
      const { events, manager } = setup();
      expect(() => call(manager)).toThrow(/not found/);
      expect(events).toEqual([]);
    });
  });

  describe('moveTodo()', () => {
    test('moves the same instance to another project and emits', () => {
      const { events, manager } = setup();
      const inbox = manager.defaultProject;
      const work = manager.createProject({ name: 'Work' });
      const todo = manager.addTodo(null, { title: 'A' });
      events.length = 0;

      expect(manager.moveTodo(todo.id, work.id)).toBe(todo);
      expect(inbox.getTodo(todo.id)).toBeNull();
      expect(work.getTodo(todo.id)).toBe(todo);
      expect(manager.findTodo(todo.id).project).toBe(work);
      expect(events).toEqual([
        { action: 'moveTodo', projectId: work.id, fromProjectId: inbox.id, todoId: todo.id },
      ]);
    });

    test('moving to the same project is a no-op without an event', () => {
      const { events, manager } = setup();
      const todo = manager.addTodo(null, { title: 'A' });
      events.length = 0;
      expect(manager.moveTodo(todo.id, manager.defaultProject.id)).toBe(todo);
      expect(manager.defaultProject.todos).toEqual([todo]);
      expect(events).toEqual([]);
    });

    test('throws for an unknown target project and leaves the todo in place', () => {
      const { events, manager } = setup();
      const todo = manager.addTodo(null, { title: 'A' });
      events.length = 0;
      expect(() => manager.moveTodo(todo.id, 'missing')).toThrow(/not found/);
      expect(manager.defaultProject.getTodo(todo.id)).toBe(todo);
      expect(events).toEqual([]);
    });
  });

  describe('checklist steps', () => {
    test('add, toggle and remove a step, emitting each time', () => {
      const { events, manager } = setup();
      const todo = manager.addTodo(null, { title: 'A' });
      events.length = 0;

      const item = manager.addChecklistItem(todo.id, 'Step');
      expect(item).toBeInstanceOf(ChecklistItem);
      expect(todo.checklist).toEqual([item]);
      expect(manager.toggleChecklistItem(todo.id, item.id)).toBe(true);
      manager.removeChecklistItem(todo.id, item.id);
      expect(todo.checklist).toEqual([]);

      expect(events.map((e) => e.action)).toEqual([
        'addChecklistItem',
        'toggleChecklistItem',
        'removeChecklistItem',
      ]);
      expect(events.every((e) => e.todoId === todo.id)).toBe(true);
    });

    test('invalid text or an unknown step throws and emits nothing', () => {
      const { events, manager } = setup();
      const todo = manager.addTodo(null, { title: 'A' });
      events.length = 0;
      expect(() => manager.addChecklistItem(todo.id, ' ')).toThrow(TypeError);
      expect(() => manager.toggleChecklistItem(todo.id, 'missing')).toThrow(/not found/);
      expect(() => manager.removeChecklistItem(todo.id, 'missing')).toThrow(/not found/);
      expect(events).toEqual([]);
    });
  });

  describe('serialization', () => {
    test('toJSON() returns { projects } as plain objects', () => {
      const { manager } = setup();
      const work = manager.createProject({ name: 'Work' });
      manager.addTodo(work.id, { title: 'A' });
      const json = manager.toJSON();
      expect(Object.keys(json)).toEqual(['projects']);
      expect(json.projects).toEqual(manager.projects.map((p) => p.toJSON()));
    });

    test('fromJSON(toJSON()) rebuilds the whole tree with working methods', () => {
      const { manager } = setup();
      const work = manager.createProject({ name: 'Work', color: '#123456' });
      const todo = manager.addTodo(work.id, { title: 'Trip', dueDate: '2026-12-01' });
      const step = manager.addChecklistItem(todo.id, 'Pack');

      const bus = new EventBus();
      const events = [];
      bus.on(EVENTS.STATE_CHANGED, (e) => events.push(e));
      const restored = ProjectManager.fromJSON(JSON.parse(JSON.stringify(manager)), bus);

      expect(restored).toBeInstanceOf(ProjectManager);
      expect(restored.bus).toBe(bus);
      expect(restored.toJSON()).toEqual(manager.toJSON());
      expect(restored.defaultProject.id).toBe(manager.defaultProject.id);

      const found = restored.findTodo(todo.id);
      expect(found.project).toBeInstanceOf(Project);
      expect(found.todo).toBeInstanceOf(Todo);
      expect(found.todo.checklist[0]).toBeInstanceOf(ChecklistItem);

      expect(restored.toggleChecklistItem(todo.id, step.id)).toBe(true);
      restored.moveTodo(todo.id, restored.defaultProject.id);
      expect(events.map((e) => e.action)).toEqual(['toggleChecklistItem', 'moveTodo']);
      expect(manager.findTodo(todo.id).project.id).toBe(work.id);
    });

    test.each([null, undefined, {}, { projects: 'nope' }])(
      'fromJSON(%p) throws a TypeError',
      (data) => {
        expect(() => ProjectManager.fromJSON(data)).toThrow(TypeError);
      },
    );
  });
});
