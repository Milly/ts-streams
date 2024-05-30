/**
 * Provides {@link filter}.
 *
 * @module
 */

/**
 * Returns a {@linkcode TransformStream} that filter items by a specified
 * predicate.
 *
 * Like {@linkcode Array.prototype.filter()}.
 *
 * @example
 * ```ts
 * import { filter } from "@milly/streams/transform/filter";
 * import { from } from "@milly/streams/readable/from";
 *
 * const source = from([1, "a", 2, "b", 3, "c"]);
 * const output = source.pipeThrough(
 *   filter((v): v is string => typeof v === "string")
 * );
 * const result = await Array.fromAsync(output);
 * console.log(result); // ["a", "b", "c"]
 * ```
 *
 * @template I The type of chunks from the writable side.
 * @template O The type of chunks to the readable side.
 * @param predicate A predicate function.
 * @returns A TransformStream that emits filtered chunks.
 */
export function filter<I, O extends I>(
  predicate: (value: I, index: number) => value is O,
): TransformStream<I, O>;
/**
 * Returns a {@linkcode TransformStream} that filter items by a specified
 * predicate.
 *
 * Like {@linkcode Array.prototype.filter()}.
 *
 * @example
 * ```ts
 * import { filter } from "@milly/streams/transform/filter";
 * import { from } from "@milly/streams/readable/from";
 *
 * const source = from([1, 2, 3, 4, 5, 6, 7]);
 * const output = source.pipeThrough(filter((v) => v % 2 === 0));
 * const result = await Array.fromAsync(output);
 * console.log(result); // [2, 4, 6]
 * ```
 *
 * @template T The type of chunks.
 * @param predicate A predicate function.
 * @returns A TransformStream that emits filtered chunks.
 */
export function filter<T>(
  predicate: (value: T, index: number) => boolean,
): TransformStream<T, T>;
export function filter<T>(
  predicate: (value: T, index: number) => boolean,
): TransformStream<T, T> {
  let index = -1;
  return new TransformStream({
    transform(chunk, controller) {
      if (predicate(chunk, ++index)) {
        controller.enqueue(chunk);
      }
    },
  });
}
