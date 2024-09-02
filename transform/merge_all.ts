/**
 * Provides {@link mergeAll}.
 *
 * @module
 */

import { identity } from "../internal/identity.ts";
import type { StreamSource } from "../types.ts";
import { mergeMap } from "./merge_map.ts";

/**
 * Returns a {@linkcode TransformStream} that converts a higher-order
 * {@linkcode ReadableStream} into a first-order ReadableStream by merging
 * the inner ReadableStreams.
 *
 * @template T The type of the chunks in the source stream.
 * @param options.concurrent Number of streams to read in parallel.
 *     Default is `Infinity`.
 * @returns A TransformStream that emits each higher-order ReadableStream values.
 *
 * @example
 * ```ts
 * import { mergeAll } from "@milly/streams/transform/merge-all";
 * import { from } from "@milly/streams/readable/from";
 * import { map } from "@milly/streams/transform/map";
 * import { pipe } from "@milly/streams/transform/pipe";
 * import { take } from "@milly/streams/transform/take";
 * import { timer } from "@milly/streams/readable/timer";
 *
 * // source[0] : 0 ------300ms----------> 0 ------300ms--------> 0 |
 * // source[1] : -100ms-> 1 ---200ms----> 1 ---200ms----> 1 |
 * // source[2] : ---200ms------> 2 ---200ms----> 2 ---200ms----> 2 |
 * // output    : 0 -----> 1 ---> 2 -----> 0 1 -> 2 -----> 1 ---> 0 2 |
 * const source = from([
 *   timer(0, 300).pipeThrough(pipe(take(3), map(() => 0))),
 *   timer(100, 200).pipeThrough(pipe(take(3), map(() => 1))),
 *   timer(200, 200).pipeThrough(pipe(take(3), map(() => 2))),
 * ]);
 * const output = source.pipeThrough(mergeAll());
 * const result = await Array.fromAsync(output);
 * console.log(result); // [0, 1, 2, 0, 1, 2, 1, 0, 2]
 * ```
 */
export function mergeAll<T>(
  options?: {
    concurrent?: number;
  },
): TransformStream<StreamSource<T>, T> {
  return mergeMap(identity, options);
}
