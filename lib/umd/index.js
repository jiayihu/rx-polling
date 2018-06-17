(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "rxjs", "rxjs/operators"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var rxjs_1 = require("rxjs");
    var operators_1 = require("rxjs/operators");
    var defaultOptions = {
        attempts: 9,
        backoffStrategy: 'exponential',
        exponentialUnit: 1000,
        randomRange: [1000, 10000]
    };
    /**
     * Run a polling stream for the source$
     * @param request$ Source Observable which will be ran every interval
     * @param userOptions Polling options
     */
    function polling(request$, userOptions) {
        var options = Object.assign({}, defaultOptions, userOptions);
        /**
         * Currently any new error, after recover, continues the series of  increasing
         * delays, like 2 consequent errors would do. This is a bug of RxJS. To workaround
         * the issue we use the difference with the counter value at the last recover.
         * @see https://github.com/ReactiveX/rxjs/issues/1413
         */
        var allErrorsCount = 0;
        var lastRecoverCount = 0;
        return rxjs_1.fromEvent(document, 'visibilitychange').pipe(operators_1.startWith(null), operators_1.switchMap(function () {
            if (isPageActive()) {
                return rxjs_1.interval(options.interval).pipe(operators_1.startWith(null), // Immediately run the first call
                operators_1.switchMap(function () { return request$; }), operators_1.retryWhen(function (errors$) {
                    return errors$.pipe(operators_1.scan(function (_a, err) {
                        var errorCount = _a.errorCount, error = _a.error;
                        return ({ errorCount: errorCount + 1, error: err });
                    }, {
                        errorCount: 0,
                        error: null
                    }), operators_1.switchMap(function (_a) {
                        var errorCount = _a.errorCount, error = _a.error;
                        allErrorsCount = errorCount;
                        var consecutiveErrorsCount = allErrorsCount - lastRecoverCount;
                        // If already tempted too many times don't retry
                        if (consecutiveErrorsCount > options.attempts)
                            throw error;
                        var delay = getStrategyDelay(consecutiveErrorsCount, options);
                        return rxjs_1.timer(delay, null);
                    }));
                }));
            }
            return rxjs_1.empty();
        }), operators_1.tap(function () {
            // Update the counter after every successful polling
            lastRecoverCount = allErrorsCount;
        }));
    }
    exports.default = polling;
    function isPageActive() {
        return !Boolean(document.hidden);
    }
    function getStrategyDelay(consecutiveErrorsCount, options) {
        switch (options.backoffStrategy) {
            case 'exponential':
                return Math.pow(2, consecutiveErrorsCount - 1) * options.exponentialUnit;
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
