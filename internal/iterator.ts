/** @internal */
export function isObject(x: unknown): x is object {
  return (typeof x === "object" && x != null) || typeof x === "function";
}

/**
 * Ref: https://tc39.es/ecma262/#sec-getiterator
 * @internal
 */
export function getIterator<T, U>(
  obj: AsyncIterable<T> | Iterable<U>,
): AsyncIterator<T> | Iterator<U> {
  let iterator: AsyncIterator<T> | Iterator<U> | undefined;
  if ((obj as AsyncIterable<T>)[Symbol.asyncIterator] != null) {
    iterator = (obj as AsyncIterable<T>)[Symbol.asyncIterator]();
    if (!isObject(iterator)) {
      throw new TypeError(
        "[Symbol.asyncIterator]() returned a non-object value",
      );
    }
  } else if ((obj as Iterable<U>)[Symbol.iterator] != null) {
    iterator = (obj as Iterable<U>)[Symbol.iterator]();
    if (!isObject(iterator)) {
      throw new TypeError("[Symbol.iterator]() returned a non-object value");
    }
  } else {
    throw new TypeError("obj is not iterable");
  }
  if (typeof iterator.next !== "function") {
    throw new TypeError("iterator.next() is not a function");
  }
  return iterator;
}

/**
 * Ref: https://tc39.es/ecma262/#sec-iteratornext
 * @internal
 */
export async function iteratorNext<T>(
  iterator: AsyncIterator<T> | Iterator<T>,
): Promise<IteratorResult<T>> {
  const res = await iterator.next();
  if (!isObject(res)) {
    throw new TypeError("iterator.next() returned a non-object value");
  }
  return res;
}
