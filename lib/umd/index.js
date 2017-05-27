(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "rxjs/Observable", "rxjs/add/observable/empty", "rxjs/add/observable/fromEvent", "rxjs/add/observable/interval", "rxjs/add/observable/timer", "rxjs/add/operator/do", "rxjs/add/operator/retryWhen", "rxjs/add/operator/scan", "rxjs/add/operator/startWith", "rxjs/add/operator/switchMap"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var Observable_1 = require("rxjs/Observable");
    require("rxjs/add/observable/empty");
    require("rxjs/add/observable/fromEvent");
    require("rxjs/add/observable/interval");
    require("rxjs/add/observable/timer");
    require("rxjs/add/operator/do");
    require("rxjs/add/operator/retryWhen");
    require("rxjs/add/operator/scan");
    require("rxjs/add/operator/startWith");
    require("rxjs/add/operator/switchMap");
    var defaultOptions = {
        attempts: 9,
        backoffStrategy: 'esponential',
        esponentialUnit: 1000,
        randomRange: [1000, 10000],
    };
    /**
     * Run a polling stream for the source$
     * @param request$ Source Observable which will be ran every interval
     * @param userOptions Polling options
     * @param scheduler Scheduler of internal timers. Useful for testing.
     */
    function polling(request$, userOptions, scheduler) {
        var options = Object.assign({}, defaultOptions, userOptions);
        /**
         * Currently any new error, after recover, continues the series of  increasing
         * delays, like 2 consequent errors would do. This is a bug of RxJS. To workaround
         * the issue we use the difference with the counter value at the last recover.
         * @see https://github.com/ReactiveX/rxjs/issues/1413
         */
        var allErrorsCount = 0;
        var lastRecoverCount = 0;
        return Observable_1.Observable.fromEvent(document, 'visibilitychange')
            .startWith(null)
            .switchMap(function () {
            if (isPageActive()) {
                return Observable_1.Observable.interval(options.interval, scheduler)
                    .startWith(null) // Immediately run the first call
                    .switchMap(function () { return request$; })
                    .retryWhen(function (errors$) {
                    return errors$.scan(function (errorCount, err) {
                        // If already tempted too many times don't retry
                        if (errorCount >= options.attempts)
                            throw err;
                        return errorCount + 1;
                    }, 0).switchMap(function (errorCount) {
                        allErrorsCount = errorCount;
                        var consecutiveErrorsCount = allErrorsCount - lastRecoverCount;
                        var delay = getStrategyDelay(consecutiveErrorsCount, options);
                        return Observable_1.Observable.timer(delay, null, scheduler);
                    });
                });
            }
            return Observable_1.Observable.empty();
        }).do(function () {
            // Update the counter after every successful polling
            lastRecoverCount = allErrorsCount;
        });
    }
    exports.default = polling;
    function isPageActive() {
        return !Boolean(document.hidden);
    }
    function getStrategyDelay(consecutiveErrorsCount, options) {
        switch (options.backoffStrategy) {
            case 'esponential':
                return Math.pow(2, consecutiveErrorsCount) * options.esponentialUnit;
            case 'random':
                var _a = options.randomRange, min = _a[0], max = _a[1];
                var range = max - min;
                return Math.floor(Math.random() * range) + min;
            case 'consecutive':
                return options.constantTime || options.interval;
            default:
                console.error(options.backoffStrategy + " is not a backoff strategy supported by rx-polling");
                // Return a value anyway to avoid throwing
                return options.constantTime || options.interval;
        }
    }
});
