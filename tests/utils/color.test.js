import {
  contrastRatio,
  parseHexColor,
  readableTextColor,
  relativeLuminance,
} from '../../src/js/utils/color';
import { DEFAULT_PROJECT, PROJECT_COLORS } from '../../src/js/utils/constants';

describe('parseHexColor', () => {
  test('parses 6- and 3-digit hex, with or without #', () => {
    expect(parseHexColor('#4a7cf6')).toEqual([74, 124, 246]);
    expect(parseHexColor('4A7CF6')).toEqual([74, 124, 246]);
    expect(parseHexColor('#fc0')).toEqual([255, 204, 0]);
  });

  test.each([null, undefined, '', 'blue', '#12345', '#gggggg', 'rgb(0,0,0)'])(
    'returns null for %p',
    (value) => {
      expect(parseHexColor(value)).toBeNull();
    },
  );
});

describe('relativeLuminance / contrastRatio', () => {
  test('black and white are the extremes', () => {
    expect(relativeLuminance([0, 0, 0])).toBe(0);
    expect(relativeLuminance([255, 255, 255])).toBeCloseTo(1);
    expect(contrastRatio('#000', '#fff')).toBeCloseTo(21);
  });

  test('is symmetric and 1 for equal colors', () => {
    expect(contrastRatio('#4a7cf6', '#fff')).toBeCloseTo(contrastRatio('#fff', '#4a7cf6'));
    expect(contrastRatio('#4a7cf6', '#4a7cf6')).toBe(1);
  });

  test('returns null for unparseable colors', () => {
    expect(contrastRatio('nope', '#fff')).toBeNull();
  });
});

describe('readableTextColor', () => {
  test('dark text on light colors, light text on dark colors', () => {
    expect(readableTextColor('#f5c142')).toBe('#2a303b'); // yellow
    expect(readableTextColor('#ffffff')).toBe('#2a303b');
    expect(readableTextColor('#6c4ee0')).toBe('#ffffff'); // purple
    expect(readableTextColor('#000000')).toBe('#ffffff');
  });

  test('custom light/dark colors', () => {
    expect(readableTextColor('#ffffff', { light: '#eee', dark: '#111' })).toBe('#111');
  });

  test('falls back to the light color for unparseable input', () => {
    expect(readableTextColor('not-a-color')).toBe('#ffffff');
  });

  test('every palette color gets the better of the two choices', () => {
    for (const color of [...PROJECT_COLORS, DEFAULT_PROJECT.color]) {
      const picked = readableTextColor(color);
      const other = picked === '#ffffff' ? '#2a303b' : '#ffffff';
      expect(contrastRatio(color, picked)).toBeGreaterThanOrEqual(contrastRatio(color, other));
    }
  });
});
