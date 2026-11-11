import { clear, el, preserveFocus } from '../dom';
import { iconElement } from '../icons';

/**
 * @typedef {object} TodoRow Plain data for one row (built by App from a `{ todo, project }` entry).
 * @property {string} id
 * @property {string} title
 * @property {'low'|'medium'|'high'} priority
 * @property {boolean} completed
 * @property {boolean} important
 * @property {string} dueLabel e.g. 'Today', 'Tue, 1 May'; '' when there is no due date
 * @property {boolean} hasNotes
 * @property {{ done: number, total: number }|null} checklist null when the todo has no steps
 * @property {{ name: string, color: string }|null} project shown in smart lists and search
 */

/**
 * Middle pane: list header (title, blue underline, optional ⋮ menu) and the todo rows.
 * Receives plain rows and reports clicks through callbacks; it never changes state itself.
 *
 * Each row has three controls: the priority-colored checkbox (complete), the row button
 * (select, opens the detail pane) and the star (important). A click anywhere else on the row
 * selects it too.
 */
export class TodoListView {
  #root;
  #callbacks;

  /**
   * @param {HTMLElement} root the list pane
   * @param {object} callbacks
   * @param {(todoId: string) => void} callbacks.onSelect
   * @param {(todoId: string) => void} callbacks.onToggleComplete
   * @param {(todoId: string) => void} callbacks.onToggleImportant
   */
  constructor(root, callbacks) {
    this.#root = root;
    this.#callbacks = callbacks;
  }

  /**
   * @param {object} data
   * @param {string} data.title
   * @param {HTMLElement|null} [data.menu] the header's ⋮ menu, if this view has one
   * @param {TodoRow[]} data.rows
   * @param {string|null} data.selectedTodoId
   * @param {string} data.emptyMessage shown when there are no rows
   */
  render({ title, menu = null, rows, selectedTodoId, emptyMessage }) {
    preserveFocus(this.#root, () => {
      clear(this.#root).append(
        el('div', { class: 'list-header' }, [
          el('h1', { class: 'list-header__title', attrs: { id: 'list-title' } }, title),
          menu,
        ]),
        rows.length === 0
          ? el('p', { class: 'list-empty' }, emptyMessage)
          : el(
              'ul',
              { class: 'todo-list', attrs: { 'aria-labelledby': 'list-title' } },
              rows.map((row) => this.#row(row, row.id === selectedTodoId)),
            ),
      );
    });
  }

  #row(row, selected) {
    const { id, title, priority, completed, important } = row;
    return el(
      'li',
      {
        class: [
          'todo-item',
          selected && 'todo-item--selected',
          completed && 'todo-item--completed',
        ],
        on: {
          // Clicks on the row's padding select it as well; the checkbox and star handle their own.
          click: (event) => {
            if (!event.target.closest('.todo-item__check, .todo-item__star')) {
              this.#callbacks.onSelect(id);
            }
          },
        },
      },
      [
        el('input', {
          class: ['check-ring', 'todo-item__check', `priority--${priority}`],
          attrs: {
            type: 'checkbox',
            checked: completed,
            'aria-label': `Done: ${title}`,
            title: `Priority: ${priority}`,
            'data-focus-key': `check:${id}`,
          },
          on: { change: () => this.#callbacks.onToggleComplete(id) },
        }),
        el(
          'button',
          {
            class: 'todo-item__main',
            attrs: {
              type: 'button',
              'aria-current': selected && 'true',
              'data-focus-key': `select:${id}`,
            },
          },
          [el('span', { class: 'todo-item__title' }, title), this.#meta(row)],
        ),
        el(
          'button',
          {
            class: 'icon-button star-toggle todo-item__star',
            attrs: {
              type: 'button',
              'aria-pressed': String(important),
              'aria-label': `Important: ${title}`,
              title: important ? 'Remove from Important' : 'Mark as important',
              'data-focus-key': `star:${id}`,
            },
            on: { click: () => this.#callbacks.onToggleImportant(id) },
          },
          iconElement('star'),
        ),
      ],
    );
  }

  /** Second line: due label, notes / checklist indicators and (in smart lists) the project. */
  #meta({ dueLabel, hasNotes, checklist, project }) {
    const parts = [
      dueLabel &&
        el('span', { class: 'todo-item__meta-part' }, [
          iconElement('calendar'),
          el('span', { class: 'visually-hidden' }, 'Due '),
          dueLabel,
        ]),
      hasNotes &&
        el('span', { class: 'todo-item__meta-part', attrs: { title: 'Has notes' } }, [
          iconElement('note'),
          el('span', { class: 'visually-hidden' }, 'Has notes'),
        ]),
      checklist &&
        el('span', { class: 'todo-item__meta-part', attrs: { title: 'Steps done' } }, [
          iconElement('checklist'),
          el('span', { class: 'visually-hidden' }, 'Steps: '),
          `${checklist.done}/${checklist.total}`,
        ]),
      project && this.#projectTag(project),
    ].filter(Boolean);
    return parts.length ? el('span', { class: 'todo-item__meta' }, parts) : null;
  }

  #projectTag({ name, color }) {
    const tag = el('span', { class: 'todo-item__meta-part todo-item__project' }, [
      el('span', { class: 'todo-item__project-dot', attrs: { 'aria-hidden': 'true' } }),
      el('span', { class: 'visually-hidden' }, 'Project: '),
      name,
    ]);
    tag.style.setProperty('--project-color', color);
    return tag;
  }
}
