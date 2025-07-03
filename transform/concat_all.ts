/**
 * Provides {@link concatAll}.
 *
 * @module
 */

import { identity } from "../internal/identity.ts";
import type { StreamSource } from "../types.ts";
import { mergeMap } from "./merge_map.ts";

/**
 * Returns a {@linkcode TransformStream} that converts a higher-order
 * {@linkcode ReadableStream} into a first-order ReadableStream by
 * concatenating the inner ReadableStreams in order.
 *
 * Like {@linkcode Array.prototype.flat()} with `depth` to 1.
 *
 * @template T The type of the chunks in the source stream.
 * @returns A TransformStream that emits each higher-order ReadableStream values.
 *
 * @example
 * ```ts
 * import { concatAll } from "@milly/streams/transform/concat-all";
 * import { from } from "@milly/streams/readable/from";
 * import { assertEquals } from "@std/assert";
 *
 * const source = from([
 *   [3, 5],
 *   from([10, 20, 30]),
 *   [Promise.resolve("foo")],
 * ]);
 * const output = source.pipeThrough(concatAll());
 * const result = await Array.fromAsync(output);
 * assertEquals(result, [3, 5, 10, 20, 30, "foo"]);
 * ```
 */
export function concatAll<T>(): TransformStream<StreamSource<T>, T> {
  return mergeMap(identity, { concurrent: 1 });
}
