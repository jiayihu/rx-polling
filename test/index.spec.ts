import Rx from 'rxjs/Rx';
import polling from '../index';
import matchers from 'jest-matchers/build/matchers';

function assertDeepEqual(actual, expected) {
  const result = matchers.toEqual(actual, expected);

  if (!result.pass) throw result.message();
}

describe('Basic behaviour', function() {
  let listener: (event: any) => void;
  const scheduler = new Rx.TestScheduler(assertDeepEqual);

  beforeEach(() => {
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
});
