/**
 * Provides {@link debounceTime}.
 *
 * @module
 */

import { debounce, type DebouncedFunction } from "@std/async/debounce";

/**
 * Returns a {@linkcode TransformStream} that delays and filters values from
 * the source stream, emitting only after a specified duration of inactivity.
 *
 * When a value is received, the transform waits for the specified duration.
 * If another value arrives during this wait period, the timer resets and the
 * previous value is discarded. Only when no new values arrive for the full
 * duration is the latest value emitted.
 *
 * @template T The type of the chunks in the source stream.
 * @param due The debounce duration in milliseconds.
 * @returns A TransformStream that debounces values from the source stream.
 *
 * @example Debouncing rapid value emissions
 * ```ts
 * import { debounceTime } from "@milly/streams/transform/debounce-time";
 * import { from } from "@milly/streams/readable/from";
 * import { delay } from "@std/async";
 *
 * // source : 0 -100ms-> 1 ---200ms---> 2 3 ---200ms---> 4 |
 * // output :              -150ms-> 1       -150ms-> 3   4 |
 * const source = from((async function* () {
 *   yield 0;                    // Discarded (followed by value within 150ms)
 *   await delay(100); yield 1;  // Emitted after 150ms of inactivity
 *   await delay(200); yield 2;  // Discarded (immediately followed by 3)
 *   yield 3;                    // Emitted after 150ms of inactivity
 *   await delay(200); yield 4;  // Emitted when stream ends
 * })());
 * const output = source.pipeThrough(debounceTime(150));
 * const result = await Array.fromAsync(output);
 * console.log(result); // [1, 3, 4]
 * ```
 */
export function debounceTime<T>(due: number): TransformStream<T, T> {
  if (due <= 0) {
    return new TransformStream<T, T>();
  }

  let enqueue: DebouncedFunction<[value: T]>;

  return new TransformStream<T, T>(
    {
      start(controller) {
        enqueue = debounce((value) => {
          try {
            controller.enqueue(value);
          } catch {
            // Avoid throwing if the controller is already closed
          }
        }, due);
      },
      transform(chunk) {
        enqueue(chunk);
      },
      flush() {
        enqueue.flush();
        // @ts-expect-error: TS2322 force cleanup resources
        enqueue = undefined;
      },
      cancel() {
        enqueue.clear();
        // @ts-expect-error: TS2322 force cleanup resources
        enqueue = undefined;
      },
    },
    { highWaterMark: 1 },
    { highWaterMark: 0 },
  );
}
