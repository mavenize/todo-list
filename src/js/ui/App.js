import { TodoQuery } from '../core/TodoQuery';
import { EVENTS, PROJECT_COLORS, SMART_LISTS, SMART_LIST_ITEMS } from '../utils/constants';
import { formatDueLabel, isOverdue } from '../utils/dateFormat';
import { ConfirmModal } from './components/ConfirmModal';
import { DropdownMenu } from './components/DropdownMenu';
import { Header } from './components/Header';
import { ProjectFormModal } from './components/ProjectFormModal';
import { Sidebar } from './components/Sidebar';
import { TodoDetailView } from './components/TodoDetailView';
import { TodoFormModal } from './components/TodoFormModal';
import { TodoListView } from './components/TodoListView';

const VIEW_TYPES = Object.freeze({ SMART: 'smart', PROJECT: 'project' });
const DEFAULT_VIEW = Object.freeze({ type: VIEW_TYPES.SMART, id: SMART_LISTS.OVERVIEW });
const SMART_LIST_IDS = new Set(Object.values(SMART_LISTS));

/** List-pane message when a view has no todos. */
const EMPTY_MESSAGES = Object.freeze({
  [SMART_LISTS.OVERVIEW]: 'Nothing to do. Add a todo with the + button.',
  [SMART_LISTS.TODAY]: 'Nothing due today.',
  [SMART_LISTS.IMPORTANT]: 'No important todos. Star a todo to see it here.',
  [SMART_LISTS.SCHEDULED]: 'No todos with a due date.',
  [SMART_LISTS.DONE]: 'No completed todos yet.',
  project: 'No todos in this project yet. Add one with the + button.',
});

/**
 * Plain row data for TodoListView. `withProject` adds the project tag (smart lists, search).
 * @returns {import('./components/TodoListView').TodoRow}
 */
function toRow({ todo, project }, { withProject, now }) {
  const steps = todo.checklist;
  return {
    id: todo.id,
    title: todo.title,
    priority: todo.priority,
    completed: todo.completed,
    important: todo.important,
    dueLabel: formatDueLabel(todo.dueDate, now),
    overdue: !todo.completed && isOverdue(todo.dueDate, now),
    hasNotes: todo.notes.trim() !== '',
    checklist: steps.length
      ? { done: steps.filter((item) => item.done).length, total: steps.length }
      : null,
    project: withProject ? { name: project.name, color: project.color } : null,
  };
}

/**
 * The view to show: `view` if it still points at a smart list or an existing project.
 * A project view whose project is gone (e.g. just deleted) falls back to the Inbox;
 * anything else unusable falls back to the Overview. Accepts anything (it may come from saved data).
 */
