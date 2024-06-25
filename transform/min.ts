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
 * @example
 * ```ts
 * import { min } from "@milly/streams/transform/min";
 * import { from } from "@milly/streams/readable/from";
 *
 * const source = from([12, 42, 3, 8, 25]);
 * const output = source.pipeThrough(min());
 * const result = await Array.fromAsync(output);
 * console.log(result); // [3]
 * ```
 *
 * @template T The type of chunks.
 * @param comparer The compare function that will use instead of the default two-value comparison behavior.
 * @returns A TransformStream that emits smallest value.
 */
export function min<T>(
  comparer?: (a: T, b: T, index: number) => number,
): TransformStream<T | Promise<T>, T> {
  if (comparer === undefined) {
    return reduce((a: T, b: T): T => a < b ? a : b);
  }
  if (typeof comparer === "function") {
    return reduce(
      (a: T, b: T, index: number): T => comparer(a, b, index) < 0 ? a : b,
    );
  }
  throw new TypeError("'comparer' is not a function");
}
