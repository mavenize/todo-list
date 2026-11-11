import { SEARCH_DEBOUNCE_MS } from '../../utils/constants';
import { debounce } from '../../utils/debounce';
import { iconMarkup } from '../icons';

/**
 * Top bar across the list and detail panes: the search field plus a static
 * notification bell and user avatar. The bell and avatar have no behavior (out of scope).
 *
 * Search: typing reports the query through `onSearch` after a short pause (debounced).
 * Emptying the field reports '' right away, and Esc clears it, so the list returns to
 * the previous view immediately.
 */
export class Header {
  #root;
  #onSearch;
  #searchInput = null;
  #debouncedSearch;

  /**
   * @param {HTMLElement} root the `<header>` element to render into
   * @param {object} [options]
   * @param {(query: string) => void} [options.onSearch]
   * @param {number} [options.debounceMs]
   */
  constructor(root, { onSearch = () => {}, debounceMs = SEARCH_DEBOUNCE_MS } = {}) {
    this.#root = root;
    this.#onSearch = onSearch;
    this.#debouncedSearch = debounce((query) => this.#onSearch(query), debounceMs);
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
        <input class="search__input" type="search" placeholder="Search..." autocomplete="off"
          aria-controls="list-pane" />
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
