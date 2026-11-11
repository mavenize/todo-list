import { PROJECT_COLORS } from '../utils/constants';
import { createId } from '../utils/id';
import { Todo } from './Todo';

function requireName(value) {
  const name = String(value ?? '').trim();
  if (name === '') {
    throw new TypeError('Project name must be a non-empty string');
  }
  return name;
}

function toTodo(value) {
  return value instanceof Todo ? value : Todo.fromJSON(value);
}

/**
 * A project and the todos that belong to it. Pure data class, no DOM access.
 * Protecting the default (Inbox) project from rename/delete is ProjectManager's job.
 */
export class Project {
  #todos = [];

  constructor({
    id = createId(),
    name,
    color = PROJECT_COLORS[0],
    isDefault = false,
    todos = [],
  } = {}) {
    this.id = id;
    this.name = requireName(name);
    this.color = typeof color === 'string' && color.trim() !== '' ? color : PROJECT_COLORS[0];
    this.isDefault = Boolean(isDefault);
    todos.forEach((todo) => this.addTodo(todo));
  }

  /** A copy of the todos. Add and remove them through the project methods. */
  get todos() {
    return [...this.#todos];
  }

  /**
   * Adds a Todo instance, or builds one from plain fields, and returns it.
   * Throws when a todo with the same id is already in this project.
   */
  addTodo(todoOrFields) {
    const todo = toTodo(todoOrFields);
    if (this.getTodo(todo.id)) {
      throw new Error(`Todo "${todo.id}" is already in project "${this.name}"`);
    }
    this.#todos.push(todo);
    return todo;
  }

  /** Removes a todo by id and returns it, or null when the id is unknown. */
  removeTodo(todoId) {
    const index = this.#todos.findIndex((todo) => todo.id === todoId);
    if (index === -1) return null;
    const [removed] = this.#todos.splice(index, 1);
    return removed;
  }

  /** Returns the todo with this id, or null. */
  getTodo(todoId) {
    return this.#todos.find((todo) => todo.id === todoId) ?? null;
  }

  /** Renames the project and returns the new name. Throws on an empty name. */
  rename(name) {
    this.name = requireName(name);
    return this.name;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      color: this.color,
      isDefault: this.isDefault,
      todos: this.#todos.map((todo) => todo.toJSON()),
    };
  }

  static fromJSON(obj) {
    return new Project(obj);
  }
}
