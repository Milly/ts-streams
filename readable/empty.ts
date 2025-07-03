/**
 * Provides {@link empty}.
 *
 * @module
 */

/**
 * Returns a {@linkcode ReadableStream} that emits no values and immediately
 * closes.
 *
 * @example
 * ```ts
 * import { empty } from "@milly/streams/readable/empty";
 * import { assertEquals } from "@std/assert";
 *
 * const result = await Array.fromAsync(empty());
 * assertEquals(result, []);
 * ```
 */
export function empty(): ReadableStream<never> {
  return new ReadableStream({
    start(controller) {
      controller.close();
    },
  });
}
