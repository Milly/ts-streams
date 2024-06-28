/**
 * Provides {@link transform}.
 *
 * @module
 */

import type { StreamSource } from "@milly/streams/types";
import { toReadableStream } from "../internal/to_readable_stream.ts";

const NOOP = () => {};

/**
 * Returns a {@linkcode TransformStream} that transforms the source stream into
 * another {@linkcode ReadableStream}.
 *
 * The `source` stream is not automatically closed, that is the developer's
 * responsibility.
 *
 * @template I The type of the chunks in the source stream.
 * @template O The type of the chunks in the transformed stream.
 * @param transformer A function to transform stream.
 * @returns A {@linkcode TransformStream} that transforms the source stream by
 *     the `transformer`.
 *
 * @example
 * ```ts
 * import { transform } from "@milly/streams/transform/transform";
 * import { from } from "@milly/streams/readable/from";
 *
 * const output = from([1, 2, 3])
 *   .pipeThrough(transform(async function* (source) {
 *     for await (const chunk of source) {
 *       yield chunk * 10;
 *     }
 *   }));
 * const result = await Array.fromAsync(output);
 * console.log(result); // [10, 20, 30]
 * ```
 */
export function transform<I, O>(
  transformer: (source: ReadableStream<I>) => StreamSource<O>,
): TransformStream<I, O> {
  if (typeof transformer !== "function") {
    throw new TypeError("'transformer' is not a function");
  }
  const input = new TransformStream<I, I>({}, {}, { highWaterMark: 0 });
  const output = new TransformStream<O, O>({}, {}, { highWaterMark: 0 });
  toReadableStream(transformer(input.readable))
    .pipeTo(output.writable)
    .catch(NOOP);
  return {
    readable: output.readable,
    writable: input.writable,
  };
}
