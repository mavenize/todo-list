# CLAUDE.md: TodoUI

The context and working agreement for every Claude session in this repo. Read it first.

## Project in one paragraph
TodoUI is a todo list web app. It has projects, todos (title, description, due date, priority, notes, checklist, star), smart lists, search, and `localStorage` persistence. The stack is **HTML, CSS, and plain JS (ES modules)**, bundled with **webpack** and written as **OOP classes** in separate modules. App logic is strictly separated from DOM code. Tooling is ESLint + Prettier, Jest for the logic layer, and GitHub Pages for deploys.

## Key links
| What | Where |
|---|---|
| Requirements | [projectbrief.md](projectbrief.md) |
| UI mockup | [TodosUI.png](TodosUI.png) |
| Approved plan: scope, architecture, task table | [plan.md](plan.md) |
| Live task backlog (todo4vcode) | [.todo4vcode/shared-tasks.json](.todo4vcode/shared-tasks.json) |
| Domain models | [src/js/models/](src/js/models/) |
| App logic | [src/js/core/](src/js/core/) |
| Persistence | [src/js/storage/](src/js/storage/) |
| UI layer | [src/js/ui/](src/js/ui/) |
| Shared helpers | [src/js/utils/](src/js/utils/) |
| Styles | [src/styles/](src/styles/) |
| Tests | [tests/](tests/) |

Some of these paths are created by later tasks. If a folder is missing, check which task in the backlog creates it.

## Workflow (follow on every session)
1. **Orient.** Read this file, then [plan.md](plan.md), then [.todo4vcode/shared-tasks.json](.todo4vcode/shared-tasks.json). The next task is the lowest-numbered one (`T01`, `T02`, …) whose `status` isn't `Done`. Tell the user which task you're starting.
2. **Start.** Set that task's `status` to `"In Progress"` in shared-tasks.json.
3. **Implement only that task.** Don't start work that belongs to later tasks. If you find a needed change outside the task's scope, say so and propose adding a task instead.
4. **Check the DoD.** Each subtask is a Definition of Done item. Set a subtask's `completed: true` only after you've verified it.
5. **Verify.** Run `npm run lint`, `npm test`, and `npm run build` (each one once it exists). For UI tasks, also check the result in `npm run dev`.
6. **Update the code links.** Replace the estimated `path:start-end` tags with the real line ranges of the code the task added or changed.
7. **Finish:**
   - Set `status: "Done"` and `completed: true`.
   - Give the user a short summary and the **proposed commit message**, taken from the task's `Commit:` line and adjusted if the work changed.
8. **Stop.** **Never run `git commit` or `git push`; the user commits.** Wait for the user's go-ahead before starting the next task.

## Architecture rules (don't break them)
- **No DOM access outside `src/js/ui/`.** `models/`, `core/`, `storage/`, and `utils/` must not touch `document` or `window`. `StorageService` gets its storage object through its constructor.
- **All state changes go through `ProjectManager`.** The UI never changes model objects directly.
- **Every `ProjectManager` mutation emits `state:changed`** on the `EventBus`. Autosave (`StorageService.save`) and the `App` re-render subscribe to it.
- **Each model has `toJSON()` and `static fromJSON()`.** Loaded data is always turned back into class instances so their methods work.
- **Storage payload:** `{ version: 1, projects, activeView }`, saved under the key `todoui.v1`. `load()` never throws. On missing, corrupt, or unknown-version data it returns `null`, and the app starts with the default **Inbox** project.
- **Priorities:** `low`, `medium`, `high`. They're shown as CSS classes `priority--low`, `priority--medium`, and `priority--high`.
- **Dates:** stored as `yyyy-MM-dd` or `null`. They're formatted only via `src/js/utils/dateFormat.js`, which uses date-fns.
- **Inbox** is the default project. It can't be renamed or deleted.

## Conventions
- One class per file. File name = class name (`PascalCase.js`). Helper modules are `camelCase.js`.
- Use named exports. The only side-effect module is `src/index.js`.
- Private-ish fields use a `#private` field where it helps encapsulation. Keep `toJSON()` explicit.
- CSS: design tokens go in `variables.css`. Class names use BEM-ish naming (`todo-item`, `todo-item__title`, `todo-item--selected`).
- Tests live in `tests/`, mirroring `src/js/`, named `<Name>.test.js`. Only the logic layer is unit-tested.
- Commits use Conventional Commits: `feat`, `fix`, `chore`, `docs`, `style`, `refactor`, `test`, with a scope where it helps (`feat(core): ...`).

## npm scripts
These are added by T01–T03 and T23.
| Script | Purpose |
|---|---|
| `npm run dev` | webpack-dev-server with live reload |
| `npm run build` | Production bundle into `dist/` |
| `npm run lint` / `lint:fix` | ESLint |
| `npm run format` | Prettier write |
| `npm test` / `test:watch` | Jest |
| `npm run deploy` | Build and publish `dist/` to GitHub Pages |

## todo4vcode task format
The file is `.todo4vcode/shared-tasks.json`. Its shape is `{ "format": "todo4vcode-shared-tasks", "version": "1.0.0", "tasks": [...] }`. The VS Code extension watches it, so keep it valid JSON.

| Field | Values / notes |
|---|---|
| `id` | `todoui-tNN` |
| `text` | `TNN · Title` |
| `description` | Goal, Definition of Done list, `Commit: <message>` |
| `priority` | `Must` \| `Should` \| `Could` \| `Wont` |
| `status` | `Todo` \| `In Progress` \| `Done`. Keep `completed` in sync (`true` only when `Done`). |
| `order` | `(N+1) * 1000` |
| `subtasks` | `[{ "id": "tNN-dodK", "text": "...", "completed": false }]`, one per DoD item |
| `tags` | See below |

**Tags:**
- Stage tag: `stage-0-planning`, `stage-1-setup`, `stage-2-models`, `stage-3-logic`, `stage-4-persistence`, `stage-5-ui-layout`, `stage-6-ui-features`, `stage-7-polish`, `stage-8-release`
- Type tag: `chore`, `feature`, `docs`, `test`
- Task id: `TNN`
- **Code links:** `path/to/file.js:12-48`, `path/to/file.js:12`, or a folder like `src/styles/`. Any tag with a `/` or a file extension shows as a clickable link. Keep stage and type tags free of `/` and `.`.

To add a new task, take the next free `TNN`, include the standard DoD items (listed in [plan.md](plan.md) §4), and add a row to the task table in plan.md.

## Status log
Update this when a stage is completed.
- 2026-11-11: Stage 0 (planning) done. Plan approved. Backlog T00–T23 created. Next: **T01**.
