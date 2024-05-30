/**
 * Provides {@link timer}.
 *
 * @module
 */

/**
 * Creates a {@linkcode ReadableStream} that waits a `delay` then emits 0.
 *
 * If `interval` is specified, first waits for `delay` then emits 0, and emits
 * numbers incremented at each `interval`.
 *
 * @example
 * ```ts
 * import { timer } from "@milly/streams/readable/timer";
 * import { take } from "@milly/streams/transformer/take";
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
 *
 * @param delay The amount of time in milliseconds to wait before first emits.
 * @param [interval] The delay between each value emitted in the interval.
 * @returns A ReadableStream that waits `delay` then emits count at each `interval`.
 */
export function timer(delay: number): ReadableStream<0>;
export function timer(delay: number, interval: number): ReadableStream<number>;
export function timer(delay: number, interval = -1): ReadableStream<number> {
  const { promise, resolve } = Promise.withResolvers<void>();
  let timer: number | undefined;
  let count = 0;
  return new ReadableStream({
    pull(controller) {
      timer = setTimeout(() => {
        if (0 <= interval) {
          timer = setInterval(() => {
            controller.enqueue(count++);
          }, interval);
        } else {
          timer = undefined;
        }
        controller.enqueue(count++);
        if (interval < 0) {
          controller.close();
          resolve();
        }
      }, Math.max(delay, 0));
      return promise;
    },
    cancel() {
      clearTimeout(timer);
      resolve();
    },
  });
}
