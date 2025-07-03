/**
 * Provides {@link scan}.
 *
 * @module
 */

import type { AccumulateFn } from "../types.ts";

/**
 * Returns a {@linkcode TransformStream} that calls the `accumulator` for each
 * chunks from the writable side, and emits each result of the accumulator.
 *
 * Like {@linkcode ./reduce.ts#reduce | reduce}, but emits each result of the
 * accumulator. The return value of the accumulator is provided as an argument
 * in the next call to the accumulator.
 *
 * @template I The type of the chunks in the source stream.
 * @template A The type of the chunks to the readable side.
 * @param accumulator A function called when each chunk is emitted from
 *     the writable side.
 * @returns A TransformStream that emits the accumulated value.
 *
 * @example
 * ```ts
 * import { scan } from "@milly/streams/transform/scan";
 * import { from } from "@milly/streams/readable/from";
 * import { assertEquals } from "@std/assert";
 *
 * const source = from([1, 2, 3]);
 * const output = source.pipeThrough(scan(
 *   (prev: number, chunk: number) => prev + chunk
 * ));
 * const result = await Array.fromAsync(output);
 * assertEquals(result, [1, 3, 6]);
 * ```
 */
export function scan<I, A = I>(
  accumulator: AccumulateFn<I, A, I | Awaited<A>>,
): TransformStream<I | Promise<I>, I | Awaited<A>>;
/**
 * Returns a {@linkcode TransformStream} that calls the `accumulator` for each
 * chunks from the writable side, and emits each result of the accumulator.
 *
 * Like {@linkcode ./reduce.ts#reduce | reduce}, but emits each result of the
 * accumulator. The return value of the accumulator is provided as an argument
 * in the next call to the accumulator.
 *
 * @template I The type of the chunks in the source stream.
 * @template A The type of the chunks to the readable side.
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
 * import { scan } from "@milly/streams/transform/scan";
 * import { from } from "@milly/streams/readable/from";
 * import { assertEquals } from "@std/assert";
 *
 * const source = from([1, 2, 3]);
 * const output = source.pipeThrough(scan(
 *   ((prev: number, chunk: number) => prev + chunk),
 *   10
 * ));
 * const result = await Array.fromAsync(output);
 * assertEquals(result, [11, 13, 16]);
 * ```
 */
export function scan<I, A, V = A>(
  accumulator: AccumulateFn<I, A, Awaited<A | V>>,
  initialValue: V,
): TransformStream<I | Promise<I>, Awaited<A>>;
export function scan<I, A, V>(
  accumulator: AccumulateFn<I, A, I | Awaited<A | V>>,
  ...args: [initialValue?: V]
): TransformStream<I | Promise<I>, I | Awaited<A>> {
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
    async transform(chunk, controller) {
      if (hasAcc) {
        acc = await accumulator(acc, await chunk, index);
      } else {
        acc = await chunk;
        hasAcc = true;
      }
      ++index;
      controller.enqueue(acc);
    },
  });
}
