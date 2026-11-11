# TodoUI: Project Plan

> Status: **approved** (2026-11-11). This is the reference for scope, architecture, and the task order.
> Live task tracking is in [.todo4vcode/shared-tasks.json](.todo4vcode/shared-tasks.json) (todo4vcode sidebar).
> The working agreement for sessions is in [CLAUDE.md](CLAUDE.md).

## 1. Goal
Build a todo list web app from [projectbrief.md](projectbrief.md), styled after [TodosUI.png](TodosUI.png):
- A three-pane layout: sidebar, todo list, and detail pane
- HTML, CSS, and plain JavaScript (ES modules), bundled with webpack
- Object-oriented code: classes split into modules
- Application logic strictly separated from DOM code
- Data saved to `localStorage`

## 2. Scope

### In scope
| Area | What's included |
|---|---|
| Projects | A default **Inbox** project that can't be deleted. Create, rename, and delete projects. Each project has a color dot. |
| Todos | `title`, `description`, `dueDate`, `priority`, `notes`, `checklist` (shown as "steps"), `completed`, `important` (star). Each todo lives in one project and can be moved to another. |
| List view | Title and due label ("Today", "Tomorrow", "Tue, 1 May"). Checkbox ring colored by priority. Star toggle. Icons for notes and checklist. |
| Detail pane | Click a todo to expand it, then view or edit every field. Delete is under the ⋮ menu. |
| Smart lists | Overview, Today, Important, Scheduled, Done, each with a count badge. |
| Search | Header search filters todos across all projects. |
| Header | Bell and avatar are static placeholders with no behavior. |
| Persistence | `localStorage`. Missing or corrupt data never crashes the app. Loaded data is turned back into class instances so their methods work. |
| Tooling | webpack, ESLint + Prettier, Jest (logic layer), GitHub Pages deploy. |

### Out of scope
- Sort toggle
- File attachments
- "Remind me at"
- Repeat
- Real users and notifications

## 3. Architecture

### 3.1 Folder structure
```
src/
├── index.js                     # entry: wires Storage → ProjectManager → App UI
├── template.html                # 3-pane shell (HtmlWebpackPlugin template)
├── styles/                      # variables.css, base.css, layout.css, sidebar.css,
│                                # todo-list.css, todo-detail.css, forms.css, modal.css, menu.css
└── js/
    ├── models/                  # pure data classes (no DOM)
    │   ├── ChecklistItem.js
    │   ├── Todo.js
    │   └── Project.js
    ├── core/                    # application logic (no DOM)
    │   ├── EventBus.js          # pub/sub, decouples logic from UI
    │   ├── ProjectManager.js    # CRUD for projects/todos, default project, move
    │   ├── TodoQuery.js         # smart lists, search, badge counts
    │   └── hydrate.js           # saved payload → ProjectManager, or fresh Inbox on bad data
    ├── storage/
    │   └── StorageService.js    # localStorage save/load, versioned key, safe parse
    ├── ui/                      # DOM only; talks to core via ProjectManager + EventBus
    │   ├── App.js               # UI controller: view state, re-renders panes
    │   ├── dom.js               # createElement/clear helpers
    │   └── components/
    │       ├── Header.js        # search + static bell/avatar
    │       ├── Sidebar.js       # smart lists, projects, badges, FAB
    │       ├── TodoListView.js  # middle pane + todo rows
    │       ├── TodoDetailView.js# right pane: edit, checklist, notes, delete
    │       ├── Modal.js         # base modal class (open/close, Esc, focus)
    │       ├── ProjectFormModal.js
    │       ├── ConfirmModal.js  # confirm dialog (delete project / todo)
    │       ├── DropdownMenu.js  # ⋮ action menu (list header, detail pane)
    │       ├── priorityField.js # Low/Medium/High picker (todo form, detail pane)
    │       └── TodoFormModal.js
    └── utils/
        ├── constants.js         # PRIORITIES, SMART_LISTS, STORAGE_KEY, colors
        ├── id.js                # crypto.randomUUID wrapper
        ├── dateFormat.js        # date-fns: formatDueLabel, isToday, isOverdue
        └── debounce.js          # debounce with cancel/flush (search input)
tests/                           # Jest, mirrors src/js (models, core, storage, utils)
webpack.config.js · babel.config.js · eslint.config.js · .prettierrc · package.json
```

### 3.2 Layers and data flow
```
 user event ──► ui/components ──► App ──► ProjectManager (core) ──► models
                                                  │
                                                  └─ emits "state:changed" on EventBus
                                                          │
                              ┌───────────────────────────┴──────────────┐
                              ▼                                          ▼
                   StorageService.save()                         App.render()
                   (autosave, wired in index.js)                 (re-draws panes)
```

