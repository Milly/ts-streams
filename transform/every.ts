/**
 * Provides {@link every}.
 *
 * @module
 */

import type { PredicateFn } from "../types.ts";
import type { Falsy } from "../internal/types.ts";

/**
 * Returns a {@linkcode TransformStream} that emits whether all chunks from
 * the writable side satisfy the specified `predicate`.
 *
 * Like {@linkcode Array.prototype.every()}.
 *
 * @template T The type of the chunks in the source stream.
 * @param predicate A predicate function.
 * @returns A TransformStream that emits whether all chunks satisfy
 *     the specified `predicate`.
 *
 * @example
 * ```ts
 * import { every } from "@milly/streams/transform/every";
 * import { from } from "@milly/streams/readable/from";
 * import { assertEquals } from "@std/assert";
 *
 * const source = from([2, 4, 6]);
 * const output = source.pipeThrough(every((v) => v % 2 === 0));
 * const result = await Array.fromAsync(output);
 * assertEquals(result, [true]);
 * ```
 */
export function every<T>(
  predicate: PredicateFn<T>,
): TransformStream<T, boolean>;
export function every<T>(
  predicate: BooleanConstructor,
): TransformStream<T, Exclude<T, Falsy> extends never ? false : boolean>;
export function every<T>(
  predicate: PredicateFn<T>,
): TransformStream<T, boolean> {
  if (typeof predicate !== "function") {
    throw new TypeError("'predicate' is not a function");
  }
  let index = -1;
  return new TransformStream({
    async transform(chunk, controller) {
      if (!await predicate(chunk, ++index)) {
        controller.enqueue(false);
        controller.terminate();
      }
    },
    flush(controller) {
      controller.enqueue(true);
    },
  });
}
