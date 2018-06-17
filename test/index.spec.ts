import { Observable, of, timer, throwError, Observer } from 'rxjs';
import { take, map } from 'rxjs/operators';
import { TestScheduler } from 'rxjs/testing';
import * as RxMock from 'rxjs';
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
    configurable: true
  });
}

describe('Basic behaviour', function() {
  let scheduler: TestScheduler;

  beforeEach(() => {
    Object.defineProperty(document, 'hidden', {
      value: false,
      configurable: true
    });

    scheduler = new TestScheduler(assertDeepEqual);

    document.addEventListener = function(eventType, callback) {
      // Noop
    };

    document.removeEventListener = () => void 0;
    document.dispatchEvent = () => void 0;
  });

  test('It should poll the source$ every interval', () => {
    scheduler.run(helpers => {
      const source$ = of(1);
      const polling$ = polling(source$, { interval: 2 }).pipe(take(3));
      const expected = '1-1-(1|)';

      helpers.expectObservable(polling$).toBe(expected, { 1: 1 });
    });
  });

  test('It should not poll if the tab is inactive', () => {
    setPageActive(false);

    scheduler.run(helpers => {
      const source$ = of('Hello');
      const polling$ = polling(source$, { interval: 2 }).pipe(take(3));
      const expected = '----';

      helpers.expectObservable(polling$).toBe(expected);
    });
  });

  test('It should restart polling if the tab changes to active', () => {
    setPageActive(false);

    scheduler.run(helpers => {
      document.addEventListener = function(eventType, listener) {
        // At frame 4 simulate 'visibilitychange' Event
        timer(4, null)
          .pipe(map(() => 'event'))
          .subscribe(() => {
            setPageActive(true);
            listener();
          });
      };

      const source$ = of(1);
      const polling$ = polling(source$, { interval: 20 }).pipe(take(1));
      const expected = '----(1|)';

      helpers.expectObservable(polling$).toBe(expected, { 1: 1 });
    });
  });

  test('It should stop polling on unsubscription', done => {
    const spy = jest.fn();
    const source$ = Observable.create(observer => {
      spy();
      observer.next(1);
    });
    const polling$ = polling(source$, { interval: 5 });

    const subscription = polling$.subscribe(() => {
      // Noop
    });

    setTimeout(() => {
      subscription.unsubscribe();

      // Jasmine needs try/catch for failing tests with done
      // @see https://github.com/facebook/jest/issues/1873#issuecomment-258857165
      try {
        expect(spy).toHaveBeenCalledTimes(3);
        done();
      } catch (e) {
        done.fail(e);
      }
    }, 14);
  });

  test('It should retry on error', () => {
    scheduler.run(helpers => {
      const source$ = of(1);
      const polling$ = polling(source$, { interval: 2 }).pipe(take(3));
      const expected = '1-1-(1|)';

      helpers.expectObservable(polling$).toBe(expected, { 1: 1 });
    });
  });

  test('It should reset delays on not consecutive errors', () => {
    scheduler.run(helpers => {
      /**
       * `.retryWhen` doesn't reset its state after a recover. This cause the
       * next error to continue the series of increasing delays, like 2 consecutive
       * errors would do.
       * @see https://github.com/ReactiveX/rxjs/issues/1413
       */
      const source$ = helpers.cold('-1-2-#');
      const expected = '-1-2-----1-2-----(1|)';
      const polling$ = polling(source$, { interval: 6, exponentialUnit: 3 }).pipe(take(5));

      helpers.expectObservable(polling$).toBe(expected, { 1: '1', 2: '2' });
    });
  });
});

describe('Backoff behaviour', function() {
  let scheduler: TestScheduler;
  let timerMock: jest.Mock<any>;

  beforeEach(() => {
    Object.defineProperty(document, 'hidden', {
      value: false
    });

    timerMock = jest.fn(() => {
      // Emit immediately
      return of(null);
    });
    Object.defineProperty(RxMock, 'timer', {
      value: timerMock
    });

    scheduler = new TestScheduler(assertDeepEqual);

    document.addEventListener = function(eventType, callback) {
      // Noop
    };

    document.removeEventListener = () => void 0;
    document.dispatchEvent = () => void 0;
  });

  test('It should throw after all failed attempts', () => {
    const polling$ = polling(throwError('Hello'), { interval: 10, attempts: 9 });
    polling$.subscribe(
      () => {
        // Noop
      },
      error => {
        expect(error).toBe('Hello');
      }
    );

    expect(timerMock).toHaveBeenCalledTimes(9);
  });

  test("It should retry with exponential backoff if the strategy is 'exponential'", () => {
    const polling$ = polling(throwError('Hello'), {
      interval: 10,
      backoffStrategy: 'exponential',
      exponentialUnit: 10
    });
    polling$.subscribe(
      () => {
        // Noop
      },
      () => {
        // Noop
      }
    );

    // First argument of calls is the delay amount
    const callDelays = timerMock.mock.calls.map(call => call[0]);
    expect(callDelays).toEqual([10, 20, 40, 80, 160, 320, 640, 1280, 2560]);
  });

  test("It should retry with random backoff if the strategy is 'random'", () => {
    const polling$ = polling(throwError('Hello'), {
      interval: 10,
      backoffStrategy: 'random',
      randomRange: [1000, 10000]
    });
    polling$.subscribe(
      () => {
        // Noop
      },
      () => {
        // Noop
      }
    );

    // First argument of calls is the delay amount
    const callDelays = timerMock.mock.calls.map(call => call[0]);
    callDelays.forEach(delay => {
      expect(delay).toBeLessThanOrEqual(10000);
      expect(delay).toBeGreaterThanOrEqual(1000);
    });
  });

  test("It should retry with constant backoff if the strategy is 'consecutive'", () => {
    const polling$ = polling(throwError('Hello'), {
      interval: 10,
      backoffStrategy: 'consecutive',
      constantTime: 1000
    });
    polling$.subscribe(
      () => {
        // Noop
      },
      () => {
        // Noop
      }
    );

    // First argument of calls is the delay amount
    const callDelays = timerMock.mock.calls.map(call => call[0]);
    callDelays.forEach(delay => expect(delay).toBe(1000));
  });
});
