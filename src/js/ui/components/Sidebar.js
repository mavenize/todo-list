import { clear, el } from '../dom';
import { iconElement } from '../icons';

/** Sidebar icon per smart list id. */
const SMART_LIST_ICONS = Object.freeze({
  overview: 'grid',
  today: 'calendar',
  important: 'star',
  scheduled: 'alarm',
  done: 'calendarCheck',
});

const navKey = (type, id) => `${type}:${id}`;

/** Count badge, or nothing for 0. */
function badge(count, className = '') {
  if (!count) return null;
  return el('span', { class: ['nav-item__badge', className] }, count > 99 ? '99+' : count);
}

/**
 * Left pane: logo, smart lists, projects, "New project" and the new-todo FAB.
 * Receives plain data through render() and reports clicks through callbacks; it never
 * changes app state itself.
 */
export class Sidebar {
  #root;
  #nav;
  #callbacks;

  /**
   * @param {HTMLElement} root the sidebar `<aside>`
   * @param {object} callbacks
   * @param {(id: string) => void} callbacks.onSelectSmartList
   * @param {(projectId: string) => void} callbacks.onSelectProject
   * @param {() => void} callbacks.onNewProject
   * @param {() => void} callbacks.onNewTodo
   */
  constructor(root, callbacks) {
    this.#root = root;
    this.#callbacks = callbacks;
  }

  /** Builds the static frame (logo, nav container, FAB). Call once before render(). */
  mount() {
    this.#nav = el('nav', { class: 'sidebar__content', attrs: { 'aria-label': 'Lists' } });
    clear(this.#root).append(
      el('div', { class: 'sidebar__brand' }, [
        iconElement('logo', 'sidebar__logo'),
        el('span', {}, 'TODOUI'),
      ]),
      this.#nav,
      el(
        'button',
        {
          class: 'fab',
          attrs: { type: 'button', 'aria-label': 'New todo', title: 'New todo' },
          on: { click: () => this.#callbacks.onNewTodo() },
        },
        iconElement('plus', 'fab__icon'),
      ),
    );
    return this;
  }

  /**
   * @param {object} data
   * @param {ReadonlyArray<{ id: string, label: string }>} data.smartLists
   * @param {ReadonlyArray<{ id: string, name: string, color: string }>} data.projects
   * @param {{ smartLists: Record<string, number>, projects: Record<string, number> }} data.counts
   * @param {{ type: 'smart'|'project', id: string }|null} data.activeView null while searching
   */
  render({ smartLists, projects, counts, activeView }) {
    const activeKey = activeView ? navKey(activeView.type, activeView.id) : null;
    // Re-rendering replaces the buttons, so remember which one had keyboard focus.
    const focusedKey = this.#nav.contains(document.activeElement)
      ? document.activeElement.dataset.navKey
      : null;

    clear(this.#nav).append(
      el(
        'ul',
        { class: 'nav-list' },
        smartLists.map(({ id, label }) =>
          this.#item({
            key: navKey('smart', id),
            activeKey,
            onClick: () => this.#callbacks.onSelectSmartList(id),
            children: [
              iconElement(SMART_LIST_ICONS[id] ?? 'grid', 'nav-item__icon'),
              el('span', { class: 'nav-item__label' }, label),
              badge(counts.smartLists[id]),
            ],
          }),
        ),
      ),
      el('h2', { class: 'sidebar__heading' }, 'Projects'),
      el(
        'ul',
        { class: 'nav-list' },
        projects.map((project) => {
          const item = this.#item({
            key: navKey('project', project.id),
            activeKey,
            onClick: () => this.#callbacks.onSelectProject(project.id),
            children: [
              el('span', { class: 'nav-item__dot', attrs: { 'aria-hidden': 'true' } }),
              el('span', { class: 'nav-item__label' }, project.name),
              badge(counts.projects[project.id], 'nav-item__badge--project'),
            ],
          });
          // setProperty keeps the user-chosen color a single CSS value.
          item.firstElementChild.style.setProperty('--project-color', project.color);
          return item;
        }),
      ),
      el(
        'button',
        {
          class: 'sidebar__new-project',
          attrs: { type: 'button', 'data-nav-key': 'new-project' },
          on: { click: () => this.#callbacks.onNewProject() },
        },
        [iconElement('plus'), el('span', {}, 'New project')],
      ),
    );

    if (focusedKey) {
      this.#nav.querySelector(`[data-nav-key="${CSS.escape(focusedKey)}"]`)?.focus();
    }
  }

  /** One `<li>` with a nav button. */
  #item({ key, activeKey, onClick, children }) {
    const active = key === activeKey;
    return el(
      'li',
      {},
      el(
        'button',
        {
          class: ['nav-item', active && 'nav-item--active'],
          attrs: { type: 'button', 'data-nav-key': key, 'aria-current': active && 'page' },
          on: { click: onClick },
        },
        children,
      ),
    );
  }
}
