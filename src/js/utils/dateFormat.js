// Date helpers built on date-fns. Due dates are stored as 'yyyy-MM-dd' strings or null.
// Every function takes an optional `now` so behaviour is testable with a fixed date.
import {
  addDays,
  format,
  isBefore,
  isSameDay,
  isSameYear,
  isValid,
  parseISO,
  startOfDay,
} from 'date-fns';

export const DATE_FORMAT = 'yyyy-MM-dd';

/** 'yyyy-MM-dd' → Date (local midnight), or null when empty/invalid. */
export function parseDate(value) {
  if (typeof value !== 'string' || value.trim() === '') return null;
  const date = parseISO(value);
  return isValid(date) ? date : null;
}

/** Date → 'yyyy-MM-dd', or null when invalid. */
export function toDateString(date) {
  return date instanceof Date && isValid(date) ? format(date, DATE_FORMAT) : null;
}

/** Normalizes user input to a stored due date: 'yyyy-MM-dd' or null. */
export function normalizeDueDate(value) {
  return toDateString(parseDate(value));
}

/**
 * Human label for a due date, as in the mockup:
 * 'Today', 'Tomorrow', 'Yesterday', 'Tue, 1 May', or 'Tue, 1 May 2027' for other years.
 */
export function formatDueLabel(dueDate, now = new Date()) {
  const date = parseDate(dueDate);
  if (!date) return '';
  if (isSameDay(date, now)) return 'Today';
  if (isSameDay(date, addDays(now, 1))) return 'Tomorrow';
  if (isSameDay(date, addDays(now, -1))) return 'Yesterday';
  return format(date, isSameYear(date, now) ? 'EEE, d MMM' : 'EEE, d MMM yyyy');
}

export function isDueToday(dueDate, now = new Date()) {
  const date = parseDate(dueDate);
  return date !== null && isSameDay(date, now);
}

/** True when the due date is before today (a todo due today is not overdue). */
export function isOverdue(dueDate, now = new Date()) {
  const date = parseDate(dueDate);
  return date !== null && isBefore(date, startOfDay(now));
}
