import Rx from 'rxjs/Rx';
import polling from '../index';
import matchers from 'jest-matchers/build/matchers';
import { diffTestMessages } from './utils';

/**
 * Simple Matcher which uses Jest nice diffs messages. Original `.toEqual` is not
 * suitable because we'll pass it to TestScheduler and it must throw on error.
 */
function assertDeepEqual(actual, expected) {
  const result = matchers.toEqual(actual, expected);

  if (!result.pass) {
    const diff = diffTestMessages(result.actual, result.expected);
    throw diff + '\n' + result.message();
  }
}

function setPageActive(isActive: boolean) {
  Object.defineProperty(document, 'hidden', {
    value: !isActive,
    configurable: true,
  });
}

describe('Basic behaviour', function() {
  let scheduler: Rx.TestScheduler;

  beforeEach(() => {
    Object.defineProperty(document, 'hidden', {
      value: false,
      configurable: true,
    });

    scheduler = new Rx.TestScheduler(assertDeepEqual);

    document.addEventListener = function(eventType, callback) {
      // Noop
    };

    document.removeEventListener = () => void(0);
    document.dispatchEvent = () => void(0);
  });

  test('It should poll the source$ every interval', () => {
    const source$ = Rx.Observable.of(1);
    const polling$ = polling(source$, { interval: 20 }, scheduler).take(3);
    const expected = '1-1-(1|)';

    scheduler.expectObservable(polling$).toBe(expected, { 1: 1 });
    scheduler.flush();
  });

  test('It should not poll if the tab is inactive', () => {
    setPageActive(false);

    const source$ = Rx.Observable.of('Hello');
    const polling$ = polling(source$, { interval: 20 }, scheduler).take(3);
    const expected = '----';

    scheduler.expectObservable(polling$).toBe(expected);
    scheduler.flush();
  });

  test('It should restart polling if the tab changes to active', () => {
    setPageActive(false);
    document.addEventListener = function(eventType, listener) {
      // At frame 40 simulate 'visibilitychange' Event
      Rx.Observable.timer(40, null, scheduler)
        .map(() => 'event')
        .subscribe(() => {
          setPageActive(true);
          listener();
        });
    };

    const source$ = Rx.Observable.of(1);
    const polling$ = polling(source$, { interval: 20 }, scheduler).take(1);
    const expected = '----(1|)';

    scheduler.expectObservable(polling$).toBe(expected, { 1: 1 });
    scheduler.flush();
  });

  test('It should retry on error', () => {
    const source$ = scheduler.createColdObservable('-1-2-#');
    const expected =                               '-1-2----1-(2|)';
    const polling$ = polling(source$, { interval: 60, exponentialUnit: 10 }, scheduler).take(4);

    scheduler.expectObservable(polling$).toBe(expected, { 1: '1', 2: '2' });
    scheduler.flush();
  });

  test('It should reset delays on not consecutive errors', () => {
    /**
     * `.retryWhen` doesn't reset its state after a recover. This cause the
     * next error to continue the series of increasing delays, like 2 consecutive
     * errors would do.
     * @see https://github.com/ReactiveX/rxjs/issues/1413
     */
    const source$ = scheduler.createColdObservable('-1-2-#');
    const expected =                               '-1-2----1-2----(1|)';
    const polling$ = polling(source$, { interval: 60, exponentialUnit: 10 }, scheduler).take(5);

    scheduler.expectObservable(polling$).toBe(expected, { 1: '1', 2: '2' });
    scheduler.flush();
  });
});

describe('Backoff behaviour', function() {
  let scheduler: Rx.TestScheduler;
  let timerMock: jest.Mock<any>;

  beforeEach(() => {
    Object.defineProperty(document, 'hidden', {
      value: false,
    });

    timerMock = jest.fn(() => {
      // Emit immediately
      return Rx.Observable.of(null);
    });
    Rx.Observable.timer = timerMock;

    scheduler = new Rx.TestScheduler(assertDeepEqual);

    document.addEventListener = function(eventType, callback) {
      // Noop
    };

    document.removeEventListener = () => void(0);
    document.dispatchEvent = () => void(0);
  });

  test('It should throw after all failed attempts', () => {
    const polling$ = polling(Rx.Observable.throw('Hello'), {interval: 10, attempts: 9 }, scheduler);
    polling$.subscribe(() => {
      // Noop
    }, (error) => {
      expect(error).toBe('Hello');
    });

    expect(timerMock).toHaveBeenCalledTimes(9);
  });

  test('It should retry with exponential backoff if the strategy is \'exponential\'', () => {
    const polling$ = polling(Rx.Observable.throw('Hello'), {
      interval: 10,
      backoffStrategy: 'exponential',
      exponentialUnit: 10,
    }, scheduler);
    polling$.subscribe(() => {
      // Noop
    }, () => {
      // Noop
    });

    const callDelays = timerMock.mock.calls.map(call => call[0]); // First argument of calls is the delay amount
    expect(callDelays).toEqual([20, 40, 80, 160, 320, 640, 1280, 2560, 5120]);
  });

  test('It should retry with random backoff if the strategy is \'random\'', () => {
    const polling$ = polling(Rx.Observable.throw('Hello'), {
      interval: 10,
      backoffStrategy: 'random',
      randomRange: [1000, 10000],
    }, scheduler);
    polling$.subscribe(() => {
      // Noop
    }, () => {
      // Noop
    });

    const callDelays = timerMock.mock.calls.map(call => call[0]); // First argument of calls is the delay amount
    callDelays.forEach(delay => {
      expect(delay).toBeLessThanOrEqual(10000);
      expect(delay).toBeGreaterThanOrEqual(1000);
    });
  });

  test('It should retry with constant backoff if the strategy is \'consecutive\'', () => {
    const polling$ = polling(Rx.Observable.throw('Hello'), {
      interval: 10,
      backoffStrategy: 'consecutive',
      constantTime: 1000,
    }, scheduler);
    polling$.subscribe(() => {
      // Noop
    }, () => {
      // Noop
    });

    const callDelays = timerMock.mock.calls.map(call => call[0]); // First argument of calls is the delay amount
    callDelays.forEach(delay => expect(delay).toBe(1000));
  });
});
