import { clear, el, preserveFocus } from '../dom';
import { iconElement } from '../icons';
import { DropdownMenu } from './DropdownMenu';
import { priorityField } from './priorityField';

/**
 * @typedef {object} TodoDetail Plain data for the detail pane (built by App).
 * @property {{ id: string, title: string, description: string, dueDate: string|null,
 *   priority: string, completed: boolean, important: boolean, notes: string,
 *   checklist: ReadonlyArray<{ id: string, text: string, done: boolean }> }} todo
 * @property {string} projectId
 * @property {ReadonlyArray<{ id: string, name: string }>} projects choices for "move to project"
 */

const PRIORITY_CLASSES = ['priority--low', 'priority--medium', 'priority--high'];

/**
 * Right pane: view and edit one todo. Edits are saved on change/blur through callbacks;
 * the component never changes state itself.
 *
 * The form is built once per selected todo. Later renders of the same todo only patch the
 * values (skipping the field that has focus), so saving one field never replaces the field
 * the user is moving to, and focus and caret stay where they are.
 */
export class TodoDetailView {
  #root;
  #callbacks;
  #data = null;
  #refs = null;
  #showingPlaceholder = false;

  /**
   * @param {HTMLElement} root the detail pane
   * @param {object} callbacks
   * @param {(todoId: string, fields: object) => void} callbacks.onUpdate
   * @param {(todoId: string) => void} callbacks.onToggleComplete
   * @param {(todoId: string) => void} callbacks.onToggleImportant
   * @param {(todoId: string, projectId: string) => void} callbacks.onMove
   * @param {(todoId: string) => void} callbacks.onDelete asks for confirmation, then deletes
   * @param {(todoId: string, text: string) => void} callbacks.onAddStep
   * @param {(todoId: string, itemId: string) => void} callbacks.onToggleStep
   * @param {(todoId: string, itemId: string) => void} callbacks.onRemoveStep
   */
  constructor(root, callbacks) {
    this.#root = root;
    this.#callbacks = callbacks;
  }

  /** @param {TodoDetail|null} data null when no todo is selected */
  render(data) {
    if (!data) {
      this.#renderPlaceholder();
    } else if (data.todo.id !== this.#data?.todo.id) {
      this.#build(data);
    } else {
      this.#sync(data);
    }
  }

  #renderPlaceholder() {
    this.#data = null;
    this.#refs = null;
    if (this.#showingPlaceholder) return;
    this.#showingPlaceholder = true;
    clear(this.#root).append(
      el('div', { class: 'detail-empty' }, [
        iconElement('checklist', 'detail-empty__icon'),
        el('p', {}, 'Select a todo to see its details.'),
      ]),
    );
  }

  #build(data) {
    this.#showingPlaceholder = false;
    const id = data.todo.id;
    const refs = {};

