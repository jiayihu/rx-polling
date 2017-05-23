# rx-polling

[![npm](https://img.shields.io/npm/v/rx-polling.svg)](https://www.npmjs.com/package/rx-polling) [![travis](https://travis-ci.org/jiayihu/rx-polling.svg?branch=master)](https://travis-ci.org/jiayihu/rx-polling)

**rx-polling** is a tiny (1KB gzipped) library to run polling requests on intervals, with support for:

- pause and resume if the browser tab is inactive/active
- N retry attempts before throwing
- Esponential backoff between attempts. It will wait 2, 4, ... 64, 256 seconds between attemps.

## Installation

```
npm install rx-polling --save
```

## Usage

Fetch data from the endpoint every 5 seconds.

```javascript
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/dom/ajax';
import 'rxjs/add/operator/map';

import polling from 'rx-polling';

const request$ = Observable.ajax({
    url: 'https://jsonplaceholder.typicode.com/comments/',
    crossDomain: true
  }).map(response => response.response || [])
  .map(response => response.slice(0, 10)); // Take only first 10 comments

polling(request$, { interval: 5000 }).subscribe((comments) => {
  console.log(comments);
});
```

### Stop polling

Since `rx-polling` returns an Observable, you can just `.unsubscribe` from it to close the polling.

```javascript
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/dom/ajax';
import 'rxjs/add/operator/map';

import polling from 'rx-polling';

const request$ = Observable.ajax({
    url: 'https://jsonplaceholder.typicode.com/comments/',
    crossDomain: true
  }).map(response => response.response || [])
  .map(response => response.slice(0, 10)); // Take only first 10 comments

let subscription = polling(request$, { interval: 5000 }).subscribe((comments) => {
  console.log(comments);
});

window.setTimeout(() => {
  subscription.unsubscribe();
}, 5000);
```

## API

#### polling(request$, options): Observable

```javascript
import polling from 'rx-polling';

...

// Any Observable is okay, even if it does not make network requests
const request$ = this.http.get('someResource');

polling(request$, {
    // Period of the polling
    interval: 5000,

    // How many times to attempt recover, requesting the data again.
    // Each attempt is delayed of an increasing esponential time.
    // The delays are 2, 4, 8, 16, 32, 64, 128 seconds (7 attempts) 
    // in this case.
    attempts: 7
  })
  .subscribe((data) => {
    console.log(data);
  });
```

Returns an `Observable` which:

- *emits* whenever new data is fetched using `request$`
- *errors* if `request$` throws AND if after N attempts it still fails. If any of the attempts succeeds then the polling is recovered and no error is thrown
- *completes* Never. Be sure to `.unsubscribe()` the Observable when you're not anymore interested in the polling.

## Browser support

**rx-polling** supports IE10+, it internally uses [document.hidden](https://developer.mozilla.org/en-US/docs/Web/API/Document/hidden).
