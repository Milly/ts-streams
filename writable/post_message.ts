/**
 * Provides {@link postMessage}.
 *
 * @module
 */

/** Message target type for {@linkcode postMessage}. */
// deno-lint-ignore no-explicit-any
export interface PostMessageTarget<T = any> {
  postMessage(message: T, transfer?: Transferable[]): void;
}

/**
 * Represents options for {@linkcode postMessage}.
 *
 * @template T The message data type.
 */
export interface PostMessageOptions<T> {
  /**
   * Returns an array of {@link https://developer.mozilla.org/docs/Web/API/Web_Workers_API/Transferable_objects | Transferable objects}.
   *
   * A function that accepts up to two arguments. It is called one time for
   * each chunk written.
   *
   * @param chunk A chunk data.
   * @param index The index of the current chunk.
   * @returns A converted value.
   */
  transfer?(chunk: T, index: number): Transferable[];
}

/**
 * Creates a {@linkcode WritableStream} that posts data as a message to the
 * specified message target.
 *
 * If a `transfer` function is specified, its return value will be posted as
 * transferables.
 *
 * @example
 * ```ts
 * import { postMessage } from "@milly/streams/writable/post-message";
 * import { from } from "@milly/streams/readable/from";
 * import { delay } from "@std/async/delay";
 * import { assertEquals } from "@std/assert";
 *
 * const { port1, port2 } = new MessageChannel();
 * const result: unknown[] = [];
 * port2.onmessage = (evt) => {
 *   result.push(evt.data);
 * };
 * await from([1, "foo", true]).pipeTo(postMessage(port1));
 * port1.close();
 * await delay(0); // onmessage will be called next tick.
 * assertEquals(result, [1, "foo", true]);
 * port2.close();
 * ```
 *
 * @template T The message data type.
 * @param target The DOM EventTarget.
 * @param options Option parameters object.
 * @returns A WritableStream that posts data as a message to the specified message target.
 */
export function postMessage<T>(
  target: PostMessageTarget<T>,
  options?: PostMessageOptions<T>,
): WritableStream<T>;
/**
 * Creates a {@linkcode WritableStream} that posts data as a message to the
 * specified message target.
 *
 * If a `transfer` function is specified, its return value will be posted as
 * transferables.
 *
 * @example
 * ```ts
 * import { postMessage } from "@milly/streams/writable/post-message";
 * import { from } from "@milly/streams/readable/from";
 * import { delay } from "@std/async/delay";
 * import { assertEquals } from "@std/assert";
 *
 * const { port1, port2 } = new MessageChannel();
 * const result: unknown[] = [];
 * port2.onmessage = (evt) => {
 *   result.push(evt.data);
 * };
 * await from([1, "foo", true]).pipeTo(postMessage(port1));
 * port1.close();
 * await delay(0); // onmessage will be called next tick.
 * assertEquals(result, [1, "foo", true]);
 * port2.close();
 * ```
 *
 * @template T The message data type.
 * @param target The DOM EventTarget.
 * @param transfer A function that accepts up to two arguments. It is called one time for each chunk written.
 * @returns A WritableStream that posts data as a message to the specified message target.
 */
export function postMessage<T>(
  target: PostMessageTarget<T>,
  transfer: Required<PostMessageOptions<T>>["transfer"],
): WritableStream<T>;
export function postMessage<T>(
  target: PostMessageTarget<T>,
  optionsOrTransfer?:
    | PostMessageOptions<T>
    | Required<PostMessageOptions<T>>["transfer"],
): WritableStream<T> {
  const options = (typeof optionsOrTransfer === "function")
    ? { transfer: optionsOrTransfer }
    : optionsOrTransfer;
  const { transfer } = options ?? {};
  if (transfer !== undefined && typeof transfer !== "function") {
    throw new TypeError("'transfer' is not a function");
  }
  let index = 0;
  return new WritableStream({
    write(chunk) {
      ++index;
      target.postMessage(chunk, transfer?.(chunk, index));
    },
  });
}
