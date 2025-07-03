/**
 * Provides {@link write}.
 *
 * @module
 */

/**
 * Writes values to the {@linkcode WritableStream}.
 *
 * If a promise is specified, the resolved value will be written.
 *
 * @template T The type of the chunks in the stream.
 * @param stream The stream to write to.
 * @param values The chunks to write to the stream.
 * @returns A promise that resolves all values has been written to the stream.
 *
 * @example
 * ```ts
 * import { write } from "@milly/streams/util/write";
 * import { assertEquals } from "@std/assert";
 *
 * const result: number[] = [];
 * const stream = new WritableStream<number>({
 *   write(chunk) {
 *     result.push(chunk);
 *   },
 * });
 * await write(stream, 1);
 * await write(stream, 2, 3);
 * await write(stream, Promise.resolve(4));
 * assertEquals(result, [1, 2, 3, 4]);
 * ```
 */
export async function write<T>(
  stream: WritableStream<T>,
  ...values: (T | PromiseLike<T>)[]
): Promise<void> {
  const writer = stream.getWriter();
  try {
    for await (const chunk of values) {
      await writer.write(chunk);
    }
  } finally {
    writer.releaseLock();
  }
}
