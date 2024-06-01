/**
 * Provides {@link concatWith}.
 *
 * @module
 */

import type { StreamSource } from "../types.ts";
import { toReadableStream } from "../_internal/to_readable_stream.ts";
import { concatAll } from "../transform/concat_all.ts";

/**
 * Creates a {@linkcode ReadableStream} that emits each higher-order
 * ReadableStream values in order.
 *
 * @example
 * ```ts
 * import { concatWith } from "@milly/streams/readable/concat-with";
 * import { from } from "@milly/streams/readable/from";
 *
 * const output = concatWith([
 *   [3, 5],
 *   [Promise.resolve(9)],
 *   from([10, 20, 30]),
 * ]);
 * const result = await Array.fromAsync(output);
 * console.log(result); // [3, 5, 9, 10, 20, 30]
 * ```
 *
 * @template T The resolved element type of the input.
 * @param inputs An AsyncIterable or Iterable whose values are higher-order ReadableStream.
 * @returns A TransformStream that emits each higher-order ReadableStream values.
 */
export function concatWith<T>(
  inputs: StreamSource<StreamSource<T>>,
): ReadableStream<T> {
  return toReadableStream(inputs).pipeThrough(concatAll());
}
