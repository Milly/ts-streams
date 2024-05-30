/**
 * Provides {@link pipe}.
 *
 * @module
 */

/**
 * Returns a {@linkcode TransformStream} that pipes multiple TransformStreams
 * serially.
 *
 * @example
 * ```ts
 * import { pipe } from "@milly/streams/transformer/pipe";
 * import { filter } from "@milly/streams/transformer/filter";
 * import { interval } from "@milly/streams/readable/interval";
 * import { map } from "@milly/streams/transformer/map";
 * import { take } from "@milly/streams/transformer/take";
 *
 * const source = interval(100);
 * const output = source.pipeThrough(pipe(
 *   filter(value => value % 2 === 1),
 *   take(3),
 *   map(value => value * value),
 * ));
 * const result = await Array.fromAsync(output);
 * console.log(result); // [1, 9, 25]
 * ```
 *
 * @template I The type of data that the readable side of the TransformStream accepts.
 * @template O The type of data that the TransformStream transforms the input data into.
 * @param {TransformStream[]} transforms An array of TransformStream piped serially.
 * @returns {TransformStream<I, O>} A piped TransformStream.
 */
export function pipe<I, O, T1>(
  ...transforms: [
    TransformStream<I, T1>,
    TransformStream<T1, O>,
  ]
): TransformStream<I, O>;
export function pipe<I, O, T1, T2>(
  ...transforms: [
    TransformStream<I, T1>,
    TransformStream<T1, T2>,
    TransformStream<T2, O>,
  ]
): TransformStream<I, O>;
export function pipe<I, O, T1, T2, T3>(
  ...transforms: [
    TransformStream<I, T1>,
    TransformStream<T1, T2>,
    TransformStream<T2, T3>,
    TransformStream<T3, O>,
  ]
): TransformStream<I, O>;
export function pipe<I, O, T1, T2, T3, T4>(
  ...transforms: [
    TransformStream<I, T1>,
    TransformStream<T1, T2>,
    TransformStream<T2, T3>,
    TransformStream<T3, T4>,
    TransformStream<T4, O>,
  ]
): TransformStream<I, O>;
export function pipe<I, O, T1, T2, T3, T4, T5>(
  ...transforms: [
    TransformStream<I, T1>,
    TransformStream<T1, T2>,
    TransformStream<T2, T3>,
    TransformStream<T3, T4>,
    TransformStream<T4, T5>,
    TransformStream<T5, O>,
  ]
): TransformStream<I, O>;
export function pipe<I, O, T1, T2, T3, T4, T5, T6>(
  ...transforms: [
    TransformStream<I, T1>,
    TransformStream<T1, T2>,
    TransformStream<T2, T3>,
    TransformStream<T3, T4>,
    TransformStream<T4, T5>,
    TransformStream<T5, T6>,
    TransformStream<T6, O>,
  ]
): TransformStream<I, O>;
export function pipe<I, O, T1, T2, T3, T4, T5, T6, T7>(
  ...transforms: [
    TransformStream<I, T1>,
    TransformStream<T1, T2>,
    TransformStream<T2, T3>,
    TransformStream<T3, T4>,
    TransformStream<T4, T5>,
    TransformStream<T5, T6>,
    TransformStream<T6, T7>,
    TransformStream<T7, O>,
  ]
): TransformStream<I, O>;
export function pipe<I, O, T1, T2, T3, T4, T5, T6, T7, T8>(
  ...transforms: [
    TransformStream<I, T1>,
    TransformStream<T1, T2>,
    TransformStream<T2, T3>,
    TransformStream<T3, T4>,
    TransformStream<T4, T5>,
    TransformStream<T5, T6>,
    TransformStream<T6, T7>,
    TransformStream<T7, T8>,
    TransformStream<T8, O>,
  ]
): TransformStream<I, O>;
export function pipe<I, O, T1, T2, T3, T4, T5, T6, T7, T8, T9>(
  ...transforms: [
    TransformStream<I, T1>,
    TransformStream<T1, T2>,
    TransformStream<T2, T3>,
    TransformStream<T3, T4>,
    TransformStream<T4, T5>,
    TransformStream<T5, T6>,
    TransformStream<T6, T7>,
    TransformStream<T7, T8>,
    TransformStream<T8, T9>,
    TransformStream<T9, O>,
  ]
): TransformStream<I, O>;
export function pipe<I, O = I>(
  ...transforms: [
    TransformStream<I, unknown>,
    ...TransformStream<unknown, unknown>[],
    TransformStream<unknown, O>,
  ]
): TransformStream<I, O>;
export function pipe<I, O>(
  ...transforms: TransformStream[]
): TransformStream<I, O> {
  const { writable, readable: first } = transforms.shift()!;
  const readable = transforms.reduce(
    (readable, transform) => readable.pipeThrough(transform),
    first,
  );
  return { writable, readable };
}
