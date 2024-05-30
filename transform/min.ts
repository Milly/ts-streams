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
  comparer?: (a: T, b: T) => number,
): TransformStream<T, T> {
  return reduce(
    comparer
      ? ((a, b) => comparer(a, b) < 0 ? a : b)
      : ((a, b) => a < b ? a : b),
  );
}