    refs.check = el('input', {
      class: 'check-ring detail__check',
      attrs: { type: 'checkbox', 'aria-label': 'Done' },
      on: { change: () => this.#call('onToggleComplete', id) },
    });
    refs.title = el('textarea', {
      class: 'detail__title',
      attrs: { rows: 1, 'aria-label': 'Title', 'aria-describedby': 'detail-title-error' },
      on: {
        keydown: (event) => {
          // A title is one line: Enter saves, Esc discards the edit.
          if (event.key === 'Enter') {
            event.preventDefault();
            refs.title.blur();
          } else if (event.key === 'Escape') {
            refs.title.value = this.#data.todo.title;
            refs.title.blur();
          }
        },
        input: () => this.#showTitleError(''),
        change: () => this.#saveTitle(),
      },
    });
    refs.titleError = el('p', {
      class: 'field__error detail__title-error',
      attrs: { id: 'detail-title-error', 'aria-live': 'polite' },
    });
    refs.star = el(
      'button',
      {
        class: 'icon-button star-toggle',
        attrs: { type: 'button', 'aria-label': 'Important' },
        on: { click: () => this.#call('onToggleImportant', id) },
      },
      iconElement('star'),
    );
    const menu = new DropdownMenu({
      label: 'Todo actions',
      focusKey: 'todo-menu',
      items: [{ label: 'Delete todo', danger: true, onSelect: () => this.#call('onDelete', id) }],
    }).render();

    refs.dueDate = el('input', {
      class: 'field__input',
      attrs: { id: 'detail-due', type: 'date' },
      on: { change: () => this.#call('onUpdate', id, { dueDate: refs.dueDate.value || null }) },
    });
    refs.priority = priorityField({
      name: 'detail-priority',
      value: data.todo.priority,
      onChange: (priority) => this.#call('onUpdate', id, { priority }),
    });
    refs.project = el('select', {
      class: 'field__input field__input--select',
      attrs: { id: 'detail-project' },
      on: { change: () => this.#call('onMove', id, refs.project.value) },
    });
    refs.description = el('textarea', {
      class: 'detail__description',
      attrs: { id: 'detail-description', placeholder: 'Add a description…', rows: 3 },
      on: {
        change: () => this.#call('onUpdate', id, { description: refs.description.value.trim() }),
      },
    });
    // Steps: "+ Add step" input (Enter adds) above the list of steps.
    refs.stepInput = el('input', {
      class: 'steps__input',
      attrs: {
        type: 'text',
        placeholder: 'Add step',
        'aria-label': 'Add step',
        maxlength: 200,
        autocomplete: 'off',
      },
      on: {
        keydown: (event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            this.#addStep();
          }
        },
      },
    });
    refs.steps = el('ul', { class: 'steps__list', attrs: { 'aria-label': 'Steps' } });

    // Notes: saved with the send button, Ctrl/Cmd+Enter, or when the field loses focus.
    refs.notes = el('textarea', {
      class: 'notes__input',
      attrs: { id: 'detail-notes', placeholder: 'Add notes...', rows: 3 },
      on: {
        input: () => this.#updateNotesButton(),
        change: () => this.#saveNotes(),
        keydown: (event) => {
          if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            this.#saveNotes();
          }
        },
      },
    });
    refs.notesSave = el(
      'button',
      {
        class: 'notes__save',
        attrs: { type: 'button', 'aria-label': 'Save notes', title: 'Save notes (Ctrl+Enter)' },
        on: { click: () => this.#saveNotes() },
      },
      iconElement('send'),
    );

    clear(this.#root).append(
      el('article', { class: 'detail', attrs: { 'aria-label': 'Todo details' } }, [
        el('div', { class: 'detail__header' }, [
          refs.check,
          el('div', { class: 'detail__title-wrap' }, [refs.title, refs.titleError]),
          refs.star,
          menu,
        ]),
        el('div', { class: 'detail__props' }, [
          el('div', { class: 'field' }, [
            el('label', { class: 'field__label', attrs: { for: 'detail-due' } }, 'Due date'),
            refs.dueDate,
          ]),
          refs.priority,
          el('div', { class: 'field' }, [
            el('label', { class: 'field__label', attrs: { for: 'detail-project' } }, 'Project'),
            refs.project,
          ]),
        ]),
        el('div', { class: 'field' }, [
          el(
            'label',
            { class: 'field__label', attrs: { for: 'detail-description' } },
            'Description',
          ),
          refs.description,
        ]),
        el('section', { class: 'steps', attrs: { 'aria-label': 'Steps' } }, [
          el('label', { class: 'steps__add' }, [
            iconElement('plus', 'steps__add-icon'),
            refs.stepInput,
          ]),
          refs.steps,
        ]),
        el('section', { class: 'notes' }, [
          el('label', { class: 'visually-hidden', attrs: { for: 'detail-notes' } }, 'Notes'),
          refs.notes,
          refs.notesSave,
        ]),
      ]),
    );

    this.#refs = refs;
    this.#root.scrollTop = 0;
    this.#sync(data, { force: true });
  }

  /** Copies `data` into the controls. A focused control keeps what the user is typing. */
  #sync(data, { force = false } = {}) {
    this.#data = data;
    const { todo, projectId, projects } = data;
    const refs = this.#refs;
    const idle = (node) => force || node !== document.activeElement;

    refs.check.checked = todo.completed;
    refs.check.classList.remove(...PRIORITY_CLASSES);
    refs.check.classList.add(`priority--${todo.priority}`);
    refs.star.setAttribute('aria-pressed', String(todo.important));
    refs.star.title = todo.important ? 'Remove from Important' : 'Mark as important';

    if (idle(refs.title)) refs.title.value = todo.title;
    if (idle(refs.description)) refs.description.value = todo.description;
    if (idle(refs.dueDate)) refs.dueDate.value = todo.dueDate ?? '';
    if (idle(refs.notes)) refs.notes.value = todo.notes;
    this.#updateNotesButton();
    this.#renderSteps(todo.checklist);
    for (const radio of refs.priority.querySelectorAll('input')) {
      radio.checked = radio.value === todo.priority;
    }

    // Rebuild the options only when the project list changed (names or order).
    const signature = projects.map((p) => `${p.id}:${p.name}`).join('\n');
    if (refs.projectSignature !== signature) {
      refs.projectSignature = signature;
      refs.project.replaceChildren(
        ...projects.map(({ id, name }) => el('option', { attrs: { value: id } }, name)),
      );
    }
    refs.project.value = projectId;
  }

  /** Redraws the steps, keeping focus on the same step's control (or the add input if it's gone). */
  #renderSteps(checklist) {
    const { steps, stepInput } = this.#refs;
    const hadFocus = steps.contains(document.activeElement);
    preserveFocus(steps, () => {
      steps.replaceChildren(...checklist.map((item) => this.#step(item)));
    });
    if (hadFocus && !steps.contains(document.activeElement)) stepInput.focus();
  }

  #step({ id: itemId, text, done }) {
    const todoId = this.#data.todo.id;
    return el('li', { class: ['step', done && 'step--done'] }, [
      el('input', {
        class: 'check-ring step__check',
        attrs: {
          type: 'checkbox',
          checked: done,
          'aria-label': `Done: ${text}`,
          'data-focus-key': `step-check:${itemId}`,
        },
        on: { change: () => this.#call('onToggleStep', todoId, itemId) },
      }),
      el('span', { class: 'step__text' }, text),
      el(
        'button',
        {
          class: 'icon-button step__remove',
          attrs: {
            type: 'button',
            'aria-label': `Remove step: ${text}`,
            title: 'Remove step',
            'data-focus-key': `step-remove:${itemId}`,
          },
          on: { click: () => this.#call('onRemoveStep', todoId, itemId) },
        },
        iconElement('close'),
      ),
    ]);
  }

  #addStep() {
    const input = this.#refs.stepInput;
    const text = input.value.trim();
    if (text === '') return;
    input.value = '';
    this.#call('onAddStep', this.#data.todo.id, text);
  }

  #saveNotes() {
    const notes = this.#refs.notes.value;
    if (notes !== this.#data.todo.notes) {
      this.#call('onUpdate', this.#data.todo.id, { notes });
    }
    this.#updateNotesButton();
  }

  /** The save button is only active while the notes have unsaved changes. */
  #updateNotesButton() {
    const { notes, notesSave } = this.#refs;
    // aria-disabled (not disabled) so the button keeps focus right after it saved.
    notesSave.setAttribute('aria-disabled', String(notes.value === this.#data.todo.notes));
  }

  #saveTitle() {
    const title = this.#refs.title.value.trim();
    if (title === '') {
      this.#refs.title.value = this.#data.todo.title;
      this.#showTitleError("The title can't be empty.");
      return;
    }
    if (title !== this.#data.todo.title) {
      this.#call('onUpdate', this.#data.todo.id, { title });
    } else {
      this.#refs.title.value = title;
    }
  }

  #showTitleError(message) {
    this.#refs.titleError.textContent = message;
  }

  /** Runs a callback; if it throws (invalid input), shows the saved values again. */
  #call(name, ...args) {
    try {
      this.#callbacks[name](...args);
    } catch (error) {
      console.warn(`TodoUI: ${name} failed.`, error);
      if (this.#data && this.#refs) this.#sync(this.#data, { force: true });
    }
  }
}
