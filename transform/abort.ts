/**
 * Provides {@link abort}.
 *
 * @module
 */

/**
 * Returns a {@linkcode TransformStream} that emits no values and immediately
 * aborts.
 *
 * @param reason A string describing why the stream was aborted.
 *
 * @example
 * ```ts
 * import { abort } from "@milly/streams/transform/abort";
 * import { from } from "@milly/streams/readable/from";
 * import { assertEquals, assertRejects } from "@std/assert";
 *
 * const source = from([1, 2, 3]);
 * const output = source.pipeThrough(abort("reason"));
 * const error = await assertRejects(async () => {
 *   await Array.fromAsync(output);
 * });
 * assertEquals(error, "reason");
 * ```
 */
export function abort(reason?: unknown): TransformStream<unknown, never> {
  return new TransformStream({
    start(controller) {
      controller.error(reason);
    },
  });
}
