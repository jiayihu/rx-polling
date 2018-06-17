import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ajax } from 'rxjs/ajax';

import polling from '../lib/';

const request$ = ajax({
  url: 'https://jsonplaceholder.typicode.com/comments/',
  crossDomain: true
}).pipe(
  map(response => response.response || []),
  map(response => response.slice(0, 10)) // Take only first 10 comments
);

let subscription;

document.querySelector('.start').addEventListener('click', function() {
  const strategy = Array.from(document.querySelectorAll('.form-check-input')).find(
    input => input.checked
  ).value;

  subscription = polling(request$, {
    interval: 3000,
    backoffStrategy: strategy,
    attempts: 4
  }).subscribe(
    comments => {
      console.group('Received data from polling');
      console.log(comments);
      console.groupEnd();
    },
    error => {
      console.warn('Polling errored, all 4 recover attempts failed.');
      console.error(error);
    }
  );
});

document.querySelector('.interrupt').addEventListener('click', function() {
  if (subscription) {
    subscription.unsubscribe();
    console.log('Closed the polling');
  }
});
