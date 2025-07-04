/**
 * Provides {@link pipe}.
 *
 * @module
 */

/**
 * Returns a {@linkcode TransformStream} that pipes multiple TransformStreams
 * serially.
 *
 * @template I The type of the chunks in the source stream.
 * @template O The type of the chunks in the transformed stream.
 * @param transforms An array of TransformStream piped serially.
 * @returns A piped TransformStream.
 *
 * @example
 * ```ts
 * import { pipe } from "@milly/streams/transform/pipe";
 * import { filter } from "@milly/streams/transform/filter";
 * import { interval } from "@milly/streams/readable/interval";
 * import { map } from "@milly/streams/transform/map";
 * import { take } from "@milly/streams/transform/take";
 * import { assertEquals } from "@std/assert";
 *
 * const source = interval(100);
 * const output = source.pipeThrough(pipe(
 *   filter(value => value % 2 === 1),
 *   take(3),
 *   map(value => value * value),
 * ));
 * const result = await Array.fromAsync(output);
 * assertEquals(result, [1, 9, 25]);
 * ```
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
