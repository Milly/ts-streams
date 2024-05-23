import type { StreamSource } from "../types.ts";
import { getIterator, iteratorNext } from "../_internal/iterator.ts";

/**
 * Creates a new, shallow-copied {@linkcode Array} instance from an async
 * iterable, iterable, or
 * {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Indexed_collections#working_with_array-like_objects | array-like object}.
 *
 * Like {@linkcode Array.fromAsync()}
 *
 * If the object being iterated is a sync iterable, and an error is thrown
 * while iterating, the `return()` method of the underlying iterator will be
 * called, so the iterator is always closed. This may be different from
 * `Array.fromAsync()`, but may become the same in the future.
 * (see {@link https://github.com/tc39/ecma262/pull/2600 | tc39/ecma262#2600}).
 *
 * ```ts
 * import { arrayFrom } from "@milly/streams/util/array-from";
 * import { from } from "@milly/streams/readable/from";
 *
 * const stream = from([1, 2, 3]);
 * const array = arrayFrom(stream);
 * console.log(array); // [1, 2, 3]
 * ```
 *
 * @template T The type of the chunk to read.
 * @param stream The stream to read from.
 * @param mapFn A function to call on every chunk of the stream, and return value is added to the array instead (after being awaited).
 * @returns A new Promise whose fulfillment value is a new Array instance.
 */
export async function arrayFrom<T, R>(
  stream: StreamSource<T> | ArrayLike<T | Promise<T>>,
  mapFn: (element: T, index: number) => R,
): Promise<R[]>;
export async function arrayFrom<T>(
  stream: StreamSource<T> | ArrayLike<T | Promise<T>>,
): Promise<T[]>;
export async function arrayFrom<T, R>(
  stream: StreamSource<T> | ArrayLike<T | Promise<T>>,
  mapFn?: (element: T, index: number) => R,
): Promise<(T | R)[]> {
  let iterator: AsyncIterator<T> | Iterator<T | PromiseLike<T>>;
  try {
    iterator = getIterator(stream as AsyncIterable<T>);
  } catch {
    iterator = Array.from(stream as ArrayLike<T>)[Symbol.iterator]();
  }
  const buf: (T | R)[] = [];
  let index = 0;
  try {
    for (;;) {
      const res = await iteratorNext(iterator);
      if (res.done) {
        return buf;
      }
      let value: T | R = await res.value;
      if (mapFn) {
        value = await mapFn(value, index++);
      }
      buf.push(value);
    }
  } finally {
    iterator.return?.();
  }
}
