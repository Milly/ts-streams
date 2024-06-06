import type { StreamSource } from "../types.ts";
import { from } from "../readable/from.ts";

/** @internal */
export function toReadableStream<T>(input: StreamSource<T>): ReadableStream<T> {
  return input instanceof ReadableStream ? input : from(input);
}
