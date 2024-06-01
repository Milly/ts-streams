/**
 * Provides {@link terminate}.
 *
 * @module
 */

/**
 * Returns a {@linkcode TransformStream} that emits no values and immediately
 * terminates.
 *
 * @example
 * ```ts
 * import { terminate } from "@milly/streams/transform/terminate";
 * import { from } from "@milly/streams/readable/from";
 *
 * const source = from([1, 2, 3]);
 * const output = source.pipeThrough(terminate());
 * const result = await Array.fromAsync(output);
 * console.log(result); // []
 * ```
 */
export function terminate(): TransformStream<unknown, never> {
  return new TransformStream({
    start(controller) {
      controller.terminate();
    },
  });
}
