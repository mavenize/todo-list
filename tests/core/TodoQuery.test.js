import { ProjectManager } from '../../src/js/core/ProjectManager';
import { TodoQuery } from '../../src/js/core/TodoQuery';
import { SMART_LISTS } from '../../src/js/utils/constants';
import { toDateString } from '../../src/js/utils/dateFormat';

// Fixed "today" so the date-based lists are deterministic.
const NOW = new Date(2026, 10, 11, 15, 30); // Wed 11 Nov 2026, local time
const TODAY = '2026-11-11';
const TOMORROW = '2026-11-12';
const YESTERDAY = '2026-11-10';
const NEXT_WEEK = '2026-11-18';

const titles = (entries) => entries.map((e) => e.todo.title);

/**
 * Inbox: open-today, open-tomorrow-starred, done-today, open-nodate
 * Work:  open-nextweek, open-yesterday-starred, done-starred
 */
function setup() {
  const manager = new ProjectManager();
  const inbox = manager.defaultProject;
  const work = manager.createProject({ name: 'Work' });

  manager.addTodo(null, { title: 'Pay rent', dueDate: TODAY, description: 'Bank TRANSFER' });
  manager.addTodo(null, { title: 'Call mum', dueDate: TOMORROW, important: true });
  manager.addTodo(null, { title: 'Water plants', dueDate: TODAY, completed: true });
  manager.addTodo(null, { title: 'Read book', notes: 'Chapter on transfer learning' });
  manager.addTodo(work.id, { title: 'Write report', dueDate: NEXT_WEEK });
  manager.addTodo(work.id, { title: 'Fix bug', dueDate: YESTERDAY, important: true });
  manager.addTodo(work.id, { title: 'Ship release', important: true, completed: true });

  const query = new TodoQuery(manager, { now: () => NOW });
  return { manager, query, inbox, work };
}

describe('TodoQuery', () => {
  describe('smartList()', () => {
    test('overview: all open todos across projects', () => {
      const { query } = setup();
      expect(titles(query.smartList(SMART_LISTS.OVERVIEW))).toEqual([
        'Pay rent',
        'Call mum',
        'Read book',
        'Write report',
        'Fix bug',
      ]);
    });

    test('today: open todos due today only (not overdue, not completed)', () => {
      const { query } = setup();
      expect(titles(query.smartList(SMART_LISTS.TODAY))).toEqual(['Pay rent']);
    });

    test('important: open starred todos', () => {
      const { query } = setup();
      expect(titles(query.smartList(SMART_LISTS.IMPORTANT))).toEqual(['Call mum', 'Fix bug']);
    });

    test('scheduled: open todos with a due date, sorted by date', () => {
      const { query } = setup();
      expect(titles(query.smartList(SMART_LISTS.SCHEDULED))).toEqual([
        'Fix bug',
        'Pay rent',
        'Call mum',
        'Write report',
      ]);
    });

    test('scheduled: todos with the same date are ordered by createdAt', () => {
      const manager = ProjectManager.fromJSON({
        projects: [
          {
            name: 'Inbox',
            isDefault: true,
            todos: [
              { title: 'Newer', dueDate: TOMORROW, createdAt: 300 },
              { title: 'Oldest', dueDate: TOMORROW, createdAt: 100 },
              { title: 'Earlier date', dueDate: TODAY, createdAt: 999 },
              { title: 'Middle', dueDate: TOMORROW, createdAt: 200 },
            ],
          },
        ],
      });
      const query = new TodoQuery(manager, { now: () => NOW });
      expect(titles(query.smartList(SMART_LISTS.SCHEDULED))).toEqual([
        'Earlier date',
        'Oldest',
        'Middle',
        'Newer',
      ]);
    });

    test('done: completed todos', () => {
      const { query } = setup();
      expect(titles(query.smartList(SMART_LISTS.DONE))).toEqual(['Water plants', 'Ship release']);
    });

    test('"today" follows the injected clock', () => {
      const { manager } = setup();
      const tomorrowQuery = new TodoQuery(manager, { now: () => new Date(2026, 10, 12, 9) });
      expect(titles(tomorrowQuery.smartList(SMART_LISTS.TODAY))).toEqual(['Call mum']);
    });

    test('results include the project of each todo', () => {
      const { query, inbox, work } = setup();
      const entries = query.smartList(SMART_LISTS.IMPORTANT);
      expect(entries[0].project).toBe(inbox);
      expect(entries[1].project).toBe(work);
      expect(entries[1].todo).toBe(work.todos[1]);
    });

    test('throws a RangeError for an unknown type', () => {
      const { query } = setup();
      expect(() => query.smartList('someday')).toThrow(RangeError);
    });

    test('reflects later changes in the manager', () => {
      const { manager, query } = setup();
      const [{ todo }] = query.smartList(SMART_LISTS.TODAY);
      manager.toggleTodoComplete(todo.id);
      expect(query.smartList(SMART_LISTS.TODAY)).toEqual([]);
      expect(titles(query.smartList(SMART_LISTS.DONE))).toContain('Pay rent');
    });
  });

  describe('projectList()', () => {
    test('returns all todos of the project, open and completed, with the project', () => {
      const { query, work } = setup();
      const entries = query.projectList(work.id);
      expect(titles(entries)).toEqual(['Write report', 'Fix bug', 'Ship release']);
      expect(entries.every((e) => e.project === work)).toBe(true);
    });

    test('returns [] for an unknown project', () => {
      const { query } = setup();
      expect(query.projectList('missing')).toEqual([]);
    });
  });

  describe('search()', () => {
    test('matches title case-insensitively', () => {
      const { query } = setup();
      expect(titles(query.search('REPORT'))).toEqual(['Write report']);
    });

    test('matches description and notes, across projects', () => {
      const { query } = setup();
      expect(titles(query.search('transfer'))).toEqual(['Pay rent', 'Read book']);
    });

    test('includes completed todos', () => {
      const { query } = setup();
      expect(titles(query.search('ship'))).toEqual(['Ship release']);
    });

    test('trims the query', () => {
      const { query } = setup();
      expect(titles(query.search('  fix  '))).toEqual(['Fix bug']);
    });

    test.each(['', '   ', null, undefined])('returns [] for an empty query (%p)', (q) => {
      const { query } = setup();
      expect(query.search(q)).toEqual([]);
    });

    test('returns [] when nothing matches', () => {
      const { query } = setup();
      expect(query.search('zebra')).toEqual([]);
    });

    test('results include the project', () => {
      const { query, work } = setup();
      expect(query.search('bug')[0].project).toBe(work);
    });
  });

  describe('counts()', () => {
    test('returns badge numbers per smart list and open counts per project', () => {
      const { query, inbox, work } = setup();
      expect(query.counts()).toEqual({
        smartLists: { overview: 5, today: 1, important: 2, scheduled: 4, done: 2 },
        projects: { [inbox.id]: 3, [work.id]: 2 },
      });
    });

    test('an empty manager has zero everywhere', () => {
      const manager = new ProjectManager();
      const query = new TodoQuery(manager, { now: () => NOW });
      expect(query.counts()).toEqual({
        smartLists: { overview: 0, today: 0, important: 0, scheduled: 0, done: 0 },
        projects: { [manager.defaultProject.id]: 0 },
      });
    });
  });

  test('uses the real clock by default', () => {
    const manager = new ProjectManager();
    manager.addTodo(null, { title: 'Now', dueDate: toDateString(new Date()) });
    expect(titles(new TodoQuery(manager).smartList(SMART_LISTS.TODAY))).toEqual(['Now']);
  });
});
