/**
 * Provides {@link reduce}.
 *
 * @module
 */

import type { AccumulateFn } from "../types.ts";

/**
 * Returns a {@linkcode TransformStream} that calls the `accumulator` for each
 * chunks from the writable side, and emits the accumulator result when the
 * writable side closes.
 *
 * The return value of the accumulator is provided as an argument in the next
 * call to the accumulator. Like {@linkcode Array.prototype.reduce()}.
 *
 * @template I The type of the chunks in the source stream.
 * @template A The type of the accumulator result.
 * @param accumulator A function called when each chunk is emitted from
 *     the writable side.
 * @returns A TransformStream that emits the accumulated value.
 *
 * @example
 * ```ts
 * import { reduce } from "@milly/streams/transform/reduce";
 * import { from } from "@milly/streams/readable/from";
 *
 * const source = from([1, 2, 3]);
 * const output = source.pipeThrough(reduce(
 *   (prev: number, chunk: number) => prev + chunk
 * ));
 * const result = await Array.fromAsync(output);
 * console.log(result); // [6]
 * ```
 */
export function reduce<I, A = I>(
  accumulator: AccumulateFn<I, A, I | Awaited<A>>,
): TransformStream<I | Promise<I>, I | Awaited<A>>;
/**
 * Returns a {@linkcode TransformStream} that calls the `accumulator` for each
 * chunks from the writable side, and emits the accumulator result when the
 * writable side closes.
 *
 * The return value of the accumulator is provided as an argument in the next
 * call to the accumulator. Like {@linkcode Array.prototype.reduce()}.
 *
 * @template I The type of the chunks in the source stream.
 * @template A The type of the accumulator result.
 * @template V The initial value type.
 * @param accumulator A function called when each chunk is emitted from
 *     the writable side.
 * @param initialValue The initial value to start the accumulation.
 *     The first call to the accumulator provides this value as an argument
 *     instead of chunk.
 * @returns A TransformStream that emits the accumulated value.
 *
 * @example
 * ```ts
 * import { reduce } from "@milly/streams/transform/reduce";
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
 */
export function reduce<I, A, V = A>(
  accumulator: AccumulateFn<I, A, Awaited<A | V>>,
  initialValue: V,
): TransformStream<I | Promise<I>, Awaited<A | V>>;
export function reduce<I, A, V>(
  accumulator: AccumulateFn<I, A, I | Awaited<A | V>>,
  ...args: [initialValue?: V]
): TransformStream<I | Promise<I>, I | Awaited<A | V>> {
  if (typeof accumulator !== "function") {
    throw new TypeError("'accumulator' is not a function");
  }
  let index = 0;
  let acc: I | Awaited<A | V>;
  let hasAcc = args.length > 0;
  return new TransformStream({
    async start() {
      if (hasAcc) acc = await args[0]!;
    },
    async transform(chunk) {
      if (hasAcc) {
        acc = await accumulator(acc, await chunk, index);
      } else {
        acc = await chunk;
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
