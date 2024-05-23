import { reduce } from "./reduce.ts";

/**
 * Returns a {@linkcode TransformStream} that counts the number of chunks from
 * the writable side.
 *
 * @example
 * ```ts
 * import { count } from "@milly/streams/transformer/count";
 * import { from } from "@milly/streams/readable/from";
 *
 * const source = from(["a", "b", "c", "d"]);
 * const output = source.pipeThrough(count());
 * const result = await Array.fromAsync(output);
 * console.log(result); // [4]
 * ```
 *
 * @returns A TransformStream that emits count of chunks.
 */
export function count(): TransformStream<unknown, number> {
  return reduce((total) => total + 1, 0);
}
