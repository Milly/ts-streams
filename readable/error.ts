/**
 * Provides {@link error}.
 *
 * @module
 */

/**
 * Returns a {@linkcode ReadableStream} that emits no values and immediately
 * cancels.
 *
 * @example
 * ```ts
 * import { error } from "@milly/streams/readable/error";
 *
 * try {
 *   await Array.fromAsync(error("reason"));
 * } catch (e) {
 *   console.log(e); // "reason"
 * }
 * ```
 */
export function error(reason?: unknown): ReadableStream<never> {
  return new ReadableStream({
    start(controller) {
      controller.error(reason);
    },
  });
}
