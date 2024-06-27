/**
 * Provides {@link from}.
 *
 * @module
 */

import type { StreamSource } from "../types.ts";
import { getIterator, iteratorNext } from "../internal/iterator.ts";

const NOOP = () => {};

/**
 * Creates a {@linkcode ReadableStream} that emits the resolved element values
 * of the input which is an {@linkcode AsyncIterable} or {@linkcode Iterable}.
 *
 * Like experimental feature {@linkcode https://developer.mozilla.org/docs/Web/API/ReadableStream/from_static | ReadableStream.from()}
 *
 * @example
 * ```ts
 * import { from } from "@milly/streams/readable/from";
 *
 * const output = from([3, Promise.resolve(8), 42]);
 * const result = await Array.fromAsync(output);
 * console.log(result); // [3, 8, 42]
 * ```
 *
 * @template T The resolved element type of the input.
 * @param input An AsyncIterable or Iterable whose values will be emitted.
 * @returns A ReadableStream that emits the resolved element values of the input.
 */
export function from<T>(input: StreamSource<T>): ReadableStream<T> {
  const iterator = getIterator(input);
  let nextPromise: Promise<unknown> = Promise.resolve();
  return new ReadableStream({
    async pull(controller) {
      const res = await (nextPromise = iteratorNext(iterator));
      if (res.done) {
        controller.close();
      } else {
        controller.enqueue(await res.value);
      }
    },
    async cancel(reason) {
      // NOTE: Should not call iterator.return() while iterator.next() is pending.
      await nextPromise.catch(NOOP);
      await iterator.return?.(reason);
    },
  }, { highWaterMark: 0 });
}
