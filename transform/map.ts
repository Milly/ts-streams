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
 * @example
 * ```ts
 * import { map } from "@milly/streams/transform/map";
 * import { from } from "@milly/streams/readable/from";
 *
 * const source = from([1, 2, 3]);
 * const output = source.pipeThrough(map((v) => v * 2));
 * const result = await Array.fromAsync(output);
 * console.log(result); // [2, 4, 6]
 * ```
 *
 * @template I The type of chunks from the writable side.
 * @template O The type of chunks to the readable side.
 * @param project A function that accepts up to two arguments. It is called one time for each chunk from the writable side.
 * @returns A `TransformStream` that emits mapped chunks.
 */
export function map<I, O>(
  project: ProjectFn<I, O>,
): TransformStream<I, Awaited<O>> {
  if (typeof project !== "function") {
    throw new TypeError("No project function found");
  }
  let index = -1;
  return new TransformStream({
    async transform(chunk, controller) {
      controller.enqueue(await project(chunk, ++index));
    },
  });
}
