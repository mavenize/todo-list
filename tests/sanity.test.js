import { appName } from './fixtures/sanityModule';

describe('test setup', () => {
  test('runs ES module imports through Babel', () => {
    expect(appName).toBe('TodoUI');
  });
});
