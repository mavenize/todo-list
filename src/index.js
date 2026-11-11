// Entry point and the only side-effect module: wires storage, the event bus and the
// ProjectManager together. The UI (App) is mounted here from T13 on.
/* global process */
import './styles/base.css';
import { EventBus } from './js/core/EventBus';
import { hydrateProjectManager } from './js/core/hydrate';
import { StorageService } from './js/storage/StorageService';
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

// The UI view (active list/project) is persisted alongside the projects. App takes it over in T13.
const activeView = saved?.activeView ?? null;

bus.on(EVENTS.STATE_CHANGED, () => {
  if (!storage.save({ ...manager.toJSON(), activeView })) {
    console.warn('TodoUI: could not save to localStorage.');
  }
});

// Development-only hook for checking persistence in DevTools before the UI exists.
if (process.env.NODE_ENV !== 'production') {
  window.todoui = { manager, storage, bus };
}
