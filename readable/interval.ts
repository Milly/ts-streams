/**
 * Provides {@link interval}.
 *
 * @module
 */

import { timer } from "./timer.ts";

/**
 * Creates a {@linkcode ReadableStream} that emits count at every `interval`.
 *
 * @param period The delay between each value emitted in the interval.
 * @returns A ReadableStream that emits count at the specified interval.
 *
 * @example
 * ```ts
 * import { interval } from "@milly/streams/readable/interval";
 * import { take } from "@milly/streams/transform/take";
 *
 * // output : --100ms-> 0 --100ms-> 1 --100ms-> 2 --100ms-> 3 |
 * const output = interval(100).pipeThrough(take(4));
 * const result = await Array.fromAsync(output);
 * console.log(result); // [0, 1, 2, 3]
 * ```
 */
export function interval(period: number): ReadableStream<number> {
  return timer(period, period);
}
