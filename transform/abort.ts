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
 *
 * const source = from([1, 2, 3]);
 * const output = source.pipeThrough(abort("reason"));
 * try {
 *   await Array.fromAsync(output);
 * } catch (e) {
 *   console.log(e); // "reason"
 * }
 * ```
 */
export function abort(reason?: unknown): TransformStream<unknown, never> {
  return new TransformStream({
    start(controller) {
      controller.error(reason);
    },
  });
}
