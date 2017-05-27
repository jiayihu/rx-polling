// @ts-check

import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/dom/ajax';
import 'rxjs/add/operator/map';

import polling from '../lib/';

const request$ = Observable.ajax({
    url: 'https://jsonplaceholder.typicode.com/comments/',
    crossDomain: true
  }).map(response => response.response || [])
  .map(response => response.slice(0, 10)); // Take only first 10 comments

let subscription;

document.querySelector('.start').addEventListener('click', function () {
  const strategy = Array.from(document.querySelectorAll('.form-check-input'))
    .find(input => input.checked)
    .value;

  subscription = polling(request$, { interval: 2000, backoffStrategy: strategy, attempts: 4 }).subscribe((comments) => {
    console.group('Received data from polling');
    console.log(comments);
    console.groupEnd();
  }, (error) => {
    console.warn('Polling errored, all 4 recover attempts failed.');
    console.error(error);
  });
});

document.querySelector('.interrupt').addEventListener('click', function () {
  if (subscription) {
    subscription.unsubscribe();
    console.log('Closed the polling');
  }
});
