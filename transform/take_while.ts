/**
 * Provides {@link takeWhile}.
 *
 * @module
 */

import type { GuardFn, PredicateFn } from "../types.ts";
import type { Falsy } from "../internal/types.ts";

/**
 * Represents options for {@linkcode takeWhile}.
 */
export interface TakeWhileOptions {
  /**
   * If `true`, the value that caused predicate to return false will also be emitted.
   *
   * @default {false}
   */
  inclusive?: boolean;
}

/**
 * Returns a {@linkcode TransformStream} that emits only the first count values.
 *
 * @example
 * ```ts
 * import { takeWhile } from "@milly/streams/transform/take-while";
 * import { from } from "@milly/streams/readable/from";
 *
 * const source = from(["a", "b", 1, 2, "c", 3]);
 * const output = source.pipeThrough(
 *   takeWhile((value: unknown): value is string => typeof value === "string"),
 * );
 * const result = await Array.fromAsync(output);
 * console.log(result); // ["a", "b"]
 * ```
 *
 * @template I The type of chunks from the writable side.
 * @template O The type of chunks to the readable side.
 * @param predicate A predicate function.
 * @returns A TransformStream that emits first count chunks.
 */
export function takeWhile<I, O extends I>(
  predicate: GuardFn<I, O>,
  options?: { inclusive?: false },
): TransformStream<I, O>;
/**
 * Returns a {@linkcode TransformStream} that emits only the first count values.
 *
 * @example
 * ```ts
 * import { takeWhile } from "@milly/streams/transform/take-while";
 * import { from } from "@milly/streams/readable/from";
 *
 * const source = from([1, 2, 0, 3, 4]);
 * const output = source.pipeThrough(takeWhile(Boolean));
 * const result = await Array.fromAsync(output);
 * console.log(result); // [1, 2]
 * ```
 *
 * @template T The type of chunks from the writable side.
 * @param predicate A predicate function.
 * @returns A TransformStream that emits first count chunks.
 */
export function takeWhile<T>(
  predicate: BooleanConstructor,
  options?: { inclusive?: false },
): TransformStream<T, Exclude<T, Falsy>>;
/**
 * Returns a {@linkcode TransformStream} that emits values while `predicate` holds true.
 *
 * @example
 * ```ts
 * import { takeWhile } from "@milly/streams/transform/take-while";
 * import { from } from "@milly/streams/readable/from";
 *
 * const source = from([1, 2, 3, 2, 0]);
 * const output = source.pipeThrough(takeWhile((value) => value <= 2));
 * const result = await Array.fromAsync(output);
 * console.log(result); // [1, 2]
 * ```
 *
 * @template T The type of chunks.
 * @param predicate A predicate function.
 * @param options Option parameters object.
 * @returns A TransformStream that emits values while `predicate` holds true.
 */
export function takeWhile<T>(
  predicate: PredicateFn<T>,
  options?: TakeWhileOptions,
): TransformStream<T, T>;
export function takeWhile<T>(
  predicate: PredicateFn<T>,
  options?: TakeWhileOptions,
): TransformStream<T, T> {
  if (typeof predicate !== "function") {
    throw new TypeError("'predicate' is not a function");
  }
  const { inclusive = false } = options ?? {};
  let index = 0;
  return new TransformStream({
    async transform(chunk, controller) {
      if (await predicate(chunk, index++)) {
        controller.enqueue(chunk);
      } else {
        if (inclusive) {
          controller.enqueue(chunk);
        }
        controller.terminate();
      }
    },
  });
}
