import { el } from '../dom';
import { iconElement } from '../icons';

let menuCount = 0;

/**
 * A ⋮ button that opens a small action menu (ARIA menu button pattern).
 * Keyboard: Enter/Space opens and focuses the first item, ↑/↓ move, Esc closes and returns
 * focus to the button, Tab closes. A click outside closes it too.
 */
export class DropdownMenu {
  #label;
  #items;
  #focusKey;
  #root = null;
  #button = null;
  #menu = null;
  #onDocumentPointerDown = (event) => {
    if (!this.#root.isConnected || !this.#root.contains(event.target)) this.close();
  };

  /**
   * @param {object} options
   * @param {string} [options.label] accessible name of the ⋮ button
   * @param {Array<{ label: string, onSelect: () => void, danger?: boolean }>} options.items
   * @param {string} [options.focusKey] `data-focus-key` for the ⋮ button, so focus can return
   *   to it after a re-render (see restoreFocus)
   */
  constructor({ label = 'More actions', items, focusKey }) {
    this.#label = label;
    this.#items = items;
    this.#focusKey = focusKey;
  }

  get isOpen() {
    return this.#menu !== null && !this.#menu.hidden;
  }

  /** Builds and returns the menu's root element. */
  render() {
    const menuId = `menu-${++menuCount}`;
    this.#button = el(
      'button',
      {
        class: 'icon-button dropdown__button',
        attrs: {
          type: 'button',
          'aria-label': this.#label,
          title: this.#label,
          'aria-haspopup': 'menu',
          'aria-expanded': 'false',
          'aria-controls': menuId,
          'data-focus-key': this.#focusKey,
        },
        on: { click: () => (this.isOpen ? this.close() : this.open()) },
      },
      iconElement('more', 'dropdown__icon'),
    );
    this.#menu = el(
      'ul',
      {
        class: 'dropdown__menu',
        attrs: { id: menuId, role: 'menu', hidden: true },
        on: { keydown: (event) => this.#onMenuKeydown(event) },
      },
      this.#items.map(({ label, onSelect, danger = false }) =>
        el(
          'li',
          { attrs: { role: 'none' } },
          el(
            'button',
            {
              class: ['dropdown__item', danger && 'dropdown__item--danger'],
              attrs: { type: 'button', role: 'menuitem', tabindex: '-1' },
              on: {
                click: () => {
                  this.close({ focusButton: true });
                  onSelect();
                },
              },
            },
            label,
          ),
        ),
      ),
    );
    this.#root = el('div', { class: 'dropdown' }, [this.#button, this.#menu]);
    return this.#root;
  }

  open() {
    if (this.isOpen) return;
    this.#menu.hidden = false;
    this.#button.setAttribute('aria-expanded', 'true');
    document.addEventListener('pointerdown', this.#onDocumentPointerDown);
    this.#menuItems()[0]?.focus();
  }

  close({ focusButton = false } = {}) {
    if (!this.isOpen) return;
    this.#menu.hidden = true;
    this.#button.setAttribute('aria-expanded', 'false');
    document.removeEventListener('pointerdown', this.#onDocumentPointerDown);
    if (focusButton) this.#button.focus();
  }

  #menuItems() {
    return [...this.#menu.querySelectorAll('[role="menuitem"]')];
  }

  #onMenuKeydown(event) {
    const items = this.#menuItems();
    const index = items.indexOf(document.activeElement);
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        items[(index + 1) % items.length].focus();
        break;
      case 'ArrowUp':
        event.preventDefault();
        items[(index - 1 + items.length) % items.length].focus();
        break;
      case 'Home':
        event.preventDefault();
        items[0].focus();
        break;
      case 'End':
        event.preventDefault();
        items[items.length - 1].focus();
        break;
      case 'Escape':
        event.preventDefault();
        this.close({ focusButton: true });
        break;
      case 'Tab':
        this.close();
        break;
      default:
    }
  }
}
