import { PROJECT_COLORS } from '../../utils/constants';
import { el } from '../dom';
import { Modal } from './Modal';

const MAX_NAME_LENGTH = 50;

/** Accessible names for the palette swatches. */
const COLOR_NAMES = Object.freeze({
  '#4a7cf6': 'Blue',
  '#f5c142': 'Yellow',
  '#6c4ee0': 'Purple',
  '#f0643f': 'Orange',
  '#3fbf7f': 'Green',
  '#e5487a': 'Pink',
});

let formCount = 0;

/**
 * Create a project (name + color) or rename one (name only).
 * It only collects input: `onSubmit` makes the change through the ProjectManager.
 * If `onSubmit` throws, the error message is shown and the modal stays open.
 */
export class ProjectFormModal extends Modal {
  #project;
  #colors;
  #defaultColor;
  #onSubmit;
  #ids;
  #nameInput = null;
  #error = null;

  /**
   * @param {object} options
   * @param {{ name: string }|null} [options.project] the project to rename; null creates a new one
   * @param {string} [options.defaultColor] preselected color when creating
   * @param {ReadonlyArray<string>} [options.colors]
   * @param {(values: { name: string, color?: string }) => void} options.onSubmit
   *   `color` is only passed when creating
   */
  constructor({ project = null, defaultColor, colors = PROJECT_COLORS, onSubmit }) {
    super({ title: project ? 'Rename project' : 'New project' });
    this.#project = project;
    this.#colors = colors;
    this.#defaultColor = colors.includes(defaultColor) ? defaultColor : colors[0];
    this.#onSubmit = onSubmit;
    const n = ++formCount;
    this.#ids = {
      name: `project-name-${n}`,
      error: `project-error-${n}`,
      color: `project-color-${n}`,
    };
  }

  renderContent() {
    const isRename = this.#project !== null;
    this.#nameInput = el('input', {
      class: 'field__input',
      attrs: {
        id: this.#ids.name,
        name: 'name',
        type: 'text',
        value: isRename ? this.#project.name : '',
        maxlength: MAX_NAME_LENGTH,
        autocomplete: 'off',
        required: true,
        'aria-describedby': this.#ids.error,
      },
      on: { input: () => this.#showError('') },
    });
    this.#error = el('p', {
      class: 'field__error',
      attrs: { id: this.#ids.error, 'aria-live': 'polite' },
    });

    return el(
      'form',
      {
        class: 'modal__body',
        // Validation messages are our own, so they match the app's style and wording.
        attrs: { novalidate: true },
        on: { submit: (event) => this.#submit(event) },
      },
      [
        el('div', { class: 'field' }, [
          el('label', { class: 'field__label', attrs: { for: this.#ids.name } }, 'Name'),
          this.#nameInput,
          this.#error,
        ]),
        isRename ? null : this.#colorField(),
        el('div', { class: 'modal__actions' }, [
          el(
            'button',
            {
              class: 'button button--secondary',
              attrs: { type: 'button' },
              on: { click: () => this.close() },
            },
            'Cancel',
          ),
          el(
            'button',
            { class: 'button button--primary', attrs: { type: 'submit' } },
            isRename ? 'Save' : 'Create project',
          ),
        ]),
      ],
    );
  }

  #colorField() {
    return el('fieldset', { class: 'field color-picker' }, [
      el('legend', { class: 'field__label' }, 'Color'),
      el(
        'div',
        { class: 'color-picker__options' },
        this.#colors.map((color) => {
          const swatch = el('span', {
            class: 'color-picker__swatch',
            attrs: { 'aria-hidden': 'true' },
          });
          swatch.style.setProperty('--swatch-color', color);
          return el(
            'label',
            { class: 'color-picker__option', attrs: { title: COLOR_NAMES[color] ?? color } },
            [
              el('input', {
                class: 'color-picker__input',
                attrs: {
                  type: 'radio',
                  name: this.#ids.color,
                  value: color,
                  checked: color === this.#defaultColor,
                },
              }),
              swatch,
              el('span', { class: 'visually-hidden' }, COLOR_NAMES[color] ?? color),
            ],
          );
        }),
      ),
    ]);
  }

  #submit(event) {
    event.preventDefault();
    const name = this.#nameInput.value.trim();
    if (name === '') {
      this.#showError('Please enter a project name.');
      this.#nameInput.focus();
      return;
    }
    const values = { name };
    if (this.#project === null) {
      const checked = event.currentTarget.querySelector('.color-picker__input:checked');
      values.color = checked ? checked.value : this.#defaultColor;
    }
    try {
      this.#onSubmit(values);
    } catch (error) {
      this.#showError(error.message);
      return;
    }
    this.close();
  }

  #showError(message) {
    this.#error.textContent = message;
    if (message) {
      this.#nameInput.setAttribute('aria-invalid', 'true');
    } else {
      this.#nameInput.removeAttribute('aria-invalid');
    }
  }
}
