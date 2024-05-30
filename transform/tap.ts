/**
 * Provides {@link tap}.
 *
 * @module
 */

/**
 * Represents callback functions that are called when a stream event occurs in
 * the `tap` method.
 */
export interface TapCallbacks<T> {
  /**
   * Called when the writable side is aborted.
   * @param reason A string describing why the stream was aborted.
   */
  abortWritable?(reason: unknown): void;

  /**
   * Called when the readable side is cancelled.
   * @param reason A string describing why the stream was cancelled.
   */
  cancelReadable?(reason: unknown): void;

  /**
   * Called when the writable side is closed.
   */
  closeWritable?(): void;

  /**
   * Called after `abortWritable` or `cancelReadable` is called, or when
   * `pull` or `write` throw an exception.
   *
   * @param reason A string describing why the stream was aborted.
   */
  error?(reason: unknown): void;

  /**
   * Called when the stream has completed or terminated with an error.
   */
  finalize?(): void;

  /**
   * Called repeatedly when there is space available in the queue of the
   * readable side.
   */
  pull?(controller: TapController): void;

  /**
   * Called when a value is written to the writable side.
   */
  write?(chunk: T, controller: TapController): void;
}

// deno-lint-ignore no-explicit-any
export interface TapOptions<T = any> {
  writableStrategy?: QueuingStrategy<T>;
  readableStrategy?: QueuingStrategy<T>;
}

/**
 * Represents a controller that can retrieve the state of
 * a {@linkcode ReadableStream} / {@linkcode WritableStream}.
 *
 * This appears in the argument of the {@linkcode TapCallbacks.pull} or
 * {@linkcode TapCallbacks.write} method.
 */
export interface TapController {
  /**
   * The desired size of the queue on the readable side.
   */
  readonly desiredSize: number | null;

  /**
   * The index number of the last chunk written to the writable side.
   * If no chunk has been written, it will be a negative value.
   */
  readonly index: number;
}

/**
 * Returns a {@linkcode TransformStream} that is used to perform side effects
 * on various events from the writable or the readable side.
 *
 * @example
 * ```ts
 * import { tap } from "@milly/streams/transform/tap";
 * import { from } from "@milly/streams/readable/from";
 * import { map } from "@milly/streams/transform/map";
 * import { pipe } from "@milly/streams/transform/pipe";
 *
 * const source = from([1, 2, 3]);
 * const output = source.pipeThrough(pipe(
 *   tap((value) => console.log(value)), // It has no effect on stream.
 *   map((value) => value * 2),
 * ));
 * const result = await Array.fromAsync(output);
 * // 1
 * // 2
 * // 3
 * console.log(result); // [2, 4, 6]
 * ```
 *
 * @template T The type of chunks.
 * @param write A predicate function.
 * @returns A TransformStream that emits source chunks.
 */
export function tap<T>(
  callbacksAndOptions: TapCallbacks<T> & TapOptions<T>,
): TransformStream<T, T>;
export function tap<T>(
  callbackWriteFn: Required<TapCallbacks<T>>["write"],
  options?: TapOptions<T>,
): TransformStream<T, T>;
export function tap<T>(
  callbacksOrWriteFn:
    | TapCallbacks<T>
    | Required<TapCallbacks<T>>["write"],
  maybeOptions?: TapOptions<T>,
): TransformStream<T, T> {
  const callbacks: TapCallbacks<T> = typeof callbacksOrWriteFn === "function"
    ? { write: callbacksOrWriteFn.bind(undefined) }
    : callbacksOrWriteFn;
  const options = maybeOptions ?? callbacks as TapOptions<T>;
  let index = -1;
  let aborted = false;

  const tapController = Object.freeze<TapController>({
    get desiredSize(): number | null {
      return aborted ? null : readableController.desiredSize;
    },
    get index(): number {
      return index;
    },
  });

  const dispose = () => {
    // deno-lint-ignore no-explicit-any
    readableReady = readableController = writableController = null as any;
    callbacks.finalize?.();
  };

  const abort = (reason: unknown) => {
    try {
      callbacks.error?.(reason);
    } finally {
      aborted = true;
      readableController.error(reason);
      writableController.error(reason);
      readableReady.promise.catch(() => {});
      readableReady.reject(reason);
      dispose();
    }
  };

  let readableReady = Promise.withResolvers<void>();
  let readableController!: ReadableStreamDefaultController<T>;
  const readable = new ReadableStream<T>({
    start(controller) {
      readableController = controller;
    },
    pull() {
      try {
        callbacks.pull?.(tapController);
      } catch (e: unknown) {
        abort(e);
        throw e;
      }
      readableReady.resolve();
    },
    cancel(reason) {
      try {
        callbacks.cancelReadable?.(reason);
      } finally {
        abort(reason);
      }
    },
  }, options.readableStrategy ?? { highWaterMark: 0 });

  let writableController!: WritableStreamDefaultController;
  const writable = new WritableStream<T>({
    start(controller) {
      writableController = controller;
    },
    async write(chunk) {
      ++index;
      try {
        callbacks.write?.(chunk, tapController);
      } catch (e: unknown) {
        abort(e);
        throw e;
      }
      readableReady = Promise.withResolvers();
      readableController.enqueue(chunk);
      await readableReady.promise;
    },
    abort(reason) {
      try {
        callbacks.abortWritable?.(reason);
      } finally {
        abort(reason);
      }
    },
    close() {
      try {
        callbacks.closeWritable?.();
      } finally {
        readableController.close();
        dispose();
      }
    },
  }, options.writableStrategy);

  return { readable, writable };
}
