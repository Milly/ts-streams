/**
 * Provides {@link take}.
 *
 * @module
 */

import { terminate } from "./terminate.ts";

/**
 * Returns a {@linkcode TransformStream} that emits only the first `count`
 * values.
 *
 * @template T The type of the chunks in the source stream.
 * @param count The number of values to emits.
 * @returns A TransformStream that emits the first count chunks.
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
 */
export function take<T>(count = 1): TransformStream<T, T> {
  if (count <= 0) return terminate();
  let index = 0;
  return new TransformStream(
    {
      transform(chunk, controller) {
        controller.enqueue(chunk);
        if (++index >= count) {
          controller.terminate();
        }
      },
    },
    undefined,
    { highWaterMark: count },
  );
}
