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
   * If `true`, the value that caused predicate to return false will also be
   * emitted.
   *
   * @default {false}
   */
  inclusive?: boolean;
}

/**
 * Returns a {@linkcode TransformStream} that emits only the first `count`
 * values.
 *
 * @template I The type of the chunks in the source stream.
 * @template O The type of the chunks in the transformed stream.
 * @param predicate A predicate function.
 * @returns A TransformStream that emits first count chunks.
 *
 * @example
 * ```ts
 * import { takeWhile } from "@milly/streams/transform/take-while";
 * import { from } from "@milly/streams/readable/from";
 * import { assertEquals } from "@std/assert";
 *
 * const source = from(["a", "b", 1, 2, "c", 3]);
 * const output = source.pipeThrough(
 *   takeWhile((value: unknown): value is string => typeof value === "string"),
 * );
 * const result = await Array.fromAsync(output);
 * assertEquals(result, ["a", "b"]);
 * ```
 */
export function takeWhile<I, O extends I>(
  predicate: GuardFn<I, O>,
  options?: { inclusive?: false },
): TransformStream<I, O>;
/**
 * Returns a {@linkcode TransformStream} that emits only the first `count`
 * values.
 *
 * @template T The type of the chunks in the source stream.
 * @param predicate A predicate function.
 * @returns A TransformStream that emits first count chunks.
 *
 * @example
 * ```ts
 * import { takeWhile } from "@milly/streams/transform/take-while";
 * import { from } from "@milly/streams/readable/from";
 * import { assertEquals } from "@std/assert";
 *
 * const source = from([1, 2, 0, 3, 4]);
 * const output = source.pipeThrough(takeWhile(Boolean));
 * const result = await Array.fromAsync(output);
 * assertEquals(result, [1, 2]);
 * ```
 */
export function takeWhile<T>(
  predicate: BooleanConstructor,
  options?: { inclusive?: false },
): TransformStream<T, Exclude<T, Falsy>>;
/**
 * Returns a {@linkcode TransformStream} that emits values while `predicate`
 * holds true.
 *
 * @template T The type of the chunks in the source stream.
 * @param predicate A predicate function.
 * @param options Option parameters object.
 * @returns A TransformStream that emits values while `predicate` holds true.
 *
 * @example
 * ```ts
 * import { takeWhile } from "@milly/streams/transform/take-while";
 * import { from } from "@milly/streams/readable/from";
 * import { assertEquals } from "@std/assert";
 *
 * const source = from([1, 2, 3, 2, 0]);
 * const output = source.pipeThrough(takeWhile((value) => value <= 2));
 * const result = await Array.fromAsync(output);
 * assertEquals(result, [1, 2]);
 * ```
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
