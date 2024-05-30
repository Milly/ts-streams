/**
 * Provides {@link max}.
 *
 * @module
 */

import { reduce } from "./reduce.ts";

/**
 * Returns a {@linkcode TransformStream} that emits largest value from the
 * writable side.
 *
 * @example
 * ```ts
 * import { max } from "@milly/streams/transformer/max";
 * import { from } from "@milly/streams/readable/from";
 *
 * const source = from([12, 42, 3, 8, 25]);
 * const output = source.pipeThrough(max());
 * const result = await Array.fromAsync(output);
 * console.log(result); // [42]
 * ```
 *
 * @template T The type of chunks.
 * @param comparer The compare function that will use instead of the default two-value comparison behavior.
 * @returns A TransformStream that emits largest value.
 */
export function max<T>(
  comparer?: (a: T, b: T) => number,
): TransformStream<T, T> {
  return reduce(
    comparer
      ? ((a, b) => comparer(a, b) > 0 ? a : b)
      : ((a, b) => a > b ? a : b),
  );
}
