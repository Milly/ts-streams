/**
 * Provides {@link map}.
 *
 * @module
 */

import type { ProjectFn } from "../types.ts";

/**
 * Returns a {@linkcode TransformStream} that transforms the chunk value from
 * the writable side with the `project` function and emit it to the readable
 * side.
 *
 * Like {@linkcode Array.prototype.map()}.
 *
 * If `project` function returns a Promise, the resolved value is emitted to
 * the readable side. The next time `project` is called is after the previous
 * value has been resolved.
 *
 * @template I The type of the chunks in the source stream.
 * @template O The type of the chunks in the transformed stream.
 * @param project A function that accepts up to two arguments. It is called
 *     one time for each chunk from the writable side.
 * @returns A `TransformStream` that emits mapped chunks.
 *
 * @example
 * ```ts
 * import { map } from "@milly/streams/transform/map";
 * import { from } from "@milly/streams/readable/from";
 * import { assertEquals } from "@std/assert";
 *
 * const source = from([1, 2, 3]);
 * const output = source.pipeThrough(map((v) => v * 2));
 * const result = await Array.fromAsync(output);
 * assertEquals(result, [2, 4, 6]);
 * ```
 */
export function map<I, O>(
  project: ProjectFn<I, O>,
): TransformStream<I, Awaited<O>> {
  if (typeof project !== "function") {
    throw new TypeError("'project' is not a function");
  }
  let index = -1;
  return new TransformStream({
    async transform(chunk, controller) {
      controller.enqueue(await project(chunk, ++index));
    },
  });
}
