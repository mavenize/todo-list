import { el } from '../dom';
import { Modal } from './Modal';

/**
 * Asks the user to confirm an action, e.g. a delete. Cancel has the initial focus,
 * so pressing Enter right away never confirms by accident.
 */
export class ConfirmModal extends Modal {
  #message;
  #confirmLabel;
  #danger;
  #onConfirm;

  /**
   * @param {object} options
   * @param {string} options.title
   * @param {string} options.message
   * @param {string} [options.confirmLabel]
   * @param {boolean} [options.danger] styles the confirm button as destructive
   * @param {() => void} options.onConfirm
   */
  constructor({ title, message, confirmLabel = 'Confirm', danger = false, onConfirm }) {
    super({ title, className: 'modal--confirm' });
    this.#message = message;
    this.#confirmLabel = confirmLabel;
    this.#danger = danger;
    this.#onConfirm = onConfirm;
  }

  renderContent() {
    return el('div', { class: 'modal__body' }, [
      el('p', { class: 'modal__message' }, this.#message),
      el('div', { class: 'modal__actions' }, [
        el(
          'button',
          {
            class: 'button button--secondary',
            attrs: { type: 'button', 'data-autofocus': true },
            on: { click: () => this.close() },
          },
          'Cancel',
        ),
        el(
          'button',
          {
            class: ['button', this.#danger ? 'button--danger' : 'button--primary'],
            attrs: { type: 'button' },
            on: {
              click: () => {
                this.close();
                this.#onConfirm();
              },
            },
          },
          this.#confirmLabel,
        ),
      ]),
    ]);
  }
}
