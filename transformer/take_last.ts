import { terminate } from "./terminate.ts";

/**
 * Returns a {@linkcode TransformStream} that emits only the last count values.
 *
 * @example
 * ```ts
 * import { takeLast } from "@milly/streams/transformer/take-last";
 * import { from } from "@milly/streams/readable/from";
 *
 * const source = from([1, 2, 3, 4, 5]);
 * const output = source.pipeThrough(takeLast(2));
 * const result = await Array.fromAsync(output);
 * console.log(result); // [4, 5]
 * ```
 *
 * @template T The type of chunks.
 * @param count The number of values to emits.
 * @returns A TransformStream that emits last count chunks.
 */
export function takeLast<T>(count = 1): TransformStream<T, T> {
  if (count <= 0) return terminate();
  let buffer: T[] = [];
  return new TransformStream({
    transform(chunk) {
      buffer.push(chunk);
      if (count < buffer.length) buffer.shift();
    },
    flush(controller) {
      try {
        for (const chunk of buffer) {
          controller.enqueue(chunk);
        }
      } finally {
        // deno-lint-ignore no-explicit-any
        buffer = null as any;
      }
    },
  });
}
