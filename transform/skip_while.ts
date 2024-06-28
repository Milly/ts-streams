/**
 * Provides {@link skipWhile}.
 *
 * @module
 */

import type { PredicateFn } from "../types.ts";
import type { Falsy } from "../internal/types.ts";

/**
 * Returns a {@linkcode TransformStream} that skips values as long as
 * `predicate` holds true.
 *
 * @template T The type of the chunks in the source stream.
 * @param predicate A predicate function.
 * @returns A TransformStream that skips values as long as `predicate` holds true.
 *
 * @example
 * ```ts
 * import { skipWhile } from "@milly/streams/transform/skip-while";
 * import { from } from "@milly/streams/readable/from";
 *
 * const source = from([1, 2, 0, 3, 4]);
 * const output = source.pipeThrough(skipWhile(Boolean));
 * const result = await Array.fromAsync(output);
 * console.log(result); // [0, 3, 4]
 * ```
 */
export function skipWhile<T>(
  predicate: BooleanConstructor,
): TransformStream<T, Exclude<T, Falsy> extends never ? never : T>;
/**
 * Returns a {@linkcode TransformStream} that skips values as long as
 * `predicate` holds true.
 *
 * @template T The type of the chunks in the source stream.
 * @param predicate A predicate function.
 * @returns A TransformStream that skips values as long as `predicate` holds true.
 *
 * @example
 * ```ts
 * import { skipWhile } from "@milly/streams/transform/skip-while";
 * import { from } from "@milly/streams/readable/from";
 *
 * const source = from([1, 2, 3, 2, 0]);
 * const output = source.pipeThrough(skipWhile((value) => value <= 2));
 * const result = await Array.fromAsync(output);
 * console.log(result); // [3, 2, 0]
 * ```
 */
export function skipWhile<T>(predicate: PredicateFn<T>): TransformStream<T, T>;
export function skipWhile<T>(predicate: PredicateFn<T>): TransformStream<T, T> {
  if (typeof predicate !== "function") {
    throw new TypeError("'predicate' is not a function");
  }
  let index = 0;
  let condition = true;
  return new TransformStream({
    async transform(chunk, controller) {
      condition &&= await predicate(chunk, index++);
      if (!condition) {
        controller.enqueue(chunk);
      }
    },
  });
}
