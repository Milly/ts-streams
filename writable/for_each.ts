/**
 * Provides {@link forEach}.
 *
 * @module
 */

import type { WriteFn } from "../types.ts";

/**
 * Creates a {@linkcode WritableStream} that calls `fn` one time for each chunk
 * written.
 *
 * @example
 * ```ts
 * import { forEach } from "@milly/streams/writable/for-each";
 * import { from } from "@milly/streams/readable/from";
 * import { assertEquals } from "@std/assert";
 *
 * const result: unknown[] = [];
 *
 * await from([1, "foo", true])
 *   .pipeTo(forEach((chunk, index) => {
 *     result.push([chunk, index]);
 *   }));
 *
 * assertEquals(result, [
 *   [1, 0],
 *   ["foo", 1],
 *   [true, 2],
 * ]);
 * ```
 *
 * @template T The chunk type.
 * @param fn A function that accepts up to two arguments. It is called one time for each chunk written.
 * @returns A WritableStream that calls `fn` one time for each chunk written.
 */
export function forEach<T>(fn: WriteFn<T>): WritableStream<T> {
  if (typeof fn !== "function") {
    throw new TypeError("'fn' is not a function");
  }
  let index = 0;
  return new WritableStream({
    async write(chunk) {
      await fn(chunk, index++);
    },
  });
}
