/**
 * Provides {@link mergeAll}.
 *
 * @module
 */

import { identity } from "../_internal/identity.ts";
import type { StreamSource } from "../types.ts";
import { mergeMap } from "./merge_map.ts";

/**
 * Returns a {@linkcode TransformStream} that converts a higher-order
 * {@linkcode ReadableStream} into a first-order ReadableStream by merging
 * the inner ReadableStreams.
 *
 * @example
 * ```ts
 * import { mergeAll } from "@milly/streams/transformer/merge-all";
 * import { from } from "@milly/streams/readable/from";
 * import { map } from "@milly/streams/transformer/map";
 * import { timer } from "@milly/streams/readable/timer";
 *
 * // source[0] : 0 ------300ms----------> 0 ------300ms--------> 0 |
 * // source[1] : -100ms-> 1 ---200ms----> 1 ---200ms----> 1 |
 * // source[2] : ---200ms------> 2 ---200ms----> 2 ---200ms----> 2 |
 * // output    : 0 -----> 1 ---> 2 -----> 0 1 -> 2 -----> 1 ---> 0 2 |
 * const source = from([
 *   timer(0, 300).pipeThrough(map(() => 0)),
 *   timer(100, 200).pipeThrough(map(() => 1)),
 *   timer(200, 200).pipeThrough(map(() => 2)),
 * ]);
 * const output = source.pipeThrough(mergeAll());
 * const result = await Array.fromAsync(output);
 * console.log(result); // [0, 1, 2, 0, 1, 2, 1, 0, 2]
 * ```
 *
 * @template T The type of chunks.
 * @param options.concurrent Number of streams to read in parallel. Default is `Infinity`.
 * @returns A TransformStream that emits each higher-order ReadableStream values.
 */
export function mergeAll<T>(
  options?: {
    concurrent?: number;
  },
): TransformStream<StreamSource<T>, T> {
  return mergeMap(identity, options);
}
