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
  } else if (obj instanceof ReadableStream) {
    // NOTE: Webkit does not implement ReadableStream[@@asyncIterator].
    iterator = readableStreamValues(obj);
  } else {
    throw new TypeError("obj is not iterable");
  }
  if (typeof iterator.next !== "function") {
    throw new TypeError("iterator.next() is not a function");
  }
  return iterator;
}

/**
 * Ref: https://streams.spec.whatwg.org/#rs-asynciterator
 */
function readableStreamValues<T>(stream: ReadableStream<T>): AsyncIterator<T> {
  const reader = stream.getReader();
  return {
    async next() {
      try {
        const res = await reader.read();
        if (res.done) {
          reader.releaseLock();
        }
        return res as IteratorResult<T>;
      } catch (e) {
        reader.releaseLock();
        throw e;
      }
    },
    async return(value: unknown) {
      const cancelPromise = reader.cancel(value);
      reader.releaseLock();
      await cancelPromise;
      return { done: true, value };
    },
  };
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
