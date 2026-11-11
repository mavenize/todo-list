import { TodoQuery } from '../core/TodoQuery';
import { EVENTS, SMART_LISTS, SMART_LIST_ITEMS } from '../utils/constants';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { clear, el } from './dom';

const VIEW_TYPES = Object.freeze({ SMART: 'smart', PROJECT: 'project' });
const DEFAULT_VIEW = Object.freeze({ type: VIEW_TYPES.SMART, id: SMART_LISTS.OVERVIEW });
const SMART_LIST_IDS = new Set(Object.values(SMART_LISTS));

/**
 * The view to show: `view` if it still points at a smart list or an existing project,
 * otherwise the Overview. Accepts anything (it may come from saved data).
 */
function resolveView(view, manager) {
  if (view && typeof view === 'object') {
    if (view.type === VIEW_TYPES.SMART && SMART_LIST_IDS.has(view.id)) {
      return { type: VIEW_TYPES.SMART, id: view.id };
    }
    if (view.type === VIEW_TYPES.PROJECT && manager.getProject(view.id)) {
      return { type: VIEW_TYPES.PROJECT, id: view.id };
    }
  }
  return { ...DEFAULT_VIEW };
}

const sameView = (a, b) => a.type === b.type && a.id === b.id;

/**
 * UI controller. Owns the view state (active list or project, selected todo, search query),
 * re-renders the panes on every `state:changed`, and hands components plain data plus callbacks.
 *
 * Changes to app data go through the ProjectManager; App and its components never touch
 * storage or edit model objects directly. View changes are reported through `onViewChange`,
 * so the caller can persist the active view.
 */
export class App {
  #manager;
  #bus;
  #query;
  #panes;
  #onViewChange;
  #unsubscribe = null;
  #sidebar = null;

  #activeView;
  #selectedTodoId = null;
  #searchQuery = '';

  /**
   * @param {object} options
   * @param {import('../core/ProjectManager').ProjectManager} options.manager
   * @param {import('../core/EventBus').EventBus} options.bus
   * @param {{ header: HTMLElement, sidebar: HTMLElement, list: HTMLElement, detail: HTMLElement }} options.panes
   * @param {{ type: 'smart'|'project', id: string }|null} [options.initialView] e.g. the saved activeView
   * @param {(view: { type: string, id: string }) => void} [options.onViewChange]
   * @param {TodoQuery} [options.query]
   */
  constructor({
    manager,
    bus,
    panes,
    initialView = null,
    onViewChange = () => {},
    query = new TodoQuery(manager),
  }) {
    this.#manager = manager;
    this.#bus = bus;
    this.#query = query;
    this.#panes = panes;
    this.#onViewChange = onViewChange;
    this.#activeView = resolveView(initialView, manager);
  }

  // ── View state (read-only copies) ──────────────────────────────────────────

