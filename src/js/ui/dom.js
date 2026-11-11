// Small DOM helpers for the UI layer. Text always goes in as text nodes, never as HTML,
// so user data can't inject markup.

/** Joins class names, skipping falsy entries: 'a', ['a', cond && 'b'] → 'a b'. */
function classNames(value) {
  if (Array.isArray(value)) return value.filter(Boolean).join(' ');
  return value || '';
}

/** Appends children: nodes, strings/numbers (as text), nested arrays. null/undefined/false are skipped. */
function append(parent, children) {
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    if (Array.isArray(child)) {
      append(parent, child);
    } else if (child instanceof Node) {
      parent.append(child);
    } else {
      parent.append(document.createTextNode(String(child)));
    }
  }
}

/**
 * Creates an element.
 * @param {string} tag
 * @param {object} [options]
 * @param {string|Array<string|false|null|undefined>} [options.class] class names; falsy entries are skipped
 * @param {Record<string, string|number|boolean|null|undefined>} [options.attrs] `true` sets an empty
 *   attribute, `false`/`null`/`undefined` leaves it out
 * @param {Record<string, EventListener>} [options.on] event listeners by event type
 * @param {Array|Node|string|number|null|false} [children]
 * @returns {HTMLElement}
 *
 * @example el('button', { class: ['btn', active && 'btn--active'], on: { click: onSelect } }, 'Today')
 */
export function el(tag, { class: className, attrs = {}, on = {} } = {}, children = []) {
  const node = document.createElement(tag);
  const classes = classNames(className);
  if (classes) node.className = classes;

  for (const [name, value] of Object.entries(attrs)) {
    if (value === false || value === null || value === undefined) continue;
    node.setAttribute(name, value === true ? '' : String(value));
  }
  for (const [type, handler] of Object.entries(on)) {
    node.addEventListener(type, handler);
  }

  append(node, Array.isArray(children) ? children : [children]);
  return node;
}

/** Removes all children of `node` and returns it. */
export function clear(node) {
  node.replaceChildren();
  return node;
}

/**
 * Moves focus back to `node`. If a re-render has replaced it, focuses the element that now
 * carries the same `data-focus-key` instead. Give elements that keep focus across renders a key.
 */
export function restoreFocus(node) {
  if (!node) return;
  if (node.isConnected) {
    node.focus();
    return;
  }
  const key = node.dataset?.focusKey;
  if (key) document.querySelector(`[data-focus-key="${CSS.escape(key)}"]`)?.focus();
}

/**
 * Runs `render` (which replaces the content of `container`) and keeps keyboard focus:
 * if an element with a `data-focus-key` inside `container` had focus, the new element
 * with the same key gets it back.
 * @returns {boolean} true when focus was restored this way
 */
export function preserveFocus(container, render) {
  const active = document.activeElement;
  const key = active && container.contains(active) ? active.dataset?.focusKey : undefined;
  render();
  if (!key) return false;
  const target = container.querySelector(`[data-focus-key="${CSS.escape(key)}"]`);
  target?.focus();
  return Boolean(target);
}
