/**
 * Provides {@link exhaustAll}.
 *
 * @module
 */

import { identity } from "../internal/identity.ts";
import type { StreamSource } from "../types.ts";
import { exhaustMap } from "./exhaust_map.ts";

/**
 * Returns a {@linkcode TransformStream} that converts a higher-order
 * {@linkcode ReadableStream} into a first-order ReadableStream only if
 * the previous higher-order ReadableStream has completed.
 *
 * @template T The type of the chunks in the source stream.
 * @returns A TransformStream that emits each higher-order ReadableStream values.
 *
 * @example
 * ```ts
 * import { exhaustAll } from "@milly/streams/transform/exhaust-all";
 * import { timer } from "@milly/streams/readable/timer";
 * import { map } from "@milly/streams/transform/map";
 * import { pipe } from "@milly/streams/transform/pipe";
 * import { take } from "@milly/streams/transform/take";
 *
 * // source:timer  : 0 -300ms------> 1 -300ms------> 2 |
 * // source:map[0] : 0 -200ms-> 0 -200ms-> 0 |
 * // source:map[1] :                 1 -200ms-> 1 -200ms-> 1 |
 * // source:map[2] :                                 2 -200ms-> 2 -200ms-> 2 |
 * // output        : 0 -------> 0 -------> 0 ------> 2 -------> 2 -------> 2 |
 * const source = timer(0, 300).pipeThrough(pipe(
 *   take(3),
 *   map((value) =>
 *     timer(0, 200).pipeThrough(pipe(
 *       take(3),
 *       map(() => value),
 *     ))
 *   ),
 * ));
 * const output = source.pipeThrough(exhaustAll());
 * const result = await Array.fromAsync(output);
 * console.log(result); // [0, 0, 1, 0, 1, 2, 1, 2, 2]
 * ```
 */
export function exhaustAll<T>(): TransformStream<StreamSource<T>, T> {
  return exhaustMap(identity);
}
