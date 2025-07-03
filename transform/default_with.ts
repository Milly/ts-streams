/**
 * Provides {@link defaultWith}.
 *
 * @module
 */

import type { FactoryFn } from "../types.ts";
import { toReadableStream } from "../internal/to_readable_stream.ts";

/**
 * Returns a {@linkcode TransformStream} that emits values from the default
 * stream if the writable side emits no chunks.
 *
 * @template I The type of the chunks in the source stream.
 * @template D The resolved element type of the default value.
 * @param defaultFactory A function called when the writable side stream closed
 *     and no chunks were written.
 * @returns A TransformStream that emits the default value if the writable side
 *     emits no chunks.
 *
 * @example
 * ```ts
 * import { defaultWith } from "@milly/streams/transform/default-with";
 * import { from } from "@milly/streams/readable/from";
 * import { assertEquals } from "@std/assert";
 *
 * const source = from([]);
 * const output = source.pipeThrough(defaultWith(() => [42, 123]));
 * const result = await Array.fromAsync(output);
 * assertEquals(result, [42, 123]);
 * ```
 */
export function defaultWith<I, D = I>(
  defaultFactory: FactoryFn<D>,
): TransformStream<I, I | D> {
  if (typeof defaultFactory !== "function") {
    throw new TypeError("'defaultFactory' is not a function");
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
          defaultInput = toReadableStream(await defaultFactory());
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
