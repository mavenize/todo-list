// Framework-free debounce. No DOM access (setTimeout/clearTimeout are plain timer globals).

/**
 * Returns a function that calls `fn` once `wait` ms have passed without another call,
 * with the arguments of the last call.
 *
 * The returned function also has:
 * - `cancel()` drops a pending call
 * - `flush()` runs a pending call right away
 * - `pending` is true while a call is waiting
 *
 * @template {(...args: any[]) => void} F
 * @param {F} fn
 * @param {number} wait milliseconds
 * @returns {F & { cancel: () => void, flush: () => void, readonly pending: boolean }}
 */
export function debounce(fn, wait) {
  if (typeof fn !== 'function') {
    throw new TypeError('debounce: fn must be a function');
  }
  let timer = null;
  let lastArgs = [];

  const run = () => {
    timer = null;
    fn(...lastArgs);
  };

  const debounced = (...args) => {
    lastArgs = args;
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(run, wait);
  };

  debounced.cancel = () => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
  };

  debounced.flush = () => {
    if (timer === null) return;
    clearTimeout(timer);
    run();
  };

  Object.defineProperty(debounced, 'pending', { get: () => timer !== null });

  return debounced;
}
