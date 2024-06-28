/**
 * Provides {@link defer}.
 *
 * @module
 */

import type { FactoryFn } from "../types.ts";
import { toReadableStream } from "../internal/to_readable_stream.ts";

/**
 * Creates a {@linkcode ReadableStream} that emits the resolved element values
 * of the input factory's return value which is an {@linkcode AsyncIterable}
 * or {@linkcode Iterable}.
 *
 * @template T The resolved element type of the input.
 * @param inputFactory A function called when the stream piped.
 * @returns A ReadableStream that emits the resolved element values of the input.
 *
 * @example
 * ```ts
 * import { defer } from "@milly/streams/readable/defer";
 *
 * let isFactoryCalled = false;
 * const output = defer(() => {
 *   isFactoryCalled = true;
 *   return Math.random() > 0.5 ? [3, 4, 5] : [Promise.resolve(42)];
 * });
 * console.log(isFactoryCalled); // false
 * const result = await Array.fromAsync(output);
 * console.log(isFactoryCalled); // true
 * console.log(result); // [3, 4, 5] or [42]
 * ```
 */
export function defer<T>(inputFactory: FactoryFn<T>): ReadableStream<T> {
  if (typeof inputFactory !== "function") {
    throw new TypeError("'inputFactory' is not a function");
  }

  let reader: ReadableStreamDefaultReader<T> | undefined;
  return new ReadableStream<T>({
    async pull(controller) {
      reader ??= toReadableStream(await inputFactory()).getReader();
      try {
        const res = await reader.read();
        if (res.done) {
          controller.close();
        } else {
          controller.enqueue(res.value);
        }
      } catch (e: unknown) {
        reader.releaseLock();
        reader = undefined;
        throw e;
      }
    },
    async cancel(reason) {
      if (reader) {
        const cancelPromise = reader.cancel(reason);
        reader.releaseLock();
        reader = undefined;
        await cancelPromise;
      }
    },
  }, { highWaterMark: 0 });
}
