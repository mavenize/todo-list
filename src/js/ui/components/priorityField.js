import { DEFAULT_PRIORITY, PRIORITY_LIST } from '../../utils/constants';
import { el } from '../dom';

const PRIORITY_LABELS = Object.freeze({ low: 'Low', medium: 'Medium', high: 'High' });

/**
 * Priority picker: Low / Medium / High as a segmented radio group, each with its color dot.
 * Used by the new-todo form and the detail pane.
 * @param {object} [options]
 * @param {string} [options.name] radio group name (must be unique per document when shown twice)
 * @param {string} [options.value] checked priority
 * @param {string} [options.label] visible legend
 * @param {(priority: string) => void} [options.onChange]
 * @returns {HTMLFieldSetElement}
 */
export function priorityField({
  name = 'priority',
  value = DEFAULT_PRIORITY,
  label = 'Priority',
  onChange,
} = {}) {
  return el('fieldset', { class: 'field' }, [
    el('legend', { class: 'field__label' }, label),
    el(
      'div',
      { class: 'segmented' },
      PRIORITY_LIST.map((priority) =>
        el('label', { class: 'segmented__option' }, [
          el('input', {
            class: 'segmented__input',
            attrs: { type: 'radio', name, value: priority, checked: priority === value },
            on: onChange ? { change: () => onChange(priority) } : {},
          }),
          el('span', { class: 'segmented__label' }, [
            el('span', {
              class: ['segmented__dot', `priority--${priority}`],
              attrs: { 'aria-hidden': 'true' },
            }),
            PRIORITY_LABELS[priority] ?? priority,
          ]),
        ]),
      ),
    ),
  ]);
}
