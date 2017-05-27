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
    function isPageActive() {
        return !Boolean(document.hidden);
    }
    var defaultOptions = {
        attempts: 9,
        esponentialUnit: 1000,
    };
    /**
     * Run a polling stream for the source$
     * @param request$ Source Observable which will be ran every interval
     * @param userOptions Polling options
     * @param scheduler Scheduler of internal timers. Useful for testing.
     */
    function polling(request$, userOptions, scheduler) {
        var options = Object.assign({}, defaultOptions, userOptions);
        return Observable_1.Observable.fromEvent(document, 'visibilitychange')
            .startWith(null)
            .switchMap(function () {
            if (isPageActive()) {
                return Observable_1.Observable.interval(options.interval, scheduler)
                    .startWith(null) // Immediately run the first call
                    .switchMap(function () { return request$; })
                    .retryWhen(function (errors) {
                    return errors.scan(function (errorCount, err) {
                        // If already tempted too many times don't retry
                        if (errorCount >= options.attempts)
                            throw err;
                        return errorCount + 1;
                    }, 0).switchMap(function (errorCount) {
                        var esponentialDelay = Math.pow(2, errorCount) * options.esponentialUnit;
                        return Observable_1.Observable.timer(esponentialDelay, null, scheduler);
                    });
                });
            }
            return Observable_1.Observable.empty();
        });
    }
    exports.default = polling;
});
