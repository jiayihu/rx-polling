(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "rxjs/Observable", "rxjs/add/observable/empty", "rxjs/add/observable/fromEvent", "rxjs/add/observable/interval", "rxjs/add/observable/timer", "rxjs/add/operator/retryWhen", "rxjs/add/operator/scan", "rxjs/add/operator/startWith", "rxjs/add/operator/switchMap"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var Observable_1 = require("rxjs/Observable");
    require("rxjs/add/observable/empty");
    require("rxjs/add/observable/fromEvent");
    require("rxjs/add/observable/interval");
    require("rxjs/add/observable/timer");
    require("rxjs/add/operator/retryWhen");
    require("rxjs/add/operator/scan");
    require("rxjs/add/operator/startWith");
    require("rxjs/add/operator/switchMap");
    var defaultOptions = {
        retryTimes: 9,
    };
    /**
     * Run a polling stream for the source$
     * @param source$ Observable to fetch the data
     * @param interval Period of the polling
     * @param retryTimes Number of times to retry. The last retry attempt will wait for 2^retryTimes seconds.
     */
    function polling(source$, userOptions) {
        if (userOptions === void 0) { userOptions = {}; }
        var options = Object.assign({}, defaultOptions, userOptions);
        return Observable_1.Observable.fromEvent(document, 'visibilitychange')
            .startWith(!Boolean(document.hidden))
            .switchMap(function (isPageActive) {
            if (isPageActive) {
                return Observable_1.Observable.interval(options.interval)
                    .startWith(null)
                    .switchMap(function () { return source$; })
                    .retryWhen(function (errors) {
                    return errors.scan(function (errorCount, err) {
                        // If already tempted too many times don't retry
                        if (errorCount >= options.retryTimes)
                            throw err;
                        return errorCount + 1;
                    }, 0).switchMap(function (errorCount) {
                        var esponentialDelay = Math.pow(2, errorCount) * 1000;
                        return Observable_1.Observable.timer(esponentialDelay);
                    });
                });
            }
            return Observable_1.Observable.empty();
        });
    }
    exports.default = polling;
});
