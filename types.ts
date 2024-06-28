/**
 * Types for {@link https://jsr.io/@milly/streams | @milly/streams}.
 *
 * @module
 */

/**
 * Source values that can be converted to ReadableStream by
 * {@linkcode readable/from/~/from | from}.
 */
export type StreamSource<T> = AsyncIterable<T> | Iterable<T | PromiseLike<T>>;

/**
 * A function type that return value becomes the value of the acc parameter on
 * the next invocation.
 *
 * @template I The type of the chunks in the source stream.
 * @template A The type of the accumulated value.
 * @template P The type of the previous accumulated value.
 * @param acc The value resulting from the previous call to `AccumulateFn`.
 *     On the first call, its value is `initialValue` if specified; otherwise
 *     its value is the first chunk.
 * @param value The current chunk from the source.
 * @param index The index of the current chunk from the source.
 * @returns An accumulated value.
 */
export type AccumulateFn<I, A, P = A> = (acc: P, value: I, index: number) => A;

/**
 * A function type that returns a stream source value.
 *
 * @template T The type of the chunks in the stream source.
 */
export type FactoryFn<T> = () => StreamSource<T> | Promise<StreamSource<T>>;

/**
 * A function type that return `true` to ensure that the value is of type U,
 * and `false` otherwise.
 *
 * @template T The type of the chunks in the source stream.
 * @template U A ensured type.
 * @param value The current chunk from the source.
 * @param index The index of the current chunk from the source.
 * @returns `true` to ensure that the value is of type U, and `false` otherwise.
 */
export type GuardFn<T, U extends T> = (value: T, index: number) => value is U;

/**
 * A function type that return `true` to indicate the value passes the test,
 * and `false` otherwise.
 *
 * @template T The type of the chunks in the source stream.
 * @param value The current chunk from the source.
 * @param index The index of the current chunk from the source.
 * @returns `true` to indicate the value passes the test, and `false` otherwise.
 */
export type PredicateFn<T> = (
  value: T,
  index: number,
) => boolean | Promise<boolean>;

/**
 * A function type that receives input values and generates output values.
 *
 * @template I The type of the chunks in the source stream.
 * @template O The type of the output value.
 * @param value The current chunk from the source.
 * @param index The index of the current chunk from the source.
 * @returns Generated values.
 */
export type ProjectFn<I, O> = (value: I, index: number) => O;

/**
 * A function type that receives input values.
 *
 * @template T The type of the chunks in the source stream.
 * @param value The current chunk from the source.
 * @param index The index of the current chunk from the source.
 */
export type WriteFn<T> = (value: T, index: number) => void | Promise<void>;
