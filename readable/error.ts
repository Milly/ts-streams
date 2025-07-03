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
 * import { assertEquals } from "@std/assert";
 *
 * try {
 *   await Array.fromAsync(error("reason"));
 * } catch (e) {
 *   assertEquals(e, "reason");
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
