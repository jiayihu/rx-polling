import { Observable } from 'rxjs/Observable';
import { Observer } from 'rxjs/Observer';
import 'rxjs/add/observable/empty';
import 'rxjs/add/observable/fromEvent';
import 'rxjs/add/observable/interval';
import 'rxjs/add/observable/timer';

import 'rxjs/add/operator/retryWhen';
import 'rxjs/add/operator/scan';
import 'rxjs/add/operator/startWith';
import 'rxjs/add/operator/switchMap';

export interface IOptions {
  interval: number;
  attempts?: number;
}

const defaultOptions = {
  attempts: 9,
};

/**
 * Run a polling stream for the source$
 * @param source$ Observable to fetch the data
 * @param interval Period of the polling
 * @param attempts Number of times to retry. The last retry attempt will wait for 2^attempts seconds.
 */
export default function polling<T>(request$: Observable<T>, userOptions: IOptions = {} as any): Observable<T> {
  const options = Object.assign({}, defaultOptions, userOptions);

  return Observable.fromEvent(document, 'visibilitychange')
    .startWith(!Boolean(document.hidden))
    .switchMap(isPageActive => {
      if (isPageActive) {
        return Observable.interval(options.interval)
          .startWith(null) // Immediately run the first call
          .switchMap(() => request$)
          .retryWhen(errors => {
            return errors.scan((errorCount, err) => {
              // If already tempted too many times don't retry
              if (errorCount >= options.attempts) throw err;

              return errorCount + 1;
            }, 0).switchMap(errorCount => {
              const esponentialDelay = Math.pow(2, errorCount) * 1000;

              return Observable.timer(esponentialDelay);
            });
          });
      }

      return Observable.empty();
    });
}
