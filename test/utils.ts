import repeat from 'lodash/repeat';
import { TestMessage } from 'rxjs/testing/TestMessage';
import { Notification } from 'rxjs/Notification';
import { Observable } from 'rxjs/Observable';
import { Observer } from 'rxjs/Observer';
import chalk from 'chalk';

function notificationToMarble(notification: Notification<any>): string {
  if (notification.kind === 'N') return notification.value || 'x';
  if (notification.kind === 'E') return '#';
  if (notification.kind === 'C') return '|';
}

// @TODO: support groups of subsequent emits
function testMessagesToMarbles(messages: TestMessage[]): string {
  return messages.reduce((marbles, message, index) => {
    const prevMessage = index === 0 ? { frame: 0 } : messages[index - 1];
    const frames = message.frame - prevMessage.frame;

    return marbles + repeat('-', frames / 10) + notificationToMarble(message.notification);
  }, '');
}

/**
 * Simple transformation from TestMessage[] to marble string, in order to have
 * easier to read diffs.
 * @NOTE: it's probably bugged and incomplete. Use with caution.
 */
export function diffTestMessages(actual: TestMessage[], expected: TestMessage[]) {
  const marblesA = testMessagesToMarbles(actual);
  const marblesB = testMessagesToMarbles(expected);

  return chalk.green(marblesB + ' (Expected)') + '\n' + chalk.red(marblesA + ' (Received)');
}


/**
 * Returns an Observable, very similar to `Observable.of()` but it errors on the
 * third time.
 */
export function getErrorObservable(): Observable<number> {
  let counter = 0;

  return Observable.create((observer: Observer<number>) => {
    counter += 1;

    if (counter < 3) {
      observer.next(counter);
      observer.complete();
      return;
    }

    observer.error(counter);
    return;
  })
}
