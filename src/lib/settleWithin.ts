/**
 * Wait for a write at most `ms`. Firestore applies writes locally at once (the message
 * shows in the thread with a "sending" clock) but the promise only settles when the
 * server confirms — on a weak or stalled connection that can take very long. UI
 * actions (the send button) must not stay locked for that.
 *
 * Resolves 'done' when the task finished in time, 'pending' when it is still running
 * (it keeps going in the background). A rejection before the deadline propagates.
 */
export function settleWithin(task: Promise<unknown>, ms: number): Promise<'done' | 'pending'> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => resolve('pending'), ms);
    task.then(
      () => {
        clearTimeout(timer);
        resolve('done');
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

/** How long a send may hold the composer before it continues in the background. */
export const CHAT_SEND_WAIT_MS = 3500;
