/**
 * Provides {@link skip}.
 *
 * @module
 */

/**
 * Returns a {@linkcode TransformStream} that skips the first count values.
 *
 * @example
 * ```ts
 * import { skip } from "@milly/streams/transform/skip";
 * import { from } from "@milly/streams/readable/from";
 *
 * const source = from([1, 2, 3, 4, 5]);
 * const output = source.pipeThrough(skip(3));
 * const result = await Array.fromAsync(output);
 * console.log(result); // [4, 5]
 * ```
 *
 * @template T The type of chunks.
 * @param count The number of values to skips.
 * @returns A TransformStream that skips the first count chunks.
 */
export function skip<T>(count = 1): TransformStream<T, T> {
  let index = 0;
  return new TransformStream({
    transform(chunk, controller) {
      if (++index > count) {
        controller.enqueue(chunk);
      }
    },
  });
}
