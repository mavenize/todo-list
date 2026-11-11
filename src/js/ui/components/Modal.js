import { el, restoreFocus } from '../dom';
import { iconElement } from '../icons';

let modalCount = 0;

/**
 * Base class for modal dialogs, built on the native `<dialog>` element (`showModal()` gives
 * a focus trap, an inert page behind it and the backdrop).
 *
 * - Closes on Esc, on the close button and on a click on the backdrop.
 * - Focuses the first form field when it opens (or an element marked `data-autofocus`)
 *   and puts focus back where it was when it closes (see restoreFocus for re-rendered elements).
 *
 * Subclasses implement `renderContent()` and call `close()` when they are done.
 */
export class Modal {
  #title;
  #className;
  #dialog = null;
  #returnFocus = null;
  #pointerDownOnBackdrop = false;

  /**
   * @param {object} options
   * @param {string} options.title heading shown at the top, also the dialog's accessible name
   * @param {string} [options.className] extra class for the dialog, e.g. `modal--confirm`
   */
  constructor({ title, className = '' }) {
    this.#title = title;
    this.#className = className;
  }

  get isOpen() {
    return this.#dialog !== null;
  }

  /** Builds the dialog content. Called on every open(). */
  renderContent() {
    throw new Error(`${this.constructor.name} must implement renderContent()`);
  }

  open() {
    if (this.isOpen) return this;
    this.#returnFocus = document.activeElement;
    const titleId = `modal-title-${++modalCount}`;

    const dialog = el(
      'dialog',
      {
        class: ['modal', this.#className],
        attrs: { 'aria-labelledby': titleId },
        on: {
          // Esc: close through close() so cleanup and focus return always run.
          cancel: (event) => {
            event.preventDefault();
            this.close();
          },
          // A click on the backdrop targets the dialog itself (the panel covers the rest).
          // Both press and release must be on the backdrop, so a text selection that ends
          // outside the panel doesn't close the modal.
          pointerdown: (event) => {
            this.#pointerDownOnBackdrop = event.target === dialog;
          },
          click: (event) => {
            if (event.target === dialog && this.#pointerDownOnBackdrop) this.close();
          },
        },
      },
      el('div', { class: 'modal__panel' }, [
        el('div', { class: 'modal__header' }, [
          el('h2', { class: 'modal__title', attrs: { id: titleId } }, this.#title),
          el(
            'button',
            {
              class: 'icon-button modal__close',
              attrs: { type: 'button', 'aria-label': 'Close' },
              on: { click: () => this.close() },
            },
            iconElement('close'),
          ),
        ]),
        this.renderContent(),
      ]),
    );

    this.#dialog = dialog;
    document.body.append(dialog);
    dialog.showModal();
    this.#initialFocusTarget(dialog)?.focus();
    return this;
  }

  close() {
    if (!this.isOpen) return;
    const dialog = this.#dialog;
    this.#dialog = null;
    dialog.close();
    dialog.remove();
    restoreFocus(this.#returnFocus);
    this.#returnFocus = null;
  }

  #initialFocusTarget(dialog) {
    return (
      dialog.querySelector('[data-autofocus]') ??
      dialog.querySelector('input:not([type="hidden"]), select, textarea')
    );
  }
}
