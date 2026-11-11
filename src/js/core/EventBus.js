function defaultOnError(error, event) {
  console.error(`EventBus: a "${event}" handler threw`, error);
}

/**
 * Minimal pub/sub that decouples the logic layer from the UI and storage.
 * No DOM access: handlers are plain functions.
 */
export class EventBus {
  #handlers = new Map();
  #onError;

  /** `onError(error, event, payload)` is called when a handler throws. Defaults to console.error. */
  constructor({ onError = defaultOnError } = {}) {
    this.#onError = onError;
  }

  /**
   * Subscribes `handler` to `event` and returns a function that unsubscribes it.
   * Subscribing the same handler twice to one event has no extra effect.
   */
  on(event, handler) {
    if (typeof handler !== 'function') {
      throw new TypeError('EventBus handler must be a function');
    }
    if (!this.#handlers.has(event)) {
      this.#handlers.set(event, new Set());
    }
    this.#handlers.get(event).add(handler);
    return () => this.off(event, handler);
  }

  /** Unsubscribes `handler` from `event`. Unknown events or handlers are ignored. */
  off(event, handler) {
    const handlers = this.#handlers.get(event);
    if (!handlers) return;
    handlers.delete(handler);
    if (handlers.size === 0) {
      this.#handlers.delete(event);
    }
  }

  /**
   * Calls every handler of `event` with `payload`, in subscription order.
   * A handler that throws is reported through `onError` and does not stop the others.
   * Handlers added or removed during an emit take effect from the next emit.
   */
  emit(event, payload) {
    const handlers = this.#handlers.get(event);
    if (!handlers) return;
    for (const handler of [...handlers]) {
      try {
        handler(payload);
      } catch (error) {
        this.#onError(error, event, payload);
      }
    }
  }
}
