/**
 * Provides {@link reduce}.
 *
 * @module
 */

/**
 * Returns a {@linkcode TransformStream} that calls the `accumulator` for each
 * chunks from the writable side, and emits the accumulator result when the
 * writable side closes.
 *
 * The return value of the accumulator is provided as an argument in the next
 * call to the accumulator. Like {@linkcode Array.prototype.reduce()}.
 *
 * @example
 * ```ts
 * import { reduce } from "@milly/streams/transformer/reduce";
 * import { from } from "@milly/streams/readable/from";
 *
 * const source = from([1, 2, 3]);
 * const output = source.pipeThrough(reduce(
 *   (prev: number, chunk: number) => prev + chunk
 * ));
 * const result = await Array.fromAsync(output);
 * console.log(result); // [6]
 * ```
 *
 * @template I The type of chunks from the writable side.
 * @template A The type of the accumulator result.
 * @param accumulator A function called when each chunk is emitted from the writable side.
 * @returns A TransformStream that emits the accumulated value.
 */
export function reduce<I, A = I>(
  accumulator: (previousValue: I | A, value: I, index: number) => A,
): TransformStream<I, I | A>;
/**
 * Returns a {@linkcode TransformStream} that calls the `accumulator` for each
 * chunks from the writable side, and emits the accumulator result when the
 * writable side closes.
 *
 * The return value of the accumulator is provided as an argument in the next
 * call to the accumulator. Like {@linkcode Array.prototype.reduce()}.
 *
 * @example
 * ```ts
 * import { reduce } from "@milly/streams/transformer/reduce";
 * import { from } from "@milly/streams/readable/from";
 *
 * const source = from([1, 2, 3]);
 * const output = source.pipeThrough(reduce(
 *   ((prev: number, chunk: number) => prev + chunk),
 *   10
 * ));
 * const result = await Array.fromAsync(output);
 * console.log(result); // [16]
 * ```
 *
 * @template I The type of chunks from the writable side.
 * @template A The type of the accumulator result.
 * @template V The initial value type.
 * @param accumulator A function called when each chunk is emitted from the writable side.
 * @param initialValue The initial value to start the accumulation. The first call to the accumulator provides this value as an argument instead of chunk.
 * @returns A TransformStream that emits the accumulated value.
 */
export function reduce<I, A, V = A>(
  accumulator: (previousValue: A | V, value: I, index: number) => A,
  initialValue: V,
): TransformStream<I, A | V>;
export function reduce<I, A, V>(
  accumulator: (previousValue: I | A | V, value: I, index: number) => A,
  ...args: [initialValue?: V]
): TransformStream<I, I | A | V> {
  if (typeof accumulator !== "function") {
    throw new TypeError("No accumulator function found");
  }
  let index = 0;
  let acc: I | A | V;
  let hasAcc = args.length > 0;
  if (hasAcc) acc = args[0]!;
  return new TransformStream({
    transform(chunk) {
      if (hasAcc) {
        acc = accumulator(acc, chunk, index);
      } else {
        acc = chunk;
        hasAcc = true;
      }
      ++index;
    },
    flush(controller) {
      if (hasAcc) {
        controller.enqueue(acc);
      }
    },
  });
}
