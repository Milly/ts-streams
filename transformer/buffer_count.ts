/**
 * Returns a {@linkcode TransformStream} that buffers a number of chunks from
 * the writable side by `bufferSize` then emits buffered values as an array to
 * the readable side.
 *
 * @example
 * ```ts
 * import { bufferCount } from "@milly/streams/transformer/buffer-count";
 * import { from } from "@milly/streams/readable/from";
 *
 * const source = from([1, 2, 3, 4, 5, 6, 7, 8]);
 * const output = source.pipeThrough(bufferCount(3));
 * const result = await Array.fromAsync(output);
 * console.log(result); // [[1, 2, 3], [4, 5, 6], [7, 8]]
 * ```
 *
 * @template T The type of chunks.
 * @param bufferSize The maximum size of the buffer emitted.
 * @returns A TransformStream that emits arrays of buffered chunks.
 */
export function bufferCount<T>(bufferSize: number): TransformStream<T, T[]> {
  let buffer: T[] = [];
  return new TransformStream(
    {
      transform(chunk, controller) {
        buffer.push(chunk);
        if (bufferSize <= buffer.length) {
          controller.enqueue(buffer);
          buffer = [];
        }
      },
      flush(controller) {
        if (0 < buffer.length) {
          controller.enqueue(buffer);
        }
        // deno-lint-ignore no-explicit-any
        buffer = null as any;
      },
    },
    { highWaterMark: 1 },
    { highWaterMark: 0 },
  );
}
