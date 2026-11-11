import { SEARCH_DEBOUNCE_MS } from '../../utils/constants';
import { debounce } from '../../utils/debounce';
import { iconMarkup } from '../icons';

/**
 * Top bar across the list and detail panes: the search field plus a static
 * notification bell and user avatar. The bell and avatar have no behavior (out of scope).
 *
 * On narrow screens a ☰ button (hidden by CSS on wider ones) toggles the sidebar drawer.
 *
 * Search: typing reports the query through `onSearch` after a short pause (debounced).
 * Emptying the field reports '' right away, and Esc clears it, so the list returns to
 * the previous view immediately.
 */
export class Header {
  #root;
  #onSearch;
  #onToggleNav;
  #searchInput = null;
  #menuButton = null;
  #debouncedSearch;

  /**
   * @param {HTMLElement} root the `<header>` element to render into
   * @param {object} [options]
   * @param {(query: string) => void} [options.onSearch]
   * @param {() => void} [options.onToggleNav] the ☰ button was pressed
   * @param {number} [options.debounceMs]
   */
  constructor(
    root,
    { onSearch = () => {}, onToggleNav = () => {}, debounceMs = SEARCH_DEBOUNCE_MS } = {},
  ) {
    this.#root = root;
    this.#onSearch = onSearch;
    this.#onToggleNav = onToggleNav;
    this.#debouncedSearch = debounce((query) => this.#onSearch(query), debounceMs);
  }

  /** The search `<input>`, available after render(). */
  get searchInput() {
    return this.#searchInput;
  }

  /** The ☰ button, available after render(). */
  get menuButton() {
    return this.#menuButton;
  }

  /** Reflects the drawer state on the ☰ button. */
  setNavOpen(open) {
    this.#menuButton?.setAttribute('aria-expanded', String(open));
  }

  render() {
    // Static markup only: nothing here comes from user data.
    this.#root.innerHTML = `
      <button class="icon-button app-header__menu" type="button" aria-label="Lists and projects"
        aria-expanded="false" aria-controls="sidebar">
        ${iconMarkup('menu')}
      </button>
      <label class="search">
        ${iconMarkup('search')}
        <span class="visually-hidden">Search todos</span>
        <input class="search__input" type="search" placeholder="Search..." autocomplete="off"
          aria-controls="list-pane" />
      </label>
      <span class="app-header__bell" role="img" aria-label="Notifications">
        ${iconMarkup('bell')}
        <span class="app-header__bell-dot"></span>
      </span>
      <div class="user-chip">
        <span class="user-chip__avatar" aria-hidden="true">G</span>
        <span class="visually-hidden">Signed in as Guest</span>
        <span class="user-chip__name" aria-hidden="true">Guest</span>
        ${iconMarkup('chevronDown', 'user-chip__chevron')}
      </div>
    `;
    this.#menuButton = this.#root.querySelector('.app-header__menu');
    this.#menuButton.addEventListener('click', () => this.#onToggleNav());
    this.#searchInput = this.#root.querySelector('.search__input');
    this.#searchInput.addEventListener('input', () => this.#onInput());
    this.#searchInput.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && this.#searchInput.value !== '') {
        // Handle Esc ourselves (the native type="search" clear varies by browser).
        event.preventDefault();
        this.#searchInput.value = '';
        this.#onInput();
      } else if (event.key === 'Enter') {
        // Enter shows the results right away instead of waiting for the pause.
        this.#debouncedSearch.flush();
      }
    });
    return this;
  }

  /**
   * Shows `query` in the search field when the app changed it (e.g. a sidebar click ended the
   * search). Drops a pending debounced search so it can't bring the old query back.
   * Leaves the field alone while the user is typing in it.
   */
  setQuery(query) {
    const input = this.#searchInput;
    if (!input || document.activeElement === input || input.value === query) return;
    this.#debouncedSearch.cancel();
    input.value = query;
  }

  #onInput() {
    const query = this.#searchInput.value;
    if (query.trim() === '') {
      this.#debouncedSearch.cancel();
      this.#onSearch('');
    } else {
      this.#debouncedSearch(query);
    }
  }
}
