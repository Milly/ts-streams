/**
 * Provides {@link buffer}.
 *
 * @module
 */

import { concatWith } from "../readable/concat_with.ts";
import { toReadableStream } from "../_internal/to_readable_stream.ts";
import { map } from "./map.ts";

/**
 * Returns a {@linkcode TransformStream} that buffers chunks from the writable
 * side until `emitter` emits a value.
 *
 * @example
 * ```ts
 * import { buffer } from "@milly/streams/transform/buffer";
 * import { timer } from "@milly/streams/readable/timer";
 * import { take } from "@milly/streams/transform/take";
 *
 * // source  : 0 ----100ms----> 1 ----100ms----> 2 ----100ms------> 3   |
 * // emitter : -----150ms---------> 0      --100ms--> 1   |
 * // output  : -----150ms---------> [0, 1] --100ms--> [2]   -50ms-> [3] |
 * const source = timer(0, 100).pipeThrough(take(4));
 * const emitter = timer(150, 100).pipeThrough(take(2));
 * const output = source.pipeThrough(buffer(emitter));
 * const result = await Array.fromAsync(output);
 * console.log(result); // [[0, 1], [2], [3]]
 * ```
 *
 * @template T The type of chunks.
 * @param emitter The maximum size of the buffer emitted.
 * @returns A TransformStream that emits arrays of buffered chunks.
 */
export function buffer<T>(
  emitter: AsyncIterable<unknown>,
): TransformStream<T, T[]> {
  const CLOSED = {};
  const abortController = new AbortController();
  const { signal } = abortController;
  const writableClosed = Promise.withResolvers<void>();
  let buffer: T[] = [];

  const dispose = () => {
    // deno-lint-ignore no-explicit-any
    buffer = null as any;
  };

  const { readable, writable: flusher } = map((_x) => {
    const chunk = buffer;
    buffer = [];
    return chunk;
  });

  let runner: Promise<void>;
  const writable = new WritableStream({
    start(controller) {
      runner = concatWith([emitter, [writableClosed.promise]])
        .pipeTo(flusher, { signal, preventAbort: true })
        .catch(async (reason) => {
          if (reason === CLOSED) {
            if (buffer.length > 0) {
              await toReadableStream([null]).pipeTo(flusher);
            } else {
              flusher.close();
            }
          } else {
            controller.error(reason);
            await flusher.abort(reason);
          }
        }).finally(dispose);
    },
    write(chunk) {
      buffer.push(chunk);
    },
    async close() {
      abortController.abort(CLOSED);
      writableClosed.resolve();
      await runner;
    },
    async abort(reason) {
      abortController.abort(reason);
      await runner;
    },
  });

  return { readable, writable };
}