### 3.3 Rules
1. **No DOM access outside `ui/`.** `models/`, `core/`, `storage/`, and `utils/` never touch `document` or `window`. `StorageService` gets its storage object passed into its constructor, so tests can pass a fake.
2. **One way to change state.** The UI changes state only by calling `ProjectManager` methods. It never changes model objects directly.
3. **Every mutation emits.** Each `ProjectManager` method that changes state emits `state:changed`.
4. **Serialization:**
   - Each model has `toJSON()` and `static fromJSON(obj)`.
   - `ProjectManager.fromJSON()` rebuilds the whole tree, which brings the methods back (the brief requires this).
5. **Storage payload:** `{ version: 1, projects: [...], activeView }`, saved under the key `todoui.v1`. If parsing fails or the version is unknown, `load()` returns `null` and the app starts fresh with the Inbox project.
6. **Priorities:** `low`, `medium`, and `high`. They're shown as CSS classes `priority--low`, `priority--medium`, and `priority--high` on the checkbox ring (green, amber, red).
7. **Dates:** stored as `yyyy-MM-dd` strings, or `null`. They're formatted only through `utils/dateFormat.js`, which uses date-fns.

### 3.4 Domain model
| Class | Fields | Main methods |
|---|---|---|
| `ChecklistItem` | `id`, `text`, `done` | `toggle()`, `toJSON()`, `fromJSON()` |
| `Todo` | `id`, `title`, `description`, `dueDate`, `priority`, `notes`, `checklist[]`, `completed`, `important`, `createdAt` | `update(fields)`, `toggleComplete()`, `toggleImportant()`, `setPriority()`, `addChecklistItem()`, `toggleChecklistItem()`, `removeChecklistItem()`, `toJSON()`, `fromJSON()` |
| `Project` | `id`, `name`, `color`, `isDefault`, `todos[]` | `addTodo()`, `removeTodo()`, `getTodo()`, `rename()`, `toJSON()`, `fromJSON()` |
| `ProjectManager` | `projects[]`, `bus`, `defaultProject` | `createProject()`, `renameProject()`, `deleteProject()`, `getProject()`, `addTodo()`, `updateTodo()`, `deleteTodo()`, `toggleTodoComplete()`, `toggleTodoImportant()`, `moveTodo()`, `findTodo()`, `addChecklistItem()`, `toggleChecklistItem()`, `removeChecklistItem()`, `toJSON()`, `fromJSON()` |
| `TodoQuery` | (works on a `ProjectManager`; injectable `now`) | `smartList(type)`, `projectList(projectId)`, `search(query)`, `counts()`. Results are `{ todo, project }[]`. |

Smart list rules:
- **Overview:** all open todos.
- **Today:** open todos due today.
- **Important:** open todos that are starred.
- **Scheduled:** open todos with a due date, sorted by date.
- **Done:** completed todos.

## 4. Stages and tasks

Every task in todo4vcode has:
- **Tags:**
  - Stage tag, `stage-N-name`
  - Type tag: `chore`, `feature`, `test`, or `docs`
  - Task id, e.g. `T08`
  - Code-link tags, e.g. `src/js/core/ProjectManager.js:1-120`. These are clickable in todo4vcode.
- **Subtasks:** the Definition of Done (DoD) checklist.
- **Description:** the goal, the DoD as text, and the proposed `Commit:` message (Conventional Commits).

Code-link line ranges are **estimates** until the task is done. Updating them to the real ranges is part of every task's DoD.

### Standard DoD (applies to every task, on top of its own items)
- [ ] `npm run lint` passes (from T02 on)
- [ ] `npm test` passes (from T03 on)
- [ ] `npm run build` succeeds (from T01 on)
- [ ] No DOM access in `models/`, `core/`, `storage/`, `utils/`
- [ ] Code-link tags updated to the real line ranges
- [ ] Commit message proposed to the user

