import { Observable } from 'rxjs/Observable';
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
    retryTimes?: number;
}
/**
 * Run a polling stream for the source$
 * @param source$ Observable to fetch the data
 * @param interval Period of the polling
 * @param retryTimes Number of times to retry. The last retry attempt will wait for 2^retryTimes seconds.
 */
export default function polling<T>(source$: Observable<T>, userOptions?: IOptions): Observable<T>;
