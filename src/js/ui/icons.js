// Inline SVG icons (24×24, stroke-based). Static markup only: never mix user data into it.

const PATHS = Object.freeze({
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
  bell: '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
  chevronDown: '<path d="m6 9 6 6 6-6"/>',
});

/**
 * SVG markup for a named icon.
 * @param {keyof typeof PATHS} name
 * @param {string} [className] extra classes added after `icon`
 * @returns {string}
 */
export function iconMarkup(name, className = '') {
  const paths = PATHS[name];
  if (!paths) {
    throw new Error(`Unknown icon: ${name}`);
  }
  const classes = className ? `icon ${className}` : 'icon';
  return `<svg class="${classes}" viewBox="0 0 24 24" aria-hidden="true">${paths}</svg>`;
}
