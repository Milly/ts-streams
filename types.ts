/**
 * Types for {@link https://jsr.io/@milly/streams | @milly/streams}.
 *
 * @module
 */

/**
 * Source values that can be converted to ReadableStream by
 * {@linkcode ./readable/from.ts#from | from}.
 */
export type StreamSource<T> = AsyncIterable<T> | Iterable<T | PromiseLike<T>>;

/**
 * A function type that receives input values and generates output values.
 *
 * @template I The type of the input value.
 * @template O The type of the output value.
 * @param value The current chunk from the source.
 * @param index The index of the current chunk from the source.
 * @returns Generated values.
 */
export type ProjectFn<I, O> = (value: I, index: number) => O;

/**
 * A function type that receives input values.
 *
 * @param value The current chunk from the source.
 * @param index The index of the current chunk from the source.
 */
export type WriteFn<T> = (value: T, index: number) => void;
