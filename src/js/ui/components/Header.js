import { iconMarkup } from '../icons';

/**
 * Top bar across the list and detail panes: the search field plus a static
 * notification bell and user avatar. The bell and avatar have no behavior (out of scope).
 * Search filtering is wired up in T20.
 */
export class Header {
  #root;
  #searchInput = null;

  /** @param {HTMLElement} root the `<header>` element to render into */
  constructor(root) {
    this.#root = root;
  }

  /** The search `<input>`, available after render(). */
  get searchInput() {
    return this.#searchInput;
  }

  render() {
    // Static markup only: nothing here comes from user data.
    this.#root.innerHTML = `
      <label class="search">
        ${iconMarkup('search')}
        <span class="visually-hidden">Search todos</span>
        <input class="search__input" type="search" placeholder="Search..." autocomplete="off" />
      </label>
      <span class="app-header__bell" role="img" aria-label="Notifications">
        ${iconMarkup('bell')}
        <span class="app-header__bell-dot"></span>
      </span>
      <div class="user-chip" aria-label="Signed in as Guest">
        <span class="user-chip__avatar" aria-hidden="true">G</span>
        <span class="user-chip__name">Guest</span>
        ${iconMarkup('chevronDown', 'user-chip__chevron')}
      </div>
    `;
    this.#searchInput = this.#root.querySelector('.search__input');
    return this;
  }
}
