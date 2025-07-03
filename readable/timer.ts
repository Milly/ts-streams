/**
 * Provides {@link timer}.
 *
 * @module
 */

import { deferred } from "../internal/deferred.ts";

/**
 * Creates a {@linkcode ReadableStream} that waits a `delay` then emits 0.
 *
 * If `interval` is specified, first waits for `delay` then emits 0, and emits
 * numbers incremented at each `interval`.
 *
 * @param delay The amount of time in milliseconds to wait before first emits.
 * @param [interval] The delay between each value emitted in the interval.
 * @returns A ReadableStream that waits `delay` then emits count at each `interval`.
 *
 * @example
 * ```ts
 * import { timer } from "@milly/streams/readable/timer";
 * import { take } from "@milly/streams/transform/take";
 *
 * // output1 : --100ms-> 0
 * const output1 = timer(100);
 * const result1 = await Array.fromAsync(output1);
 * console.log(result1); // [0]
 *
 * // output2 : --200ms-> 0 --50ms-> 1 --50ms-> 2 --50ms-> 3
 * const output2 = timer(200, 50).pipeThrough(take(4));
 * const result2 = await Array.fromAsync(output2);
 * console.log(result2); // [0, 1, 2, 3]
 * ```
 */
export function timer(delay: number): ReadableStream<0>;
export function timer(delay: number, interval: number): ReadableStream<number>;
export function timer(delay: number, interval = -1): ReadableStream<number> {
  delay = Math.max(delay, 0);
  const { promise, resolve } = deferred<void>();
  let timer = 0;
  let intervalTimer = 0;
  let count = 0;
  return new ReadableStream({
    pull(controller) {
      const enqueue = () => {
        controller.enqueue(count++);
      };
      if (delay === interval) {
        intervalTimer = setInterval(enqueue, delay);
      } else if (delay === 0 && interval > 0) {
        timer = setTimeout(enqueue, 0);
        intervalTimer = setInterval(enqueue, interval);
      } else if (interval < 0) {
        timer = setTimeout(() => {
          enqueue();
          controller.close();
          resolve();
        }, delay);
      } else {
        timer = setTimeout(() => {
          intervalTimer = setInterval(enqueue, interval);
          enqueue();
        }, delay);
      }
      return promise;
    },
    cancel() {
      clearTimeout(timer);
      clearInterval(intervalTimer);
      resolve();
    },
  });
}
