/**
 * Provides {@link concatMap}.
 *
 * @module
 */

import type { ProjectFn, StreamSource } from "../types.ts";
import { mergeMap } from "./merge_map.ts";

/**
 * Returns a {@linkcode TransformStream} that projects each source value to
 * a {@linkcode ReadableStream} which is concatenated in the output
 * ReadableStream.
 *
 * @template I The type of the chunks in the source stream.
 * @template O The type of the chunks in the transformed stream.
 * @param project A function that accepts up to two arguments. It is called one
 *     time for each chunk from the writable side.
 * @returns A TransformStream that projects each source value into
 *     a ReadableStream and concat it into the output.
 *
 * @example
 * ```ts
 * import { concatMap } from "@milly/streams/transform/concat-map";
 * import { from } from "@milly/streams/readable/from";
 * import { interval } from "@milly/streams/readable/interval";
 * import { map } from "@milly/streams/transform/map";
 * import { pipe } from "@milly/streams/transform/pipe";
 * import { take } from "@milly/streams/transform/take";
 *
 * // source     : 3 5 |
 * // project[0] : -300ms-> 30 -300ms-> 31 |
 * // project[1] :                         -500ms----> 50 -500ms----> 51 |
 * // output     : -------> 30 -------> 31 ----------> 50 ----------> 51 |
 * const source = from([3, 5]);
 * const output = source.pipeThrough(concatMap((value) =>
 *   interval(value * 100).pipeThrough(pipe(
 *     take(2),
 *     map((index) => value * 10 + index),
 *   ))
 * ));
 * const result = await Array.fromAsync(output);
 * console.log(result); // [30, 31, 50, 51]
 * ```
 */
export function concatMap<I, O>(
  project: ProjectFn<I, StreamSource<O>>,
): TransformStream<I, O> {
  return mergeMap(project, { concurrent: 1 });
}
