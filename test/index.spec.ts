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

describe('Basic behaviour', function() {
  let listener: (event: any) => void;
  let scheduler: Rx.TestScheduler;

  beforeEach(() => {
    Object.defineProperty(document, 'hidden', {
      value: false,
    });

    scheduler = new Rx.TestScheduler(assertDeepEqual);

    document.addEventListener = function(eventType, callback) {
      listener = callback;
    };

    document.removeEventListener = () => void(0);
    document.dispatchEvent = () => void(0);
  });

  test('It should poll the source$ every interval', () => {
    const source$ = Rx.Observable.of('Hello');
    const polling$ = polling(source$, { interval: 20 }, scheduler).take(3);
    const expected = 'x-y-(z|)';

    scheduler.expectObservable(polling$).toBe(expected, { x: 'Hello', y: 'Hello', z: 'Hello' });
    scheduler.flush();
  });

  test('It should retry on error', () => {
    /**
     * This test is a bit tricky. It tests that the source$ errored only once
     * and that the error has been recovered. It MUST although avoid erroring twice
     * because `.retryWhen` doesn't reset its state after recover. This cause the
     * second error to continue the series of increasing delays, like 2 consequent
     * errors would do.
     * @see https://github.com/ReactiveX/rxjs/issues/1413
     */
    const source$ = scheduler.createColdObservable('-1-2-#');
    const expected =                               '-1-2----1-(2|)';
    const polling$ = polling(source$, { interval: 60, esponentialUnit: 10 }, scheduler).take(4);

    scheduler.expectObservable(polling$).toBe(expected, { 1: '1', 2: '2' });
    scheduler.flush();
  });
});

describe('Backoff behaviour', function() {
  let scheduler: Rx.TestScheduler;

  beforeEach(() => {
    Object.defineProperty(document, 'hidden', {
      value: false,
    });

    scheduler = new Rx.TestScheduler(assertDeepEqual);

    document.addEventListener = function(eventType, callback) {
      // Noop
    };

    document.removeEventListener = () => void(0);
    document.dispatchEvent = () => void(0);
  });

  test('It should retry with esponential backoff if the strategy is \'esponential\'', () => {
    const timerMock = jest.fn(() => {
      // Emit immediately
      return Rx.Observable.of(null);
    });
    Rx.Observable.timer = timerMock;

    const polling$ = polling(Rx.Observable.throw('Hello'), { interval: 80, esponentialUnit: 10 }, scheduler);
    polling$.subscribe(() => {
      // Noop
    }, (error) => {
      expect(error).toBe('Hello');
    });

    const callDelays = timerMock.mock.calls.map(call => call[0]); // First argument of calls is the delay amount
    expect(callDelays).toEqual([20, 40, 80, 160, 320, 640, 1280, 2560, 5120]);
  });
});
