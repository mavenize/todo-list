import { EventBus } from '../../src/js/core/EventBus';

describe('EventBus', () => {
  test('emit() calls subscribed handlers with the payload', () => {
    const bus = new EventBus();
    const handler = jest.fn();
    bus.on('state:changed', handler);
    bus.emit('state:changed', { reason: 'test' });
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({ reason: 'test' });
  });

  test('handlers run in subscription order', () => {
    const bus = new EventBus();
    const calls = [];
    bus.on('e', () => calls.push('a'));
    bus.on('e', () => calls.push('b'));
    bus.emit('e');
    expect(calls).toEqual(['a', 'b']);
  });

  test('only handlers of the emitted event are called', () => {
    const bus = new EventBus();
    const a = jest.fn();
    const b = jest.fn();
    bus.on('a', a);
    bus.on('b', b);
    bus.emit('a');
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).not.toHaveBeenCalled();
  });

  test('emit() with no subscribers does nothing', () => {
    const bus = new EventBus();
    expect(() => bus.emit('nobody')).not.toThrow();
  });

  test('on() rejects a handler that is not a function', () => {
    const bus = new EventBus();
    expect(() => bus.on('e', 'nope')).toThrow(TypeError);
  });

  test('subscribing the same handler twice calls it once', () => {
    const bus = new EventBus();
    const handler = jest.fn();
    bus.on('e', handler);
    bus.on('e', handler);
    bus.emit('e');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  describe('unsubscribing', () => {
    test('on() returns a function that unsubscribes', () => {
      const bus = new EventBus();
      const handler = jest.fn();
      const unsubscribe = bus.on('e', handler);
      unsubscribe();
      bus.emit('e');
      expect(handler).not.toHaveBeenCalled();
    });

    test('off() removes only the given handler', () => {
      const bus = new EventBus();
      const a = jest.fn();
      const b = jest.fn();
      bus.on('e', a);
      bus.on('e', b);
      bus.off('e', a);
      bus.emit('e');
      expect(a).not.toHaveBeenCalled();
      expect(b).toHaveBeenCalledTimes(1);
    });

    test('off() ignores unknown events and handlers', () => {
      const bus = new EventBus();
      bus.on('e', jest.fn());
      expect(() => bus.off('unknown', jest.fn())).not.toThrow();
      expect(() => bus.off('e', jest.fn())).not.toThrow();
    });

    test('a handler can be subscribed again after unsubscribing', () => {
      const bus = new EventBus();
      const handler = jest.fn();
      bus.on('e', handler)();
      bus.on('e', handler);
      bus.emit('e');
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('changes during emit', () => {
    test('a handler removed during emit still runs this time, not the next', () => {
      const bus = new EventBus();
      const second = jest.fn();
      bus.on('e', () => bus.off('e', second));
      bus.on('e', second);
      bus.emit('e');
      bus.emit('e');
      expect(second).toHaveBeenCalledTimes(1);
    });

    test('a handler added during emit runs from the next emit', () => {
      const bus = new EventBus();
      const late = jest.fn();
      const unsubscribe = bus.on('e', () => {
        bus.on('e', late);
        unsubscribe();
      });
      bus.emit('e');
      expect(late).not.toHaveBeenCalled();
      bus.emit('e');
      expect(late).toHaveBeenCalledTimes(1);
    });
  });

  describe('error handling', () => {
    test('a throwing handler does not stop the others', () => {
      const onError = jest.fn();
      const bus = new EventBus({ onError });
      const after = jest.fn();
      const error = new Error('boom');
      bus.on('e', () => {
        throw error;
      });
      bus.on('e', after);

      expect(() => bus.emit('e', 42)).not.toThrow();
      expect(after).toHaveBeenCalledWith(42);
      expect(onError).toHaveBeenCalledWith(error, 'e', 42);
    });

    test('errors go to console.error by default', () => {
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
      try {
        const bus = new EventBus();
        bus.on('e', () => {
          throw new Error('boom');
        });
        bus.emit('e');
        expect(spy).toHaveBeenCalledTimes(1);
        expect(spy.mock.calls[0][0]).toMatch(/"e" handler threw/);
      } finally {
        spy.mockRestore();
      }
    });
  });
});