  /** `{ type: 'smart'|'project', id }`. This is what gets saved as `activeView`. */
  get activeView() {
    return { ...this.#activeView };
  }

  get selectedTodoId() {
    return this.#selectedTodoId;
  }

  get searchQuery() {
    return this.#searchQuery;
  }

  get isSearching() {
    return this.#searchQuery.trim() !== '';
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  /** Renders the static header and sidebar frame, subscribes to data changes and draws the panes. */
  mount() {
    if (this.#unsubscribe) return this;
    new Header(this.#panes.header).render();
    this.#sidebar = new Sidebar(this.#panes.sidebar, {
      onSelectSmartList: (id) => this.showSmartList(id),
      onSelectProject: (projectId) => this.showProject(projectId),
      onNewProject: () => this.#openProjectForm(),
      onNewTodo: () => this.#openTodoForm(),
    }).mount();
    this.#unsubscribe = this.#bus.on(EVENTS.STATE_CHANGED, () => this.render());
    this.render();
    return this;
  }

  /** Stops listening for data changes. */
  unmount() {
    this.#unsubscribe?.();
    this.#unsubscribe = null;
  }

  // ── View actions (the callbacks components receive) ────────────────────────

  showSmartList(id) {
    this.#setActiveView({ type: VIEW_TYPES.SMART, id });
  }

  showProject(projectId) {
    this.#setActiveView({ type: VIEW_TYPES.PROJECT, id: projectId });
  }

  /** Selects a todo for the detail pane, or clears the selection with null. */
  selectTodo(todoId) {
    const next = todoId && this.#manager.findTodo(todoId) ? todoId : null;
    if (next === this.#selectedTodoId) return;
    this.#selectedTodoId = next;
    this.render();
  }

  /** A non-blank query shows search results; a blank one returns to the active view. */
  setSearchQuery(query) {
    const next = String(query ?? '');
    if (next === this.#searchQuery) return;
    this.#searchQuery = next;
    this.render();
  }

  // ── Rendering ──────────────────────────────────────────────────────────────

  /** Re-draws every pane from the current data and view state. */
  render() {
    this.#reconcile();
    this.#renderSidebar();
    this.#renderList();
    this.#renderDetail();
  }

  /** Drops view state that no longer matches the data, e.g. after a project or todo was deleted. */
  #reconcile() {
    const view = resolveView(this.#activeView, this.#manager);
    if (!sameView(view, this.#activeView)) {
      this.#activeView = view;
      this.#onViewChange(this.activeView);
    }
    if (this.#selectedTodoId && !this.#manager.findTodo(this.#selectedTodoId)) {
      this.#selectedTodoId = null;
    }
  }

  #setActiveView(view) {
    const next = resolveView(view, this.#manager);
    const changed = !sameView(next, this.#activeView);
    if (!changed && !this.isSearching) return;
    this.#activeView = next;
    this.#selectedTodoId = null;
    this.#searchQuery = '';
    if (changed) this.#onViewChange(this.activeView);
    this.render();
  }

  /** The `{ todo, project }` entries the list pane shows right now. */
  #currentEntries() {
    if (this.isSearching) return this.#query.search(this.#searchQuery);
    if (this.#activeView.type === VIEW_TYPES.PROJECT) {
      return this.#query.projectList(this.#activeView.id);
    }
    return this.#query.smartList(this.#activeView.id);
  }

  #currentTitle() {
    if (this.isSearching) return `Search: ${this.#searchQuery.trim()}`;
    if (this.#activeView.type === VIEW_TYPES.PROJECT) {
      return this.#manager.getProject(this.#activeView.id).name;
    }
    return SMART_LIST_ITEMS.find((item) => item.id === this.#activeView.id).label;
  }

  #openProjectForm() {
    // ProjectFormModal is added in T15.
  }

  #openTodoForm() {
    // TodoFormModal is added in T17.
  }

  #renderSidebar() {
    this.#sidebar?.render({
      smartLists: SMART_LIST_ITEMS,
      projects: this.#manager.projects.map(({ id, name, color }) => ({ id, name, color })),
      counts: this.#query.counts(),
      // Nothing is highlighted while search results are shown.
      activeView: this.isSearching ? null : this.activeView,
    });
  }

  #renderList() {
    // Placeholder until TodoListView (T16), which receives { title, entries, selectedTodoId }
    // and the callbacks selectTodo / toggleComplete / toggleImportant.
    const entries = this.#currentEntries();
    const count = entries.length;
    clear(this.#panes.list).append(
      el('h1', { class: 'list-pane__title' }, this.#currentTitle()),
      el('p', { class: 'list-pane__summary' }, `${count} ${count === 1 ? 'todo' : 'todos'}`),
    );
  }

  #renderDetail() {
    // Placeholder until TodoDetailView (T18), which receives { todo, project, projects }
    // and callbacks that call ProjectManager methods.
    clear(this.#panes.detail);
  }
}
