import { debounce } from '../../src/js/utils/debounce';

describe('debounce', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('calls fn once after the wait, with the last arguments', () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 200);

    debounced('a');
    debounced('ab');
    jest.advanceTimersByTime(199);
    expect(fn).not.toHaveBeenCalled();

    debounced('abc');
    jest.advanceTimersByTime(199);
    expect(fn).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('abc');
  });

  test('separate bursts give separate calls', () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 100);

    debounced(1);
    jest.advanceTimersByTime(100);
    debounced(2);
    jest.advanceTimersByTime(100);

    expect(fn.mock.calls).toEqual([[1], [2]]);
  });

  test('cancel() drops the pending call', () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 100);

    debounced('x');
    expect(debounced.pending).toBe(true);
    debounced.cancel();
    expect(debounced.pending).toBe(false);
    jest.advanceTimersByTime(500);

    expect(fn).not.toHaveBeenCalled();
  });

  test('flush() runs the pending call immediately and only once', () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 100);

    debounced('now');
    debounced.flush();
    expect(fn).toHaveBeenCalledWith('now');
    expect(debounced.pending).toBe(false);

    jest.advanceTimersByTime(500);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test('flush() and cancel() without a pending call do nothing', () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 100);

    debounced.flush();
    debounced.cancel();

    expect(fn).not.toHaveBeenCalled();
  });

  test('throws for a non-function', () => {
    expect(() => debounce(null, 100)).toThrow(TypeError);
  });
});
