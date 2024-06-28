/**
 * Provides {@link mergeMap}.
 *
 * @module
 */

import type { ProjectFn, StreamSource } from "../types.ts";
import { toReadableStream } from "../internal/to_readable_stream.ts";

/**
 * Returns a {@linkcode TransformStream} that projects each source value to
 * a {@linkcode ReadableStream} which is merged into the output ReadableStream.
 *
 * @template I The type of the chunks in the source stream.
 * @template O The type of the chunks in the transformed stream.
 * @param project A function that accepts up to two arguments. It is called one
 *     time for each chunk from the writable side.
 * @param options.concurrent Number of projects to read in parallel.
 *     Default is `Infinity`.
 * @returns A TransformStream that projects each source value into
 *     a ReadableStream and merges it into the output.
 *
 * @example
 * ```ts
 * import { mergeMap } from "@milly/streams/transform/merge-map";
 * import { timer } from "@milly/streams/readable/timer";
 * import { map } from "@milly/streams/transform/map";
 * import { pipe } from "@milly/streams/transform/pipe";
 * import { take } from "@milly/streams/transform/take";
 *
 * // source     : 0 -300ms------> 1 -300ms------> 2 |
 * // project[0] : 0 -200ms-> 0 -200ms-> 0 |
 * // project[1] :                 1 -200ms-> 1 -200ms-> 1 |
 * // project[2] :                                 2 -200ms-> 2 -200ms-> 2 |
 * // output     : 0 -------> 0 -> 1 --> 0 -> 1 -> 2 --> 1 -> 2 -------> 2 |
 * const source = timer(0, 300).pipeThrough(take(3));
 * const output = source.pipeThrough(mergeMap((value) =>
 *   timer(0, 200).pipeThrough(pipe(
 *     take(3),
 *     map(() => value),
 *   ))
 * ));
 * const result = await Array.fromAsync(output);
 * console.log(result); // [0, 0, 1, 0, 1, 2, 1, 2, 2]
 * ```
 */
export function mergeMap<I, O>(
  project: ProjectFn<I, StreamSource<O>>,
  options?: {
    concurrent?: number;
  },
): TransformStream<I, O> {
  if (typeof project !== "function") {
    throw new TypeError("'project' is not a function");
  }
  const { concurrent = Infinity } = options ?? {};

  const aborter = new AbortController();
  const { signal } = aborter;
  let buffer: I[] = [];
  let streamIndex = 0;
  let streamCount = 0;
  let writableClosed = false;

  const dispose = () => {
    // deno-lint-ignore no-explicit-any
    readableController = writableController = buffer = null as any;
  };

  const abort = (reason: unknown) => {
    aborter.abort(reason);
    writableController?.error(reason);
    readableController?.error(reason);
    dispose();
  };

  const flush = () => {
    if (writableClosed && streamCount === 0) {
      readableController.close();
      dispose();
    }
  };

  const activate = async (value: I) => {
    ++streamCount;
    try {
      await toReadableStream(project(value, streamIndex++)).pipeTo(
        new WritableStream({
          write(chunk) {
            readableController.enqueue(chunk);
          },
        }),
        { signal },
      );
      --streamCount;
      const next = buffer.shift();
      if (next) {
        activate(next);
      } else {
        flush();
      }
    } catch (e: unknown) {
      abort(e);
    }
  };

  let readableController: ReadableStreamDefaultController;
  const readable = new ReadableStream({
    start(controller) {
      readableController = controller;
    },
    cancel(reason) {
      abort(reason);
    },
  }, { highWaterMark: 0 });

  let writableController: WritableStreamDefaultController;
  const writable = new WritableStream({
    start(controller) {
      writableController = controller;
    },
    write(chunk) {
      if (streamCount < concurrent) {
        activate(chunk);
      } else {
        buffer.push(chunk);
      }
    },
    close() {
      writableClosed = true;
      flush();
    },
    abort(reason) {
      abort(reason);
    },
  });

  return { readable, writable };
}
