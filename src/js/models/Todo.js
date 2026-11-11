import { DEFAULT_PRIORITY, PRIORITY_LIST } from '../utils/constants';
import { normalizeDueDate } from '../utils/dateFormat';
import { createId } from '../utils/id';
import { ChecklistItem } from './ChecklistItem';

/** Fields that `update()` may change. `id`, `createdAt` and the checklist have their own rules. */
const EDITABLE_FIELDS = Object.freeze([
  'title',
  'description',
  'dueDate',
  'priority',
  'notes',
  'completed',
  'important',
]);

function toText(value) {
  return String(value ?? '');
}

function requireTitle(value) {
  const title = toText(value).trim();
  if (title === '') {
    throw new TypeError('Todo title must be a non-empty string');
  }
  return title;
}

/** A single todo. Pure data class, no DOM access. */
export class Todo {
  #checklist = [];

  constructor({
    id = createId(),
    title,
    description = '',
    dueDate = null,
    priority = DEFAULT_PRIORITY,
    notes = '',
    checklist = [],
    completed = false,
    important = false,
    createdAt = Date.now(),
  } = {}) {
    this.id = id;
    this.title = requireTitle(title);
    this.description = toText(description);
    this.dueDate = normalizeDueDate(dueDate);
    this.setPriority(priority);
    this.notes = toText(notes);
    this.completed = Boolean(completed);
    this.important = Boolean(important);
    this.createdAt = createdAt;
    this.#checklist = checklist.map((item) =>
      item instanceof ChecklistItem ? item : ChecklistItem.fromJSON(item),
    );
  }

  /** A copy of the checklist items. Change items through the checklist methods. */
  get checklist() {
    return [...this.#checklist];
  }

  /**
   * Applies the given fields and returns `this`. Unknown fields are ignored.
   * Values are validated the same way as in the constructor.
   */
  update(fields = {}) {
    for (const key of EDITABLE_FIELDS) {
      if (!Object.hasOwn(fields, key)) continue;
      const value = fields[key];
      switch (key) {
        case 'title':
          this.title = requireTitle(value);
          break;
        case 'dueDate':
          this.dueDate = normalizeDueDate(value);
          break;
        case 'priority':
          this.setPriority(value);
          break;
        case 'completed':
        case 'important':
          this[key] = Boolean(value);
          break;
        default:
          this[key] = toText(value);
      }
    }
    return this;
  }

  /** Flips `completed` and returns the new value. */
  toggleComplete() {
    this.completed = !this.completed;
    return this.completed;
  }

  /** Flips `important` (the star) and returns the new value. */
  toggleImportant() {
    this.important = !this.important;
    return this.important;
  }

  /** Sets the priority. Throws a RangeError for anything other than low, medium or high. */
  setPriority(priority) {
    if (!PRIORITY_LIST.includes(priority)) {
      throw new RangeError(
        `Invalid priority "${priority}". Expected one of: ${PRIORITY_LIST.join(', ')}`,
      );
    }
    this.priority = priority;
    return this.priority;
  }

  /** Adds a step and returns the new ChecklistItem. */
  addChecklistItem(text) {
    const item = new ChecklistItem({ text });
    this.#checklist.push(item);
    return item;
  }

  /** Toggles a step. Returns its new `done` value, or null when the id is unknown. */
  toggleChecklistItem(itemId) {
    const item = this.#checklist.find((entry) => entry.id === itemId);
    return item ? item.toggle() : null;
  }

  /** Removes a step. Returns true when something was removed. */
  removeChecklistItem(itemId) {
    const index = this.#checklist.findIndex((entry) => entry.id === itemId);
    if (index === -1) return false;
    this.#checklist.splice(index, 1);
    return true;
  }

  toJSON() {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      dueDate: this.dueDate,
      priority: this.priority,
      notes: this.notes,
      checklist: this.#checklist.map((item) => item.toJSON()),
      completed: this.completed,
      important: this.important,
      createdAt: this.createdAt,
    };
  }

  static fromJSON(obj) {
    return new Todo(obj);
  }
}
