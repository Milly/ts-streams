/**
 * Provides {@link delay}.
 *
 * @module
 */

import { timer } from "../readable/timer.ts";
import { map } from "./map.ts";
import { mergeMap } from "./merge_map.ts";

/**
 * Returns a {@linkcode TransformStream} that delays the emission of values
 * from the source {@linkcode ReadableStream} by a given timeout.
 *
 * @template T The type of the chunks in the source stream.
 * @param due The delay duration in milliseconds.
 * @returns A TransformStream that emits values delayed after the source is emitted.
 *
 * @example
 * ```ts
 * import { delay } from "@milly/streams/transform/delay";
 * import { take } from "@milly/streams/transform/take";
 * import { timer } from "@milly/streams/readable/timer";
 *
 * // source : -100ms-> 0 --200ms--> 1 --200ms--> 2 |
 * // output : -400ms--------------------> 0 --200ms--> 1 --200ms--> 2 |
 * const source = timer(100, 300).pipeThrough(take(3));
 * const output = source.pipeThrough(delay(300));
 * const result = await Array.fromAsync(output);
 * console.log(result); // [0, 1, 2]
 * ```
 */
export function delay<T>(due: number): TransformStream<T, T> {
  return mergeMap((value) => timer(due).pipeThrough(map(() => value)));
}
