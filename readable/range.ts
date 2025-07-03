/**
 * Provides {@link range}.
 *
 * @module
 */

import { empty } from "./empty.ts";

/**
 * Creates a {@linkcode ReadableStream} that emits a sequence of numbers
 * within specified range.
 *
 * @param [start=0] The value of first integer in the sequence.
 * @param count The number of sequential integers to generate.
 * @returns A ReadableStream that emits a sequence of numbers.
 *
 * @example
 * ```ts
 * import { range } from "@milly/streams/readable/range";
 * import { assertEquals } from "@std/assert";
 *
 * const output = range(8, 5);
 * const result = await Array.fromAsync(output);
 * assertEquals(result, [8, 9, 10, 11, 12]);
 * ```
 */
export function range(count: number): ReadableStream<number>;
export function range(start: number, count: number): ReadableStream<number>;
export function range(start: number, count?: number): ReadableStream<number> {
  if (count == null) {
    count = start;
    start = 0;
  }
  if (count <= 0) return empty();
  const end = start + count;
  let n = start;
  return new ReadableStream({
    pull(controller) {
      while (n < end && controller.desiredSize! > 0) {
        controller.enqueue(n++);
      }
      if (n >= end) {
        controller.close();
      }
    },
  });
}
