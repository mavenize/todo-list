import { ProjectManager } from './ProjectManager';

/**
 * Turns a payload from `StorageService.load()` back into a ProjectManager.
 * Falls back to a fresh manager (Inbox only) when there is no payload or it can't be rebuilt,
 * so bad saved data never crashes the app. No DOM access.
 *
 * Returns `{ manager, restored, error }`: `restored` is true when saved data was used,
 * `error` is the reason saved data was rejected (or null).
 */
export function hydrateProjectManager(saved, bus) {
  if (saved) {
    try {
      return { manager: ProjectManager.fromJSON(saved, bus), restored: true, error: null };
    } catch (error) {
      return { manager: new ProjectManager({ bus }), restored: false, error };
    }
  }
  return { manager: new ProjectManager({ bus }), restored: false, error: null };
}
