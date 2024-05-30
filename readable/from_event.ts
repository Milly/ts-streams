/**
 * Provides {@link fromEvent}.
 *
 * @module
 */

/** Event target type for {@linkcode fromEvent}. */
export interface EventTargetLike<E = Event> {
  addEventListener(
    type: string,
    listener: EventListener<E> | null,
    options?: boolean | AddEventListenerOptions,
  ): void;
  removeEventListener(
    type: string,
    listener: EventListener<E> | null,
    options?: boolean | EventListenerOptions,
  ): void;
}

/**
 * Event listener type for {@linkcode fromEvent}.
 *
 * @template E An event object type.
 */
export interface EventListener<E = Event> {
  /**
   * @param evt An event object.
   */
  (evt: E): void;
}

/** Represents options for {@linkcode fromEvent}. */
export interface FromEventOptions<E, R> extends AddEventListenerOptions {
  /**
   * A function that accepts up to two arguments. It is called one time for
   * each event from the target.
   *
   * @param evt An event object.
   * @param index The index of the current event from the target.
   * @returns A converted value.
   */
  predicate?(evt: E, index: number): R;
}

/**
 * Creates a {@linkcode ReadableStream} that emits events from the given event
 * target.
 *
 * If a `predicate` function is specified, its return value will be emitted
 * in chunks. It is called synchronously from event listeners.
 *
 * @example
 * ```ts
 * import { fromEvent } from "@milly/streams/readable/from-event";
 *
 * const abortController = new AbortController();
 * const { signal } = abortController;
 * setTimeout(() => abortController.abort("foo"), 100);
 *
 * // output : --100ms-> "foo" |
 * const output = fromEvent(signal, "abort", {
 *   predicate: () => signal.reason,
 *   once: true,
 * });
 * const result = await Array.fromAsync(output);
 * console.log(result); // ["foo"]
 * ```
 *
 * @template E The event object type.
 * @template R The return type of the predicate.
 * @param target The DOM EventTarget.
 * @param type The event type.
 * @param options Options to pass through to the underlying `addEventListener`. Default is undefined.
 * @returns A ReadableStream that emits events from the given event target.
 */
export function fromEvent<E, R = E>(
  target: EventTargetLike<E>,
  type: string,
  options?: FromEventOptions<E, R>,
): ReadableStream<R>;
/**
 * Creates a {@linkcode ReadableStream} that emits events from the given event
 * target.
 *
 * If a `predicate` function is specified, its return value will be emitted
 * in chunks. It is called synchronously from event listeners.
 *
 * @example
 * ```ts
 * import { fromEvent } from "@milly/streams/readable/from-event";
 *
 * const abortController = new AbortController();
 * const { signal } = abortController;
 * setTimeout(() => abortController.abort("foo"), 100);
 *
 * // output : --100ms-> "foo" |
 * const output = fromEvent(signal, "abort", () => signal.reason);
 * const result = await Array.fromAsync(output);
 * console.log(result); // ["foo"]
 * ```
 *
 * @template E The event object type.
 * @template R The return type of the predicate.
 * @param target The DOM EventTarget.
 * @param type The event type.
 * @param predicate A function that accepts up to two arguments. It is called one time for each event from the target.
 * @returns A ReadableStream that emits events from the given event target.
 */
export function fromEvent<E, R>(
  target: EventTargetLike<E>,
  type: string,
  predicate: Required<FromEventOptions<E, R>>["predicate"],
): ReadableStream<R>;
export function fromEvent<E, R>(
  target: EventTargetLike<E>,
  type: string,
  optionsOrPredicate?:
    | FromEventOptions<E, R>
    | Required<FromEventOptions<E, R>>["predicate"],
): ReadableStream<E | R> {
  const options = (typeof optionsOrPredicate === "function")
    ? { predicate: optionsOrPredicate }
    : optionsOrPredicate;
  const { once, signal, capture, predicate } = options ?? {};
  let index = 0;
  let teardown: () => void;
  return new ReadableStream({
    start(controller) {
      if (signal?.aborted) {
        controller.error(signal.reason);
        return;
      }

      const listener = (evt: E) => {
        try {
          ++index;
          const chunk = predicate ? predicate(evt, index) : evt;
          controller.enqueue(chunk);
          if (once) {
            teardown();
            controller.close();
          }
        } catch (e: unknown) {
          teardown();
          controller.error(e);
        }
      };
      const signalListener = () => {
        teardown();
        controller.error(signal!.reason);
      };
      teardown = () => {
        target.removeEventListener(type, listener, { capture });
        signal?.removeEventListener(type, signalListener);
      };

      target.addEventListener(
        type,
        listener,
        options as AddEventListenerOptions,
      );
      signal?.addEventListener("abort", signalListener, { once: true });
    },
    cancel() {
      teardown();
    },
  });
}
