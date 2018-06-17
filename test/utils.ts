import repeat from 'lodash/repeat';
import { TestMessage } from 'rxjs/internal/testing/TestMessage';
import { Notification } from 'rxjs/internal/Notification';
import { Observable, Observer } from 'rxjs';
import chalk from 'chalk';

function notificationToMarble(notification: Notification<any>): string {
  if (notification.kind === 'N') return notification.value || 'x';
  if (notification.kind === 'E') return '#';
  if (notification.kind === 'C') return '|';
}

function testMessagesToMarbles(messages: TestMessage[]): string {
  let areGrouped = false;
  const marbles = messages.reduce((prevMarbles, message, index) => {
    const prevMessage = index === 0 ? { frame: 0 } : messages[index - 1];
    const frames = message.frame - prevMessage.frame;
    let valueMarble = notificationToMarble(message.notification);

    const nextMessages = index === messages.length - 1 ? { frame: Infinity } : messages[index + 1];
    const isGroupedWithNext = nextMessages.frame - message.frame === 0;

    if (isGroupedWithNext && !areGrouped) {
      // First value of the group
      areGrouped = true;
      valueMarble = '(' + valueMarble;
    } else if (!isGroupedWithNext && areGrouped) {
      // Last value of the group
      areGrouped = false;
      valueMarble = valueMarble + ')';
    }

    return prevMarbles + repeat('-', frames - 1) + valueMarble;
  }, '');

  return '-' + marbles; // Prepend frame 0
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
  });
}
