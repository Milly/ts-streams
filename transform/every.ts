/**
 * Provides {@link every}.
 *
 * @module
 */

/**
 * Returns a {@linkcode TransformStream} that emits whether all chunks from
 * the writable side satisfy the specified predicate.
 *
 * Like {@linkcode Array.prototype.every()}.
 *
 * @example
 * ```ts
 * import { every } from "@milly/streams/transform/every";
 * import { from } from "@milly/streams/readable/from";
 *
 * const source = from([2, 4, 6]);
 * const output = source.pipeThrough(every((v) => v % 2 === 0));
 * const result = await Array.fromAsync(output);
 * console.log(result); // [true]
 * ```
 *
 * @template T The type of chunks from the writable side.
 * @param predicate A predicate function.
 * @returns A TransformStream that emits whether all chunks satisfy the predicate
 */
export function every<T>(
  predicate: (value: T, index: number) => boolean | Promise<boolean>,
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
