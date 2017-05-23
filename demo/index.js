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
  subscription = polling(request$, { interval: 1000 }).subscribe((comments) => {
    console.log(comments);
  });
});

document.querySelector('.interrupt').addEventListener('click', function () {
  if (subscription) subscription.unsubscribe();
});
