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
 *
 * await from([1, "foo", true])
 *   .pipeTo(forEach((chunk, index) => {
 *     console.log([chunk, index]);
 *   }));
 * // output: [1, 0]
 * // output: ["foo", 1]
 * // output: [true, 2]
 * ```
 *
 * @template T The chunk type.
 * @param fn A function that accepts up to two arguments. It is called one time for each chunk written.
 * @returns A WritableStream that calls `fn` one time for each chunk written.
 */
export function forEach<T>(fn: WriteFn<T>): WritableStream<T> {
  let index = 0;
  return new WritableStream({
    write(chunk) {
      fn(chunk, index++);
    },
  });
}
