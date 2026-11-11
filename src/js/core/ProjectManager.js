import { Project } from '../models/Project';
import { DEFAULT_PROJECT, EVENTS, PROJECT_COLORS } from '../utils/constants';
import { EventBus } from './EventBus';

/**
 * The single entry point for every state change. No DOM access.
 *
 * - There is always exactly one default (Inbox) project. It can't be renamed or deleted.
 * - Every successful mutation emits `state:changed` with `{ action, projectId?, todoId? }`.
 * - Invalid input throws before anything changes, and then nothing is emitted.
 */
export class ProjectManager {
  #projects = [];
  #bus;

  constructor({ bus = new EventBus(), projects = [] } = {}) {
    this.#bus = bus;
    this.#projects = projects.map((p) => (p instanceof Project ? p : Project.fromJSON(p)));
    this.#ensureDefaultProject();
  }

  get bus() {
    return this.#bus;
  }

  /** A copy of the projects, Inbox first. */
  get projects() {
    return [...this.#projects];
  }

  get defaultProject() {
    return this.#projects.find((project) => project.isDefault);
  }

  /** Returns the project with this id, or null. */
  getProject(projectId) {
    return this.#projects.find((project) => project.id === projectId) ?? null;
  }

  /** Returns `{ project, todo }` for the todo with this id, or null. */
  findTodo(todoId) {
    for (const project of this.#projects) {
      const todo = project.getTodo(todoId);
      if (todo) return { project, todo };
    }
    return null;
  }

  // ---- Projects ----

  /** Creates a project. Without a color, the next palette color is used. */
  createProject({ name, color } = {}) {
    const project = new Project({ name, color: color ?? this.#nextColor() });
    this.#projects.push(project);
    this.#emit('createProject', { projectId: project.id });
    return project;
  }

  renameProject(projectId, name) {
    const project = this.#requireEditableProject(projectId, 'renamed');
    project.rename(name);
    this.#emit('renameProject', { projectId });
    return project;
  }

  /** Deletes a project and all its todos. Returns the deleted project. */
  deleteProject(projectId) {
    const project = this.#requireEditableProject(projectId, 'deleted');
    this.#projects.splice(this.#projects.indexOf(project), 1);
    this.#emit('deleteProject', { projectId });
    return project;
  }

  // ---- Todos ----

  /** Adds a todo built from `data` to a project (the Inbox when projectId is null). */
  addTodo(projectId, data) {
    const project =
      projectId === null || projectId === undefined
        ? this.defaultProject
        : this.#requireProject(projectId);
    const todo = project.addTodo({ ...data, id: undefined, createdAt: undefined });
    this.#emit('addTodo', { projectId: project.id, todoId: todo.id });
    return todo;
  }

  updateTodo(todoId, fields) {
    const { project, todo } = this.#requireTodo(todoId);
    todo.update(fields);
    this.#emit('updateTodo', { projectId: project.id, todoId });
    return todo;
  }

  /** Deletes a todo. Returns the deleted todo. */
  deleteTodo(todoId) {
    const { project, todo } = this.#requireTodo(todoId);
    project.removeTodo(todoId);
    this.#emit('deleteTodo', { projectId: project.id, todoId });
    return todo;
  }

  /** Returns the new `completed` value. */
  toggleTodoComplete(todoId) {
    const { project, todo } = this.#requireTodo(todoId);
    const completed = todo.toggleComplete();
    this.#emit('toggleTodoComplete', { projectId: project.id, todoId });
    return completed;
  }

  /** Returns the new `important` value. */
  toggleTodoImportant(todoId) {
    const { project, todo } = this.#requireTodo(todoId);
    const important = todo.toggleImportant();
    this.#emit('toggleTodoImportant', { projectId: project.id, todoId });
    return important;
  }

  /** Moves a todo to another project. Moving to its own project is a no-op without an event. */
  moveTodo(todoId, toProjectId) {
    const { project: from, todo } = this.#requireTodo(todoId);
    const to = this.#requireProject(toProjectId);
    if (from === to) return todo;
    from.removeTodo(todoId);
    to.addTodo(todo);
    this.#emit('moveTodo', { projectId: to.id, fromProjectId: from.id, todoId });
    return todo;
  }

  // ---- Checklist steps ----

  /** Adds a step and returns the new ChecklistItem. */
  addChecklistItem(todoId, text) {
    const { project, todo } = this.#requireTodo(todoId);
    const item = todo.addChecklistItem(text);
    this.#emit('addChecklistItem', { projectId: project.id, todoId });
    return item;
  }

  /** Returns the step's new `done` value. Throws for an unknown step. */
  toggleChecklistItem(todoId, itemId) {
    const { project, todo } = this.#requireTodo(todoId);
    const done = todo.toggleChecklistItem(itemId);
    if (done === null) throw new Error(`Checklist item "${itemId}" not found`);
    this.#emit('toggleChecklistItem', { projectId: project.id, todoId });
    return done;
  }

  /** Throws for an unknown step. */
  removeChecklistItem(todoId, itemId) {
    const { project, todo } = this.#requireTodo(todoId);
    if (!todo.removeChecklistItem(itemId)) {
      throw new Error(`Checklist item "${itemId}" not found`);
    }
    this.#emit('removeChecklistItem', { projectId: project.id, todoId });
  }

  // ---- Serialization ----

  toJSON() {
    return { projects: this.#projects.map((project) => project.toJSON()) };
  }

  /** Rebuilds the whole tree as class instances. Throws on malformed data. */
  static fromJSON(data, bus) {
    if (!data || !Array.isArray(data.projects)) {
      throw new TypeError('ProjectManager data must have a projects array');
    }
    return new ProjectManager({ bus, projects: data.projects });
  }

  // ---- Internals ----

  #emit(action, details) {
    this.#bus.emit(EVENTS.STATE_CHANGED, { action, ...details });
  }

  /** Keeps exactly one default project, first in the list. Creates the Inbox when missing. */
  #ensureDefaultProject() {
    const defaults = this.#projects.filter((project) => project.isDefault);
    defaults.slice(1).forEach((project) => {
      project.isDefault = false;
    });
    let inbox = defaults[0];
    if (!inbox) {
      inbox = new Project({ ...DEFAULT_PROJECT, isDefault: true });
    } else {
      this.#projects.splice(this.#projects.indexOf(inbox), 1);
    }
    this.#projects.unshift(inbox);
  }

  #nextColor() {
    const custom = this.#projects.length - 1;
    return PROJECT_COLORS[custom % PROJECT_COLORS.length];
  }

  #requireProject(projectId) {
    const project = this.getProject(projectId);
    if (!project) throw new Error(`Project "${projectId}" not found`);
    return project;
  }

  #requireEditableProject(projectId, verb) {
    const project = this.#requireProject(projectId);
    if (project.isDefault) {
      throw new Error(`The default project "${project.name}" cannot be ${verb}`);
    }
    return project;
  }

  #requireTodo(todoId) {
    const found = this.findTodo(todoId);
    if (!found) throw new Error(`Todo "${todoId}" not found`);
    return found;
  }
}
