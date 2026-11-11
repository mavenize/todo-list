import { SMART_LISTS } from '../utils/constants';
import { isDueToday } from '../utils/dateFormat';

const isOpen = ({ todo }) => !todo.completed;

/** Due date ascending ('yyyy-MM-dd' sorts as text), then oldest first. */
function byDueDate(a, b) {
  if (a.todo.dueDate !== b.todo.dueDate) return a.todo.dueDate < b.todo.dueDate ? -1 : 1;
  return a.todo.createdAt - b.todo.createdAt;
}

/**
 * Read-only queries over a ProjectManager, used by the UI. No DOM access.
 * Every list result is an array of `{ todo, project }`, so the UI can show the project.
 */
export class TodoQuery {
  #manager;
  #now;

  /** `now` returns the current date. Tests pass a fixed date. */
  constructor(manager, { now = () => new Date() } = {}) {
    this.#manager = manager;
    this.#now = now;
  }

  /** The todos of one smart list. Throws a RangeError for an unknown type. */
  smartList(type) {
    const entries = this.#entries();
    const now = this.#now();
    switch (type) {
      case SMART_LISTS.OVERVIEW:
        return entries.filter(isOpen);
      case SMART_LISTS.TODAY:
        return entries.filter((e) => isOpen(e) && isDueToday(e.todo.dueDate, now));
      case SMART_LISTS.IMPORTANT:
        return entries.filter((e) => isOpen(e) && e.todo.important);
      case SMART_LISTS.SCHEDULED:
        return entries.filter((e) => isOpen(e) && e.todo.dueDate !== null).sort(byDueDate);
      case SMART_LISTS.DONE:
        return entries.filter((e) => e.todo.completed);
      default:
        throw new RangeError(`Unknown smart list "${type}"`);
    }
  }

  /** All todos of one project, open and completed, in insertion order. Unknown id → []. */
  projectList(projectId) {
    const project = this.#manager.getProject(projectId);
    return project ? project.todos.map((todo) => ({ todo, project })) : [];
  }

  /**
   * Case-insensitive search on title, description and notes across all projects,
   * including completed todos. An empty or blank query returns [].
   */
  search(query) {
    const needle = String(query ?? '')
      .trim()
      .toLowerCase();
    if (needle === '') return [];
    return this.#entries().filter(({ todo }) =>
      [todo.title, todo.description, todo.notes].some((text) =>
        text.toLowerCase().includes(needle),
      ),
    );
  }

  /**
   * Badge numbers: `{ smartLists: { overview, today, ... }, projects: { [projectId]: openCount } }`.
   * Every smart list counts open todos, except Done, which counts completed ones.
   */
  counts() {
    const smartLists = {};
    for (const type of Object.values(SMART_LISTS)) {
      smartLists[type] = this.smartList(type).length;
    }
    const projects = {};
    for (const project of this.#manager.projects) {
      projects[project.id] = project.todos.filter((todo) => !todo.completed).length;
    }
    return { smartLists, projects };
  }

  #entries() {
    return this.#manager.projects.flatMap((project) =>
      project.todos.map((todo) => ({ todo, project })),
    );
  }
}
