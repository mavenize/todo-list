// Shared, framework-free constants. No DOM access here.

export const PRIORITIES = Object.freeze({
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
});

/** Ordered from lowest to highest, for selects and sorting. */
export const PRIORITY_LIST = Object.freeze([PRIORITIES.LOW, PRIORITIES.MEDIUM, PRIORITIES.HIGH]);

export const DEFAULT_PRIORITY = PRIORITIES.MEDIUM;

export const SMART_LISTS = Object.freeze({
  OVERVIEW: 'overview',
  TODAY: 'today',
  IMPORTANT: 'important',
  SCHEDULED: 'scheduled',
  DONE: 'done',
});

/** Sidebar order and display labels for the smart lists. */
export const SMART_LIST_ITEMS = Object.freeze([
  { id: SMART_LISTS.OVERVIEW, label: 'Overview' },
  { id: SMART_LISTS.TODAY, label: 'Today' },
  { id: SMART_LISTS.IMPORTANT, label: 'Important' },
  { id: SMART_LISTS.SCHEDULED, label: 'Scheduled' },
  { id: SMART_LISTS.DONE, label: 'Done' },
]);

export const PROJECT_COLORS = Object.freeze([
  '#4a7cf6', // blue
  '#f5c142', // yellow
  '#6c4ee0', // purple
  '#f0643f', // orange
  '#3fbf7f', // green
  '#e5487a', // pink
]);

export const DEFAULT_PROJECT = Object.freeze({
  name: 'Inbox',
  color: '#8a94a6',
});

export const STORAGE_KEY = 'todoui.v1';
export const STORAGE_VERSION = 1;

export const EVENTS = Object.freeze({
  STATE_CHANGED: 'state:changed',
});
