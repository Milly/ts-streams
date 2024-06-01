/**
 * Provides {@link defaultWith}.
 *
 * @module
 */

import type { StreamSource } from "../types.ts";
import { toReadableStream } from "../_internal/to_readable_stream.ts";

/**
 * Returns a {@linkcode TransformStream} that emits values from the default
 * stream if the writable side emits no chunks.
 *
 * @example
 * ```ts
 * import { defaultWith } from "@milly/streams/transform/default-with";
 * import { from } from "@milly/streams/readable/from";
 *
 * const source = from([]);
 * const output = source.pipeThrough(defaultWith(() => [42, 123]));
 * const result = await Array.fromAsync(output);
 * console.log(result); // [42, 123]
 * ```
 *
 * @template I The type of chunks from the writable side.
 * @template D The resolved element type of the default value.
 * @param defaultFactory A function called when the writable side stream closed and no chunks were written.
 * @returns A TransformStream that emits the default value if the writable side emits no chunks.
 */
export function defaultWith<I, D = I>(
  defaultFactory: () => StreamSource<D>,
): TransformStream<I, I | D> {
  if (typeof defaultFactory !== "function") {
    throw new TypeError("No defaultFactory function found");
  }

  let hasChunk = false;

  const { readable, writable: output } = new TransformStream<I | D>();
  const { writable, readable: input } = new TransformStream<I>({
    transform(chunk, controller) {
      hasChunk = true;
      controller.enqueue(chunk);
    },
  });
  input.pipeTo(output, { preventClose: true })
    .then(async () => {
      if (hasChunk) {
        await output.close();
      } else {
        let defaultInput: ReadableStream<D>;
        try {
          defaultInput = toReadableStream(defaultFactory());
        } catch (e: unknown) {
          await output.abort(e);
          throw e;
        }
        await defaultInput.pipeTo(output);
      }
    })
    .catch(() => {});

  return { readable, writable };
}
