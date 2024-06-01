/**
 * Provides {@link fromMessage}.
 *
 * @module
 */

/** Message target type for {@linkcode fromMessage}. */
// deno-lint-ignore no-explicit-any
export interface FromMessageTarget<T = any> {
  // deno-lint-ignore no-explicit-any
  onmessage: ((evt: MessageEvent<T>) => any) | null;
}

/**
 * Represents options for {@linkcode fromMessage}.
 *
 * @template T The message data type.
 * @template R The return type of the `predicate`.
 */
export interface FromMessageOptions<T, R> {
  /**
   * If `true`, do not throw an error even if `target.onmessage` is not empty.
   *
   * @default {false}
   */
  force?: boolean;
  /**
   * A function that accepts up to two arguments. It is called one time for
   * each message from the target.
   *
   * @param evt A message event object.
   * @param index The index of the current message from the target.
   * @returns A converted value.
   */
  predicate?(evt: MessageEvent<T>, index: number): R;
}

/**
 * Creates a {@linkcode ReadableStream} that emits data from the given message
 * target.
 *
 * If a `predicate` function is specified, its return value will be emitted
 * in chunks. It is called synchronously from the `target.onmessage` handler.
 *
 * @example
 * ```ts
 * import { fromMessage } from "@milly/streams/readable/from-message";
 * import { take } from "@milly/streams/transform/take";
 *
 * const { port1, port2 } = new MessageChannel();
 * const output = fromMessage(port1).pipeThrough(take(3));
 * port2.postMessage(1);
 * port2.postMessage("foo");
 * port2.postMessage(true);
 * const result = await Array.fromAsync(output);
 * console.log(result); // [1, "foo", true]
 * ```
 *
 * @template T The message data type.
 * @template R The return type of the `predicate`.
 * @param target The DOM EventTarget.
 * @param options Option parameters object.
 * @returns A ReadableStream that emits data from the given message target.
 * @throws TypeError If `target.onmessage` is not empty and `options.force` is not `true`.
 */
export function fromMessage<T, R = T>(
  target: FromMessageTarget<T>,
  options?: FromMessageOptions<T, R>,
): ReadableStream<R>;
/**
 * Creates a {@linkcode ReadableStream} that emits data from the given message
 * target.
 *
 * If a `predicate` function is specified, its return value will be emitted
 * in chunks. It is called synchronously from the `target.onmessage` handler.
 *
 * @example
 * ```ts
 * import { fromMessage } from "@milly/streams/readable/from-message";
 * import { take } from "@milly/streams/transform/take";
 *
 * const { port1, port2 } = new MessageChannel();
 * const output = fromMessage(port1).pipeThrough(take(3));
 * port2.postMessage(1);
 * port2.postMessage("foo");
 * port2.postMessage(true);
 * const result = await Array.fromAsync(output);
 * console.log(result); // [1, "foo", true]
 * ```
 *
 * @template T The message data type.
 * @template R The return type of the `predicate`.
 * @param target The DOM EventTarget.
 * @param predicate A function that accepts up to two arguments. It is called one time for each message from the target.
 * @returns A ReadableStream that emits data from the given message target.
 * @throws TypeError If `target.onmessage` is not empty.
 */
export function fromMessage<T, R>(
  target: FromMessageTarget<T>,
  predicate: Required<FromMessageOptions<T, R>>["predicate"],
): ReadableStream<R>;
export function fromMessage<T, R>(
  target: FromMessageTarget<T>,
  optionsOrPredicate?:
    | FromMessageOptions<T, R>
    | Required<FromMessageOptions<T, R>>["predicate"],
): ReadableStream<T | R> {
  const options = (typeof optionsOrPredicate === "function")
    ? { predicate: optionsOrPredicate }
    : optionsOrPredicate;
  const { force, predicate } = options ?? {};
  if (target.onmessage != null && !force) {
    throw new TypeError("target.onmessage is not empty");
  }
  let index = 0;
  return new ReadableStream({
    start(controller) {
      target.onmessage = (evt) => {
        try {
          ++index;
          const chunk = predicate ? predicate(evt, index) : evt.data;
          controller.enqueue(chunk);
        } catch (e: unknown) {
          target.onmessage = null;
          controller.error(e);
        }
      };
    },
    cancel() {
      target.onmessage = null;
    },
  });
}
