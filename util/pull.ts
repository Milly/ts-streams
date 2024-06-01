/**
 * Provides {@link pull}.
 *
 * @module
 */

/**
 * Pulls the next chunk from the {@linkcode ReadableStream}.
 *
 * ```ts
 * import { pull } from "@milly/streams/util/pull";
 * import { from } from "@milly/streams/readable/from";
 *
 * const stream = from([1, 2, 3]);
 *
 * console.log(await pull(stream)); // 1
 * console.log(await pull(stream)); // 2
 * console.log(await pull(stream)); // 3
 * console.log(await pull(stream)); // undefined
 * ```
 *
 * @template T The type of the chunk to read.
 * @param stream The stream to read from.
 * @param defaultValue The value to return if no next value in the stream.
 * @returns A promise that resolves with the next chunk in the stream, or `undefined` if the stream is closed.
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
