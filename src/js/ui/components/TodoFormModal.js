import { DEFAULT_PRIORITY, PRIORITY_LIST } from '../../utils/constants';
import { el } from '../dom';
import { Modal } from './Modal';

const MAX_TITLE_LENGTH = 200;
const PRIORITY_LABELS = Object.freeze({ low: 'Low', medium: 'Medium', high: 'High' });

let formCount = 0;

/**
 * "New todo" form: title (required), description, due date, priority and project.
 * It only collects input: `onSubmit` creates the todo through the ProjectManager.
 * If `onSubmit` throws, the error message is shown and the modal stays open.
 */
export class TodoFormModal extends Modal {
  #projects;
  #defaultProjectId;
  #onSubmit;
  #ids;
  #form = null;
  #titleInput = null;
  #error = null;

  /**
   * @param {object} options
   * @param {ReadonlyArray<{ id: string, name: string }>} options.projects choices for the project select
   * @param {string} options.defaultProjectId preselected project
   * @param {(values: { title: string, description: string, dueDate: string|null,
   *   priority: string, projectId: string }) => void} options.onSubmit
   */
  constructor({ projects, defaultProjectId, onSubmit }) {
    super({ title: 'New todo', className: 'modal--wide' });
    this.#projects = projects;
    this.#defaultProjectId = defaultProjectId;
    this.#onSubmit = onSubmit;
    const n = ++formCount;
    this.#ids = {
      title: `todo-title-${n}`,
      error: `todo-error-${n}`,
      description: `todo-description-${n}`,
      dueDate: `todo-due-${n}`,
      priority: `todo-priority-${n}`,
      project: `todo-project-${n}`,
    };
  }

  renderContent() {
    const ids = this.#ids;
    this.#titleInput = el('input', {
      class: 'field__input',
      attrs: {
        id: ids.title,
        name: 'title',
        type: 'text',
        maxlength: MAX_TITLE_LENGTH,
        autocomplete: 'off',
        required: true,
        'aria-describedby': ids.error,
      },
      on: { input: () => this.#showError('') },
    });
    this.#error = el('p', {
      class: 'field__error',
      attrs: { id: ids.error, 'aria-live': 'polite' },
    });

    this.#form = el(
      'form',
      {
        class: 'modal__body',
        attrs: { novalidate: true },
        on: { submit: (event) => this.#submit(event) },
      },
      [
        el('div', { class: 'field' }, [
          el('label', { class: 'field__label', attrs: { for: ids.title } }, 'Title'),
          this.#titleInput,
          this.#error,
        ]),
        el('div', { class: 'field' }, [
          el('label', { class: 'field__label', attrs: { for: ids.description } }, 'Description'),
          el('textarea', {
            class: 'field__input field__input--textarea',
            attrs: { id: ids.description, name: 'description', rows: 3 },
          }),
        ]),
        el('div', { class: 'field-row' }, [
          el('div', { class: 'field' }, [
            el('label', { class: 'field__label', attrs: { for: ids.dueDate } }, 'Due date'),
            el('input', {
              class: 'field__input',
              attrs: { id: ids.dueDate, name: 'dueDate', type: 'date' },
            }),
          ]),
          this.#priorityField(),
        ]),
        el('div', { class: 'field' }, [
          el('label', { class: 'field__label', attrs: { for: ids.project } }, 'Project'),
          el(
            'select',
            {
              class: 'field__input field__input--select',
              attrs: { id: ids.project, name: 'projectId' },
            },
            this.#projects.map(({ id, name }) =>
              el('option', { attrs: { value: id, selected: id === this.#defaultProjectId } }, name),
            ),
          ),
        ]),
        el('div', { class: 'modal__actions' }, [
          el(
            'button',
            {
              class: 'button button--secondary',
              attrs: { type: 'button' },
              on: { click: () => this.close() },
            },
            'Cancel',
          ),
          el('button', { class: 'button button--primary', attrs: { type: 'submit' } }, 'Add todo'),
        ]),
      ],
    );
    return this.#form;
  }

  /** Low / Medium / High as a segmented radio group, each with its priority color dot. */
  #priorityField() {
    return el('fieldset', { class: 'field' }, [
      el('legend', { class: 'field__label' }, 'Priority'),
      el(
        'div',
        { class: 'segmented' },
        PRIORITY_LIST.map((priority) =>
          el('label', { class: 'segmented__option' }, [
            el('input', {
              class: 'segmented__input',
              attrs: {
                type: 'radio',
                name: 'priority',
                value: priority,
                checked: priority === DEFAULT_PRIORITY,
              },
            }),
            el('span', { class: 'segmented__label' }, [
              el('span', {
                class: ['segmented__dot', `priority--${priority}`],
                attrs: { 'aria-hidden': 'true' },
              }),
              PRIORITY_LABELS[priority] ?? priority,
            ]),
          ]),
        ),
      ),
    ]);
  }

  #submit(event) {
    event.preventDefault();
    const data = new FormData(this.#form);
    const title = String(data.get('title') ?? '').trim();
    if (title === '') {
      this.#showError('Please enter a title.');
      this.#titleInput.focus();
      return;
    }
    const values = {
      title,
      description: String(data.get('description') ?? '').trim(),
      dueDate: String(data.get('dueDate') ?? '') || null,
      priority: String(data.get('priority') ?? DEFAULT_PRIORITY),
      projectId: String(data.get('projectId') ?? this.#defaultProjectId),
    };
    try {
      this.#onSubmit(values);
    } catch (error) {
      this.#showError(error.message);
      return;
    }
    this.close();
  }

  #showError(message) {
    this.#error.textContent = message;
    if (message) {
      this.#titleInput.setAttribute('aria-invalid', 'true');
    } else {
      this.#titleInput.removeAttribute('aria-invalid');
    }
  }
}
