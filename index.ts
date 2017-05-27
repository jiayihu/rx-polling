import { Observable } from 'rxjs/Observable';
import { Observer } from 'rxjs/Observer';
import { Scheduler } from 'rxjs/Scheduler';

import 'rxjs/add/observable/empty';
import 'rxjs/add/observable/fromEvent';
import 'rxjs/add/observable/interval';
import 'rxjs/add/observable/timer';

import 'rxjs/add/operator/do';
import 'rxjs/add/operator/retryWhen';
import 'rxjs/add/operator/scan';
import 'rxjs/add/operator/startWith';
import 'rxjs/add/operator/switchMap';

export interface IOptions {
  /**
   * Period of the interval to run the source$
   */
  interval: number;

  /**
   * How many attempts on error, before throwing definitely to polling subscriber
   */
  attempts?: number;

  /**
   * Strategy taken on source$ errors, with attempts to recover.
   *
   * 'esponential' will retry waiting an increasing esponential time between attempts.
   * You can pass the unit amount, which will be multiplied to the esponential factor.
   *
   * 'random' will retry waiting a random time between attempts. You can pass the range of randomness.
   *
   * 'consecutive' will retry waiting a constant time between attempts. You can
   * pass the constant, otherwise the polling interval will be used.
   */
  backoffStrategy?: 'esponential' | 'random' | 'consecutive';

  /**
   * Esponential delay factors (2, 4, 16, 32...) will be multiplied to the unit
   * to get final amount if 'esponential' strategy is used.
   */
  esponentialUnit?: number;

  /**
   * Range of milli-seconds to pick a random delay between error retries if 'random'
   * strategy is used.
   */
  randomRange?: [number, number];

  /**
   * Constant time to delay error retries if 'consecutive' strategy is used
   */
  constantTime?: number;
}

const defaultOptions: Partial<IOptions> = {
  attempts: 9,
  backoffStrategy: 'esponential',
  esponentialUnit: 1000, // 1 second
  randomRange: [1000, 10000],
};

/**
 * Run a polling stream for the source$
 * @param request$ Source Observable which will be ran every interval
 * @param userOptions Polling options
 * @param scheduler Scheduler of internal timers. Useful for testing.
 */
export default function polling<T>( request$: Observable<T>, userOptions: IOptions, scheduler?: Scheduler ): Observable<T> {
  const options = Object.assign({}, defaultOptions, userOptions);

  /**
   * Currently any new error, after recover, continues the series of  increasing
   * delays, like 2 consequent errors would do. This is a bug of RxJS. To workaround
   * the issue we use the difference with the counter value at the last recover.
   * @see https://github.com/ReactiveX/rxjs/issues/1413
   */
  let allErrorsCount = 0;
  let lastRecoverCount = 0;

  return Observable.fromEvent(document, 'visibilitychange')
    .startWith(null)
    .switchMap(() => {
      if (isPageActive()) {
        return Observable.interval(options.interval, scheduler)
          .startWith(null) // Immediately run the first call
          .switchMap(() => request$)
          .retryWhen(errors$ => {
            return errors$.scan((errorCount, err) => {
              // If already tempted too many times don't retry
              if (errorCount >= options.attempts) throw err;

              return errorCount + 1;
            }, 0).switchMap(errorCount => {
              allErrorsCount = errorCount;
              const consecutiveErrorsCount = allErrorsCount - lastRecoverCount;
              const delay = getStrategyDelay(consecutiveErrorsCount, options);

              return Observable.timer(delay, null, scheduler);
            });
          });
      }

      return Observable.empty();
    }).do(() => {
      // Update the counter after every successful polling
      lastRecoverCount = allErrorsCount;
    });
}

function isPageActive(): boolean {
  return !Boolean(document.hidden);
}

function getStrategyDelay(consecutiveErrorsCount: number, options: IOptions): number {
  switch (options.backoffStrategy) {
    case 'esponential':
      return Math.pow(2, consecutiveErrorsCount) * options.esponentialUnit;

    case 'random':
      const [min, max] = options.randomRange;
      const range = max - min;
      return Math.floor(Math.random() * range) + min;

    case 'consecutive':
      return options.constantTime || options.interval;

    default:
      console.error(`${options.backoffStrategy} is not a backoff strategy supported by rx-polling`);
      // Return a value anyway to avoid throwing
      return options.constantTime || options.interval;
  }
}
