// Inline SVG icons (24×24, stroke-based). Static markup only: never mix user data into it.

const PATHS = Object.freeze({
  logo: '<path d="M12 3 21.5 20h-19z"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
  bell: '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
  chevronDown: '<path d="m6 9 6 6 6-6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  check: '<path d="m5.5 12.5 4 4 9-9"/>',
  note: '<path d="M5 4.5h14v10l-5 5H5z"/><path d="M14 19.5v-5h5"/>',
  checklist:
    '<path d="M10 7h10M10 12h10M10 17h10"/><path d="m3.5 7 1.5 1.5L7.5 6M3.5 15.5h3v3h-3z"/>',
  // Round line caps turn these zero-length strokes into dots; use with a thicker stroke.
  more: '<path d="M12 5h.01M12 12h.01M12 19h.01"/>',
  // Smart lists
  grid:
    '<rect x="4" y="4" width="4" height="4" rx="1"/><rect x="10" y="4" width="4" height="4" rx="1"/>' +
    '<rect x="16" y="4" width="4" height="4" rx="1"/><rect x="4" y="10" width="4" height="4" rx="1"/>' +
    '<rect x="10" y="10" width="4" height="4" rx="1"/><rect x="16" y="10" width="4" height="4" rx="1"/>' +
    '<rect x="4" y="16" width="4" height="4" rx="1"/><rect x="10" y="16" width="4" height="4" rx="1"/>' +
    '<rect x="16" y="16" width="4" height="4" rx="1"/>',
  calendar:
    '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>' +
    '<path d="M8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01"/>',
  star: '<path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>',
  alarm: '<circle cx="12" cy="13" r="7.5"/><path d="M12 9v4l2.5 2M4.5 3.5l-2 2M19.5 3.5l2 2"/>',
  calendarCheck:
    '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>' +
    '<path d="m9 15 2 2 4-4"/>',
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

/**
 * The same icon as an SVG element, for use with `el()` children.
 * @param {keyof typeof PATHS} name
 * @param {string} [className]
 * @returns {SVGSVGElement}
 */
export function iconElement(name, className = '') {
  const template = document.createElement('template');
  template.innerHTML = iconMarkup(name, className);
  return template.content.firstElementChild;
}
