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
 * import { assertEquals } from "@std/assert";
 *
 * let isFactoryCalled = false;
 * const output = defer(function* () {
 *   isFactoryCalled = true;
 *   yield* [3, 4, 5];
 * });
 * assertEquals(isFactoryCalled, false);
 * const result = await Array.fromAsync(output);
 * assertEquals(isFactoryCalled, true);
 * assertEquals(result, [3, 4, 5]);
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
