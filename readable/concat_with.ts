/**
 * Provides {@link concatWith}.
 *
 * @module
 */

import type { StreamSource } from "../types.ts";
import { toReadableStream } from "../internal/to_readable_stream.ts";
import { concatAll } from "../transform/concat_all.ts";

/**
 * Creates a {@linkcode ReadableStream} that emits each higher-order
 * ReadableStream values in order.
 *
 * @template T The resolved element type of the input.
 * @param inputs An AsyncIterable or Iterable whose values are higher-order ReadableStream.
 * @returns A TransformStream that emits each higher-order ReadableStream values.
 *
 * @example
 * ```ts
 * import { concatWith } from "@milly/streams/readable/concat-with";
 * import { from } from "@milly/streams/readable/from";
 * import { assertEquals } from "@std/assert";
 *
 * const output = concatWith([
 *   [3, 5],
 *   [Promise.resolve(9)],
 *   from([10, 20, 30]),
 * ]);
 * const result = await Array.fromAsync(output);
 * assertEquals(result, [3, 5, 9, 10, 20, 30]);
 * ```
 */
export function concatWith<T>(
  inputs: StreamSource<StreamSource<T>>,
): ReadableStream<T> {
  return toReadableStream(inputs).pipeThrough(concatAll());
}
