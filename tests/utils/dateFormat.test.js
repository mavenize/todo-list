import {
  formatDueLabel,
  isDueToday,
  isOverdue,
  normalizeDueDate,
  parseDate,
  toDateString,
} from '../../src/js/utils/dateFormat';

// Fixed "now": Wednesday 11 Nov 2026, mid-afternoon local time.
const NOW = new Date(2026, 10, 11, 15, 30);

describe('parseDate', () => {
  test('parses a yyyy-MM-dd string to local midnight', () => {
    const date = parseDate('2026-05-01');
    expect(date).toEqual(new Date(2026, 4, 1));
  });

  test.each([null, undefined, '', '   ', 'not-a-date', '2026-13-45', 42])(
    'returns null for %p',
    (value) => {
      expect(parseDate(value)).toBeNull();
    },
  );
});

describe('toDateString / normalizeDueDate', () => {
  test('formats a Date as yyyy-MM-dd', () => {
    expect(toDateString(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  test('returns null for invalid dates and non-dates', () => {
    expect(toDateString(new Date('nope'))).toBeNull();
    expect(toDateString('2026-01-05')).toBeNull();
  });

  test('normalizeDueDate keeps valid input and nulls the rest', () => {
    expect(normalizeDueDate('2026-01-05')).toBe('2026-01-05');
    expect(normalizeDueDate('')).toBeNull();
    expect(normalizeDueDate('garbage')).toBeNull();
  });
});

describe('formatDueLabel', () => {
  test.each([
    ['2026-11-11', 'Today'],
    ['2026-11-12', 'Tomorrow'],
    ['2026-11-10', 'Yesterday'],
    ['2026-05-01', 'Fri, 1 May'],
    ['2026-12-24', 'Thu, 24 Dec'],
    ['2027-03-08', 'Mon, 8 Mar 2027'],
    ['2025-02-27', 'Thu, 27 Feb 2025'],
  ])('%s → %s', (dueDate, expected) => {
    expect(formatDueLabel(dueDate, NOW)).toBe(expected);
  });

  test('returns an empty string when there is no due date', () => {
    expect(formatDueLabel(null, NOW)).toBe('');
    expect(formatDueLabel('', NOW)).toBe('');
  });

  test('handles month and year boundaries for Tomorrow', () => {
    expect(formatDueLabel('2027-01-01', new Date(2026, 11, 31, 23, 59))).toBe('Tomorrow');
  });
});

describe('isDueToday', () => {
  test('is true only for today', () => {
    expect(isDueToday('2026-11-11', NOW)).toBe(true);
    expect(isDueToday('2026-11-12', NOW)).toBe(false);
    expect(isDueToday(null, NOW)).toBe(false);
  });
});

describe('isOverdue', () => {
  test('is true for dates before today', () => {
    expect(isOverdue('2026-11-10', NOW)).toBe(true);
    expect(isOverdue('2025-01-01', NOW)).toBe(true);
  });

  test('is false for today, future dates and missing dates', () => {
    expect(isOverdue('2026-11-11', NOW)).toBe(false);
    expect(isOverdue('2026-11-12', NOW)).toBe(false);
    expect(isOverdue(null, NOW)).toBe(false);
  });
});