### Task table
| ID | Stage | Priority | Task | Key files | Proposed commit |
|---|---|---|---|---|---|
| T00 | stage-0-planning | Must | Plan, CLAUDE.md, task backlog | plan.md, CLAUDE.md, .todo4vcode/shared-tasks.json | `docs: add project plan, CLAUDE.md and task backlog` |
| T01 | stage-1-setup | Must | npm init, webpack + dev server, HtmlWebpackPlugin, css/style loaders, `dev`/`build` scripts | package.json, webpack.config.js, src/index.js, src/template.html | `chore: set up webpack build with dev server and html template` |
| T02 | stage-1-setup | Must | ESLint (flat config) + Prettier + `lint`/`format` scripts | eslint.config.js, .prettierrc | `chore: add ESLint and Prettier configuration` |
| T03 | stage-1-setup | Must | Jest + babel-jest + `test` script, sanity test | babel.config.js, package.json, tests/ | `chore: configure Jest with Babel for unit tests` |
| T04 | stage-1-setup | Must | Folder skeleton, constants, id, dateFormat (date-fns) + tests | src/js/utils/* | `feat(utils): add constants, id generator and date helpers` |
| T05 | stage-2-models | Must | ChecklistItem + Todo class + tests | src/js/models/Todo.js, ChecklistItem.js | `feat(models): add Todo and ChecklistItem classes` |
| T06 | stage-2-models | Must | Project class + tests | src/js/models/Project.js | `feat(models): add Project class` |
| T07 | stage-3-logic | Must | EventBus (on/off/emit) + tests | src/js/core/EventBus.js | `feat(core): add EventBus for logic/UI decoupling` |
| T08 | stage-3-logic | Must | ProjectManager: default Inbox, project CRUD, todo CRUD, moveTodo, findTodo, toJSON/fromJSON + tests | src/js/core/ProjectManager.js | `feat(core): add ProjectManager with project and todo CRUD` |
| T09 | stage-3-logic | Must | TodoQuery: smart lists, search, counts + tests | src/js/core/TodoQuery.js | `feat(core): add smart list, search and count queries` |
| T10 | stage-4-persistence | Must | StorageService: save/load, missing/corrupt-data safety, versioning + tests | src/js/storage/StorageService.js | `feat(storage): add localStorage persistence service` |
| T11 | stage-4-persistence | Must | Bootstrap in index.js: load → hydrate → autosave on `state:changed` | src/index.js | `feat: hydrate state on load and autosave on change` |
| T12 | stage-5-ui-layout | Should | CSS tokens, base styles, 3-pane grid shell, Header | src/styles/*, src/template.html, Header.js | `feat(ui): add layout shell, design tokens and header` |
| T13 | stage-5-ui-layout | Must | dom helpers + App controller skeleton | src/js/ui/App.js, src/js/ui/dom.js | `feat(ui): add App controller and DOM helpers` |
| T14 | stage-6-ui-features | Must | Sidebar: smart lists + projects, badges, active selection, FAB | Sidebar.js, sidebar.css | `feat(ui): render sidebar with smart lists and projects` |
| T15 | stage-6-ui-features | Should | Modal base + ProjectFormModal: create, rename, delete; Inbox protected | Modal.js, ProjectFormModal.js | `feat(ui): add project create, rename and delete` |
| T16 | stage-6-ui-features | Must | TodoListView: priority ring, due label, icons, star, complete toggle, empty state | TodoListView.js, todo-list.css | `feat(ui): render todo list with priority colors and due labels` |
| T17 | stage-6-ui-features | Must | TodoFormModal via FAB | TodoFormModal.js | `feat(ui): add new todo form` |
| T18 | stage-6-ui-features | Must | TodoDetailView: inline edit, move project, complete/star, delete with confirm | TodoDetailView.js, todo-detail.css | `feat(ui): add todo detail pane with inline editing and delete` |
| T19 | stage-6-ui-features | Should | Checklist ("Add step") + Notes in detail pane | TodoDetailView.js | `feat(ui): add checklist steps and notes to todo detail` |
| T20 | stage-6-ui-features | Should | Search: debounced input → cross-project results | Header.js, App.js | `feat(ui): add cross-project search` |
| T21 | stage-7-polish | Should | Responsive layout, a11y, overdue styling | src/styles/*, src/js/ui/components/* | `style: add responsive layout and accessibility improvements` |
| T22 | stage-7-polish | Should | Manual QA against brief, bug fixes, README | README.md | `docs: update README and fix QA findings` |
| T23 | stage-8-release | Could | gh-pages deploy script, publicPath, README live link | package.json, webpack.config.js | `chore: add GitHub Pages deployment` |

Each task's specific DoD is in its todo4vcode subtasks.

## 5. Verification
- **Per task:** `npm run lint && npm test && npm run build`, plus a manual check in `npm run dev` for UI tasks.
- **End to end (T22):**
  1. Create a project. Add a todo with every field filled in. Edit, complete, star, and move it.
  2. Check all five smart lists and the search.
  3. Reload: the state survives.
  4. Clear localStorage and reload: the app starts with the Inbox project only.
  5. Set `todoui.v1` to `"{broken"` and reload: the app doesn't crash and starts fresh.
