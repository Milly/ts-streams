/**
 * Provides {@link min}.
 *
 * @module
 */

import { reduce } from "./reduce.ts";

/**
 * Returns a {@linkcode TransformStream} that emits smallest value from the
 * writable side.
 *
 * @template T The type of the chunks in the source stream.
 * @param comparer The compare function that will use instead of the default
 *     two-value comparison behavior.
 * @returns A TransformStream that emits smallest value.
 *
 * @example
 * ```ts
 * import { min } from "@milly/streams/transform/min";
 * import { from } from "@milly/streams/readable/from";
 * import { assertEquals } from "@std/assert";
 *
 * const source = from([12, 42, 3, 8, 25]);
 * const output = source.pipeThrough(min());
 * const result = await Array.fromAsync(output);
 * assertEquals(result, [3]);
 * ```
 */
export function min<T>(
  comparer?: (a: T, b: T, index: number) => number | Promise<number>,
): TransformStream<T | Promise<T>, T> {
  if (comparer === undefined) {
    return reduce((a: T, b: T): T => a < b ? a : b);
  }
  if (typeof comparer === "function") {
    return reduce(
      async (a: T, b: T, index: number): Promise<T> =>
        (await comparer(a, b, index)) < 0 ? a : b,
    );
  }
  throw new TypeError("'comparer' is not a function");
}
