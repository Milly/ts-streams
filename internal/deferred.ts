/**
 * Same as `Promise.withResolvers<T>()`.
 *
 * NOTE: Do not use `Promise.withResolvers()` for old node environment.
 */
export const deferred: <T>() => PromiseWithResolvers<T> =
  Promise.withResolvers != null
    ? Promise.withResolvers.bind(Promise)
    : _deferred;

/** Polyfill of `Promise.withResolvers<T>()`. */
function _deferred<T>(): PromiseWithResolvers<T> {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** @internal */
export const _test = {
  _deferred,
};
