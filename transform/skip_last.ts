/**
 * Provides {@link skipLast}.
 *
 * @module
 */

/**
 * Returns a {@linkcode TransformStream} that skips the last `count` values.
 *
 * @template T The type of the chunks in the source stream.
 * @param count The number of values to emits.
 * @returns A TransformStream that skips the last count chunks.
 *
 * @example
 * ```ts
 * import { skipLast } from "@milly/streams/transform/skip-last";
 * import { from } from "@milly/streams/readable/from";
 * import { assertEquals } from "@std/assert";
 *
 * const source = from([1, 2, 3, 4, 5]);
 * const output = source.pipeThrough(skipLast(2));
 * const result = await Array.fromAsync(output);
 * assertEquals(result, [1, 2, 3]);
 * ```
 */
export function skipLast<T>(count = 1): TransformStream<T, T> {
  let buffer: T[] = [];
  return new TransformStream({
    transform(chunk) {
      buffer.push(chunk);
    },
    flush(controller) {
      if (count > 0) {
        buffer = buffer.slice(0, -count);
      }
      try {
        for (const chunk of buffer) {
          controller.enqueue(chunk);
        }
      } finally {
        // deno-lint-ignore no-explicit-any
        buffer = null as any;
      }
    },
  });
}
