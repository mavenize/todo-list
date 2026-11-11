// Entry point and the only side-effect module: wires storage, the event bus, the
// ProjectManager and the App UI together.
/* global process */
import './styles/variables.css';
import './styles/base.css';
import './styles/layout.css';
import { EventBus } from './js/core/EventBus';
import { hydrateProjectManager } from './js/core/hydrate';
import { StorageService } from './js/storage/StorageService';
import { App } from './js/ui/App';
import { EVENTS } from './js/utils/constants';

/** window.localStorage, or null when the browser blocks it (the getter itself can throw). */
function getLocalStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

const storage = new StorageService(getLocalStorage());
const bus = new EventBus();

const saved = storage.load();
const { manager, error } = hydrateProjectManager(saved, bus);
if (error) {
  console.warn('TodoUI: saved data could not be restored, starting fresh.', error);
}

const app = new App({
  manager,
  bus,
  panes: {
    header: document.getElementById('app-header'),
    sidebar: document.getElementById('sidebar'),
    list: document.getElementById('list-pane'),
    detail: document.getElementById('detail-pane'),
  },
  initialView: saved?.activeView ?? null,
  onViewChange: () => persist(),
});

/** Saves the projects plus the active view (the UI view survives reloads). */
function persist() {
  if (!storage.save({ ...manager.toJSON(), activeView: app.activeView })) {
    console.warn('TodoUI: could not save to localStorage.');
  }
}

// Autosave subscribes before App mounts, so data is saved before the UI re-renders.
bus.on(EVENTS.STATE_CHANGED, persist);
app.mount();

// Development-only hook for inspecting state in DevTools.
if (process.env.NODE_ENV !== 'production') {
  window.todoui = { app, manager, storage, bus };
}
