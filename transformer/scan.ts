/**
 * Returns a {@linkcode TransformStream} that calls the `accumulator` for each
 * chunks from the writable side, and emits each result of the accumulator.
 *
 * Like {@linkcode ./reduce.ts#reduce | reduce}, but emits each result of the
 * accumulator. The return value of the accumulator is provided as an argument
 * in the next call to the accumulator.
 *
 * @example
 * ```ts
 * import { scan } from "@milly/streams/transformer/scan";
 * import { from } from "@milly/streams/readable/from";
 *
 * const source = from([1, 2, 3]);
 * const output = source.pipeThrough(scan(
 *   (prev: number, chunk: number) => prev + chunk
 * ));
 * const result = await Array.fromAsync(output);
 * console.log(result); // [1, 3, 6]
 * ```
 *
 * @template I The type of chunks from the writable side.
 * @template A The type of chunks to the readable side.
 * @param accumulator A function called when each chunk is emitted from the writable side.
 * @returns A TransformStream that emits the accumulated value.
 */
export function scan<I, A = I>(
  accumulator: (previousValue: I | A, value: I, index: number) => A,
): TransformStream<I, I | A>;
/**
 * Returns a {@linkcode TransformStream} that calls the `accumulator` for each
 * chunks from the writable side, and emits each result of the accumulator.
 *
 * Like {@linkcode ./reduce.ts#reduce | reduce}, but emits each result of the
 * accumulator. The return value of the accumulator is provided as an argument
 * in the next call to the accumulator.
 *
 * @example
 * ```ts
 * import { scan } from "@milly/streams/transformer/scan";
 * import { from } from "@milly/streams/readable/from";
 *
 * const source = from([1, 2, 3]);
 * const output = source.pipeThrough(scan(
 *   ((prev: number, chunk: number) => prev + chunk),
 *   10
 * ));
 * const result = await Array.fromAsync(output);
 * console.log(result); // [11, 13, 16]
 * ```
 *
 * @template I The type of chunks from the writable side.
 * @template A The type of chunks to the readable side.
 * @template V The initial value type.
 * @param accumulator A function called when each chunk is emitted from the writable side.
 * @param initialValue The initial value to start the accumulation. The first call to the accumulator provides this value as an argument instead of chunk.
 * @returns A TransformStream that emits the accumulated value.
 */
export function scan<I, A, V = A>(
  accumulator: (previousValue: A | V, value: I, index: number) => A,
  initialValue: V,
): TransformStream<I, A>;
export function scan<I, A, V>(
  accumulator: (previousValue: I | A | V, value: I, index: number) => A,
  ...args: [initialValue?: V]
): TransformStream<I, I | A> {
  if (typeof accumulator !== "function") {
    throw new TypeError("No accumulator function found");
  }
  let index = 0;
  let acc: I | A | V;
  let hasAcc = args.length > 0;
  if (hasAcc) acc = args[0]!;
  return new TransformStream({
    transform(chunk, controller) {
      if (hasAcc) {
        acc = accumulator(acc, chunk, index);
      } else {
        acc = chunk;
        hasAcc = true;
      }
      ++index;
      controller.enqueue(acc);
    },
  });
}
