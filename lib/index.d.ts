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
     * Esponential delay factors (2, 4, 16, 32...) will be multiplied to the unit to get final amount
     */
    esponentialUnit?: number;
}
/**
 * Run a polling stream for the source$
 * @param request$ Source Observable which will be ran every interval
 * @param userOptions Polling options
 * @param scheduler Scheduler of internal timers. Useful for testing.
 */
export default function polling<T>(request$: Observable<T>, userOptions: IOptions, scheduler?: Scheduler): Observable<T>;