function resolveView(view, manager) {
  if (view && typeof view === 'object') {
    if (view.type === VIEW_TYPES.SMART && SMART_LIST_IDS.has(view.id)) {
      return { type: VIEW_TYPES.SMART, id: view.id };
    }
    if (view.type === VIEW_TYPES.PROJECT) {
      const project = manager.getProject(view.id) ?? manager.defaultProject;
      return { type: VIEW_TYPES.PROJECT, id: project.id };
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
  #header = null;
  #sidebar = null;
  #listView = null;
  #detailView = null;

  #activeView;
  #selectedTodoId = null;
  #searchQuery = '';
  /** Sidebar drawer state (only visible on narrow screens, see layout.css). */
  #navOpen = false;
  #onDocumentKeydown = (event) => {
    // Esc closes the drawer, unless a modal is open (it handles Esc itself).
    if (event.key !== 'Escape' || !this.#navOpen || document.querySelector('dialog[open]')) return;
    this.#setNavOpen(false, { focus: true });
  };

  /**
   * @param {object} options
   * @param {import('../core/ProjectManager').ProjectManager} options.manager
   * @param {import('../core/EventBus').EventBus} options.bus
   * @param {{ app: HTMLElement, header: HTMLElement, sidebar: HTMLElement, list: HTMLElement,
   *   detail: HTMLElement, scrim?: HTMLElement }} options.panes `app` gets the layout state classes
   *   (`app--detail-open`, `app--nav-open`); `scrim` covers the page behind the open drawer
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
    this.#header = new Header(this.#panes.header, {
      onSearch: (query) => this.setSearchQuery(query),
      onToggleNav: () => this.#setNavOpen(!this.#navOpen, { focus: true }),
    }).render();
    this.#sidebar = new Sidebar(this.#panes.sidebar, {
      onSelectSmartList: (id) => {
        this.showSmartList(id);
        this.#afterNavPick();
      },
      onSelectProject: (projectId) => {
        this.showProject(projectId);
        this.#afterNavPick();
      },
      onNewProject: () => this.#openProjectForm(),
      onNewTodo: () => this.#openTodoForm(),
    }).mount();
    this.#listView = new TodoListView(this.#panes.list, {
      onSelect: (todoId) => this.selectTodo(todoId),
      onToggleComplete: (todoId) => this.#manager.toggleTodoComplete(todoId),
      onToggleImportant: (todoId) => this.#manager.toggleTodoImportant(todoId),
    });
    this.#detailView = new TodoDetailView(this.#panes.detail, {
      onUpdate: (todoId, fields) => this.#manager.updateTodo(todoId, fields),
      onToggleComplete: (todoId) => this.#manager.toggleTodoComplete(todoId),
      onToggleImportant: (todoId) => this.#manager.toggleTodoImportant(todoId),
      onMove: (todoId, projectId) => this.#manager.moveTodo(todoId, projectId),
      onDelete: (todoId) => this.#confirmDeleteTodo(todoId),
      onClose: (todoId) => this.#closeDetail(todoId),
      onAddStep: (todoId, text) => this.#manager.addChecklistItem(todoId, text),
      onToggleStep: (todoId, itemId) => this.#manager.toggleChecklistItem(todoId, itemId),
      onRemoveStep: (todoId, itemId) => this.#manager.removeChecklistItem(todoId, itemId),
    });
    this.#panes.scrim?.addEventListener('click', () => this.#setNavOpen(false, { focus: true }));
    document.addEventListener('keydown', this.#onDocumentKeydown);
    this.#unsubscribe = this.#bus.on(EVENTS.STATE_CHANGED, () => this.render());
    this.render();
    return this;
  }

  /** Stops listening for data changes and keys. */
  unmount() {
    this.#unsubscribe?.();
    this.#unsubscribe = null;
    document.removeEventListener('keydown', this.#onDocumentKeydown);
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
    // On narrow screens the detail pane is an overlay that is only shown with a selection.
    this.#panes.app?.classList.toggle('app--detail-open', this.#selectedTodoId !== null);
    // Keeps the search field in step when the app ends a search (e.g. a sidebar click).
    this.#header?.setQuery(this.#searchQuery);
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
      // A project shows open and completed todos; completed ones go last (stable sort).
      return this.#query
        .projectList(this.#activeView.id)
        .sort((a, b) => Number(a.todo.completed) - Number(b.todo.completed));
    }
    return this.#query.smartList(this.#activeView.id);
  }

  #currentEmptyMessage() {
    if (this.isSearching) return `No todos match "${this.#searchQuery.trim()}".`;
    if (this.#activeView.type === VIEW_TYPES.PROJECT) return EMPTY_MESSAGES.project;
    return EMPTY_MESSAGES[this.#activeView.id];
  }

  #currentTitle() {
    if (this.isSearching) return `Search: ${this.#searchQuery.trim()}`;
    if (this.#activeView.type === VIEW_TYPES.PROJECT) {
      return this.#manager.getProject(this.#activeView.id).name;
    }
    return SMART_LIST_ITEMS.find((item) => item.id === this.#activeView.id).label;
  }

  // ── Narrow-screen layout ───────────────────────────────────────────────────

  /** Opens or closes the sidebar drawer. With `focus`, moves focus into it / back to ☰. */
  #setNavOpen(open, { focus = false } = {}) {
    if (open === this.#navOpen) return;
    this.#navOpen = open;
    this.#panes.app?.classList.toggle('app--nav-open', open);
    if (this.#panes.scrim) this.#panes.scrim.hidden = !open;
    this.#header?.setNavOpen(open);
    if (!focus) return;
    if (open) {
      this.#panes.sidebar.querySelector('.nav-item--active, .nav-item')?.focus();
    } else {
      this.#header?.menuButton?.focus();
    }
  }

  /** After picking a list in the open drawer: close it and continue in the list. */
  #afterNavPick() {
    if (!this.#navOpen) return;
    this.#setNavOpen(false);
    this.#listView?.focusTitle();
  }

  /** Closes the detail overlay and puts focus back on the todo's row. */
  #closeDetail(todoId) {
    this.selectTodo(null);
    if (!this.#listView?.focusRow(todoId)) this.#listView?.focusTitle();
  }

  /** "New project": creates the project and switches to it. */
  #openProjectForm() {
    const used = new Set(this.#manager.projects.map((project) => project.color));
    new ProjectFormModal({
      // Suggest a palette color no project uses yet.
      defaultColor: PROJECT_COLORS.find((color) => !used.has(color)) ?? PROJECT_COLORS[0],
      onSubmit: ({ name, color }) => {
        const project = this.#manager.createProject({ name, color });
        this.showProject(project.id);
      },
    }).open();
  }

  #openRenameProject(projectId) {
    const project = this.#manager.getProject(projectId);
    if (!project || project.isDefault) return;
    new ProjectFormModal({
      project: { name: project.name },
      onSubmit: ({ name }) => this.#manager.renameProject(projectId, name),
    }).open();
  }

  /** Asks before deleting; the view then falls back to the Inbox (see resolveView). */
  #confirmDeleteProject(projectId) {
    const project = this.#manager.getProject(projectId);
    if (!project || project.isDefault) return;
    const count = project.todos.length;
    const todos = count === 0 ? '' : ` and its ${count} ${count === 1 ? 'todo' : 'todos'}`;
    new ConfirmModal({
      title: 'Delete project?',
      message: `"${project.name}"${todos} will be deleted. This can't be undone.`,
      confirmLabel: 'Delete project',
      danger: true,
      onConfirm: () => this.#manager.deleteProject(projectId),
    }).open();
  }

  /** The list header's ⋮ menu: only for custom projects (the Inbox can't be renamed or deleted). */
  #listHeaderMenu() {
    if (this.isSearching || this.#activeView.type !== VIEW_TYPES.PROJECT) return null;
    const project = this.#manager.getProject(this.#activeView.id);
    if (!project || project.isDefault) return null;
    return new DropdownMenu({
      label: 'Project actions',
      focusKey: 'project-menu',
      items: [
        { label: 'Rename project', onSelect: () => this.#openRenameProject(project.id) },
        {
          label: 'Delete project',
          danger: true,
          onSelect: () => this.#confirmDeleteProject(project.id),
        },
      ],
    }).render();
  }

  /**
   * FAB "New todo". The project defaults to the current project (the Inbox in smart lists).
   * The new todo is selected; if the current view wouldn't show it, its project is opened.
   */
  #openTodoForm() {
    const inProject = !this.isSearching && this.#activeView.type === VIEW_TYPES.PROJECT;
    new TodoFormModal({
      projects: this.#manager.projects.map(({ id, name }) => ({ id, name })),
      defaultProjectId: inProject ? this.#activeView.id : this.#manager.defaultProject.id,
      onSubmit: ({ projectId, ...fields }) => {
        const todo = this.#manager.addTodo(projectId, fields);
        if (!this.#currentEntries().some((entry) => entry.todo.id === todo.id)) {
          this.showProject(projectId);
        }
        this.selectTodo(todo.id);
      },
    }).open();
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
    if (!this.#listView) return;
    // Rows in smart lists and search results come from several projects, so they name it.
    const withProject = this.isSearching || this.#activeView.type === VIEW_TYPES.SMART;
    const now = new Date();
    this.#listView.render({
      title: this.#currentTitle(),
      menu: this.#listHeaderMenu(),
      rows: this.#currentEntries().map((entry) => toRow(entry, { withProject, now })),
      selectedTodoId: this.#selectedTodoId,
      emptyMessage: this.#currentEmptyMessage(),
    });
  }

  /** Asks before deleting; the selection is then cleared and the pane shows its placeholder. */
  #confirmDeleteTodo(todoId) {
    const found = this.#manager.findTodo(todoId);
    if (!found) return;
    new ConfirmModal({
      title: 'Delete todo?',
      message: `"${found.todo.title}" will be deleted. This can't be undone.`,
      confirmLabel: 'Delete todo',
      danger: true,
      onConfirm: () => this.#manager.deleteTodo(todoId),
    }).open();
  }

  #renderDetail() {
    if (!this.#detailView) return;
    const found = this.#selectedTodoId ? this.#manager.findTodo(this.#selectedTodoId) : null;
    if (!found) {
      this.#detailView.render(null);
      return;
    }
    const { todo, project } = found;
    this.#detailView.render({
      todo: {
        id: todo.id,
        title: todo.title,
        description: todo.description,
        dueDate: todo.dueDate,
        priority: todo.priority,
        completed: todo.completed,
        important: todo.important,
        overdue: !todo.completed && isOverdue(todo.dueDate),
        notes: todo.notes,
        checklist: todo.checklist.map(({ id, text, done }) => ({ id, text, done })),
      },
      projectId: project.id,
      projects: this.#manager.projects.map(({ id, name }) => ({ id, name })),
    });
  }
}
