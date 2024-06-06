/**
 * Provides {@link switchAll}.
 *
 * @module
 */

import { identity } from "../internal/identity.ts";
import type { StreamSource } from "../types.ts";
import { switchMap } from "./switch_map.ts";

/**
 * Returns a {@linkcode TransformStream} that converts a higher-order
 * {@linkcode ReadableStream} into a first-order ReadableStream only from the
 * most recently higher-order ReadableStream.
 *
 * @example
 * ```ts
 * import { switchAll } from "@milly/streams/transform/switch-all";
 * import { timer } from "@milly/streams/readable/timer";
 * import { map } from "@milly/streams/transform/map";
 * import { pipe } from "@milly/streams/transform/pipe";
 * import { take } from "@milly/streams/transform/take";
 *
 * // source:timer  : 0 -300ms------> 1 -300ms------> 2 |
 * // source:map[0] : 0 -200ms-> 0 -200ms-> 0 |
 * // source:map[1] :                 1 -200ms-> 1 -200ms-> 1 |
 * // source:map[2] :                                 2 -200ms-> 2 -200ms-> 2 |
 * // output        : 0 -------> 0 -> 1 -------> 1 -> 2 -------> 2 -------> 2 |
 * const source = timer(0, 300).pipeThrough(pipe(
 *   take(3),
 *   map((value) =>
 *     timer(0, 200).pipeThrough(pipe(
 *       take(3),
 *       map(() => value),
 *     ))
 *   ),
 * ));
 * const output = source.pipeThrough(switchAll());
 * const result = await Array.fromAsync(output);
 * console.log(result); // [0, 0, 1, 1, 2, 2, 2]
 * ```
 *
 * @template T The type of chunks.
 * @returns A TransformStream that emits each higher-order ReadableStream values.
 */
export function switchAll<T>(): TransformStream<StreamSource<T>, T> {
  return switchMap(identity);
}
