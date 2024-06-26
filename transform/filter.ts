/**
 * Provides {@link filter}.
 *
 * @module
 */

import type { GuardFn, PredicateFn } from "../types.ts";
import type { Falsy } from "../internal/types.ts";

/**
 * Returns a {@linkcode TransformStream} that filter items by a specified
 * predicate.
 *
 * Like {@linkcode Array.prototype.filter()}.
 *
 * @example
 * ```ts
 * import { filter } from "@milly/streams/transform/filter";
 * import { from } from "@milly/streams/readable/from";
 *
 * const source = from([1, "a", 2, "b", 3, "c"]);
 * const output = source.pipeThrough(
 *   filter((v): v is string => typeof v === "string")
 * );
 * const result = await Array.fromAsync(output);
 * console.log(result); // ["a", "b", "c"]
 * ```
 *
 * @template I The type of chunks from the writable side.
 * @template O The type of chunks to the readable side.
 * @param predicate A predicate function.
 * @returns A TransformStream that emits filtered chunks.
 */
export function filter<I, O extends I>(
  predicate: GuardFn<I, O>,
): TransformStream<I, O>;
/**
 * Returns a {@linkcode TransformStream} that filter items by a specified
 * predicate.
 *
 * Like {@linkcode Array.prototype.filter()}.
 *
 * @example
 * ```ts
 * import { filter } from "@milly/streams/transform/filter";
 * import { from } from "@milly/streams/readable/from";
 *
 * const source = from([1, null, 2, undefined, false, 3]);
 * const output = source.pipeThrough(filter(Boolean));
 * const result = await Array.fromAsync(output);
 * console.log(result); // [1, 2, 3]
 * ```
 *
 * @template T The type of chunks from the writable side.
 * @param predicate A predicate function.
 * @returns A TransformStream that emits filtered chunks.
 */
export function filter<T>(
  predicate: BooleanConstructor,
): TransformStream<T, Exclude<T, Falsy>>;
/**
 * Returns a {@linkcode TransformStream} that filter items by a specified
 * predicate.
 *
 * Like {@linkcode Array.prototype.filter()}.
 *
 * @example
 * ```ts
 * import { filter } from "@milly/streams/transform/filter";
 * import { from } from "@milly/streams/readable/from";
 *
 * const source = from([1, 2, 3, 4, 5, 6, 7]);
 * const output = source.pipeThrough(filter((v) => v % 2 === 0));
 * const result = await Array.fromAsync(output);
 * console.log(result); // [2, 4, 6]
 * ```
 *
 * @template T The type of chunks.
 * @param predicate A predicate function.
 * @returns A TransformStream that emits filtered chunks.
 */
export function filter<T>(predicate: PredicateFn<T>): TransformStream<T, T>;
export function filter<T>(
  predicate: (value: T, index: number) => boolean | Promise<boolean>,
): TransformStream<T, T> {
  if (typeof predicate !== "function") {
    throw new TypeError("'predicate' is not a function");
  }
  let index = -1;
  return new TransformStream({
    async transform(chunk, controller) {
      if (await predicate(chunk, ++index)) {
        controller.enqueue(chunk);
      }
    },
  });
}
