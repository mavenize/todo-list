import { createId } from '../utils/id';

/** One step in a todo's checklist. Pure data class, no DOM access. */
export class ChecklistItem {
  constructor({ id = createId(), text, done = false } = {}) {
    const trimmed = String(text ?? '').trim();
    if (trimmed === '') {
      throw new TypeError('ChecklistItem text must be a non-empty string');
    }
    this.id = id;
    this.text = trimmed;
    this.done = Boolean(done);
  }

  /** Flips `done` and returns the new value. */
  toggle() {
    this.done = !this.done;
    return this.done;
  }

  toJSON() {
    return { id: this.id, text: this.text, done: this.done };
  }

  static fromJSON(obj) {
    return new ChecklistItem(obj);
  }
}
