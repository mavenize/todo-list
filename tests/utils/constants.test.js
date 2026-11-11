import {
  DEFAULT_PRIORITY,
  PRIORITIES,
  PRIORITY_LIST,
  SMART_LISTS,
  SMART_LIST_ITEMS,
} from '../../src/js/utils/constants';

describe('constants', () => {
  test('are frozen so they cannot be mutated at runtime', () => {
    expect(Object.isFrozen(PRIORITIES)).toBe(true);
    expect(Object.isFrozen(SMART_LISTS)).toBe(true);
  });

  test('default priority is a valid priority', () => {
    expect(PRIORITY_LIST).toContain(DEFAULT_PRIORITY);
  });

  test('every smart list has a sidebar entry', () => {
    const ids = SMART_LIST_ITEMS.map((item) => item.id);
    expect(ids.sort()).toEqual(Object.values(SMART_LISTS).sort());
  });
});
