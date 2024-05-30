/**
 * Provides {@link mergeWith}.
 *
 * @module
 */

import type { StreamSource } from "../types.ts";
import { toReadableStream } from "../_internal/to_readable_stream.ts";
import { mergeAll } from "../transformer/merge_all.ts";

/**
 * Creates a {@linkcode ReadableStream} that merges and emits all higher-order
 * ReadableStream values.
 *
 * @example
 * ```ts
 * import { mergeWith } from "@milly/streams/readable/merge-with";
 * import { map } from "@milly/streams/transformer/map";
 * import { pipe } from "@milly/streams/transformer/pipe";
 * import { take } from "@milly/streams/transformer/take";
 * import { timer } from "@milly/streams/readable/timer";
 *
 * // input[0] : 1 --300ms--------------> 1 --300ms------------> 1
 * // input[1] : 2 --200ms-----> 2 --200ms-----> 2 --200ms-----> 2
 * // input[2] : ----500ms----------------------------> 3 --200ms-----> 3
 * // output   : 1 2 ----------> 2 -----> 1 ---> 2 ---> 3 -----> 1 2 -> 3
 * const output = mergeWith([
 *   timer(0, 300).pipeThrough(pipe(take(3), map(() => 1))),
 *   timer(0, 200).pipeThrough(pipe(take(4), map(() => 2))),
 *   timer(500, 200).pipeThrough(pipe(take(2), map(() => 3))),
 * ]);
 * const result = await Array.fromAsync(output);
 * console.log(result); // [1, 2, 2, 1, 2, 3, 1, 2, 3]
 * ```
 *
 * @template T The resolved element type of the input.
 * @param inputs An AsyncIterable or Iterable whose values are higher-order ReadableStream.
 * @returns A TransformStream that emits each higher-order ReadableStream values.
 */
export function mergeWith<T>(
  inputs: StreamSource<StreamSource<T>>,
): ReadableStream<T> {
  return toReadableStream(inputs).pipeThrough(mergeAll());
}
