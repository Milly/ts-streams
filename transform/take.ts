/**
 * Provides {@link take}.
 *
 * @module
 */

import { terminate } from "./terminate.ts";

/**
 * Returns a {@linkcode TransformStream} that emits only the first count values.
 *
 * @example
 * ```ts
 * import { take } from "@milly/streams/transform/take";
 * import { from } from "@milly/streams/readable/from";
 *
 * const source = from([1, 2, 3, 4, 5]);
 * const output = source.pipeThrough(take(2));
 * const result = await Array.fromAsync(output);
 * console.log(result); // [1, 2]
 * ```
 *
 * @template T The type of chunks.
 * @param count The number of values to emits.
 * @returns A TransformStream that emits the first count chunks.
 */
export function take<T>(count = 1): TransformStream<T, T> {
  if (count <= 0) return terminate();
  let index = 0;
  return new TransformStream({
    transform(chunk, controller) {
      controller.enqueue(chunk);
      if (++index >= count) {
        controller.terminate();
      }
    },
  });
}
