import { Observable } from 'rxjs/Observable';
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
     * 'exponential' will retry waiting an increasing exponential time between attempts.
     * You can pass the unit amount, which will be multiplied to the exponential factor.
     *
     * 'random' will retry waiting a random time between attempts. You can pass the range of randomness.
     *
     * 'consecutive' will retry waiting a constant time between attempts. You can
     * pass the constant, otherwise the polling interval will be used.
     */
    backoffStrategy?: 'exponential' | 'random' | 'consecutive';
    /**
     * Exponential delay factors (2, 4, 16, 32...) will be multiplied to the unit
     * to get final amount if 'exponential' strategy is used.
     */
    exponentialUnit?: number;
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
/**
 * Run a polling stream for the source$
 * @param request$ Source Observable which will be ran every interval
 * @param userOptions Polling options
 * @param scheduler Scheduler of internal timers. Useful for testing.
 */
export default function polling<T>(request$: Observable<T>, userOptions: IOptions, scheduler?: Scheduler): Observable<T>;
