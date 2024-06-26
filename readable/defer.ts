/**
 * Provides {@link defer}.
 *
 * @module
 */

import type { StreamSource } from "../types.ts";
import { toReadableStream } from "../internal/to_readable_stream.ts";

/**
 * Creates a {@linkcode ReadableStream} that emits the resolved element values
 * of the input factory's return value which is an {@linkcode AsyncIterable}
 * or {@linkcode Iterable}.
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
 *
 * @template T The resolved element type of the input.
 * @param inputFactory A function called when the stream piped.
 * @returns A ReadableStream that emits the resolved element values of the input.
 */
export function defer<T>(
  inputFactory: () => StreamSource<T>,
): ReadableStream<T> {
  if (typeof inputFactory !== "function") {
    throw new TypeError("'inputFactory' is not a function");
  }

  let reader: ReadableStreamDefaultReader<T> | undefined;
  return new ReadableStream<T>({
    async pull(controller) {
      reader ??= toReadableStream(inputFactory()).getReader();
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
    cancel(reason) {
      if (reader) {
        reader.cancel(reason);
        reader.releaseLock();
        reader = undefined;
      }
    },
  }, { highWaterMark: 0 });
}
