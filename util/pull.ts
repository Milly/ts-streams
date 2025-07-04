/**
 * Provides {@link pull}.
 *
 * @module
 */

/**
 * Pulls the next chunk from the {@linkcode ReadableStream}.
 *
 * @template T The type of the chunks in the stream.
 * @param stream The stream to read from.
 * @param defaultValue The value to return if no next value in the stream.
 * @returns A promise that resolves with the next chunk in the stream, or
 *     `undefined` if the stream is closed.
 *
 * @example
 * ```ts
 * import { pull } from "@milly/streams/util/pull";
 * import { from } from "@milly/streams/readable/from";
 * import { assertEquals } from "@std/assert";
 *
 * const stream = from([1, 2, 3]);
 *
 * assertEquals(await pull(stream), 1);
 * assertEquals(await pull(stream), 2);
 * assertEquals(await pull(stream), 3);
 * assertEquals(await pull(stream), undefined);
 * ```
 */
export async function pull<T, D>(
  stream: ReadableStream<T>,
  defaultValue: D,
): Promise<T | D>;
export async function pull<T>(
  stream: ReadableStream<T>,
): Promise<T | undefined>;
export async function pull<T, D = undefined>(
  stream: ReadableStream<T>,
  defaultValue?: D,
): Promise<T | D | undefined> {
  const reader = stream.getReader();
  try {
    const result = await reader.read();
    return result.done ? defaultValue : result.value;
  } finally {
    reader.releaseLock();
  }
}
