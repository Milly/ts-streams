import { describe, it } from "#bdd";
import { assertEquals, assertInstanceOf, assertRejects } from "@std/assert";
import { assertType, type IsExact } from "@std/testing/types";
import { promiseState } from "@core/asyncutil";
import { _test } from "./deferred.ts";

const { _deferred } = _test;

describe("_deferred()", () => {
  it("returns a PromiseWithResolvers<T>", () => {
    type T = { x: string };
    const actual = _deferred<T>();

    assertType<IsExact<typeof actual, PromiseWithResolvers<T>>>(true);
    assertInstanceOf(actual.promise, Promise);
    assertInstanceOf(actual.resolve, Function);
    assertInstanceOf(actual.reject, Function);
  });
  it("resolves when `resolve` calls", async () => {
    const { resolve, promise } = _deferred<void>();

    assertEquals(await promiseState(promise), "pending");

    resolve();

    assertEquals(await promiseState(promise), "fulfilled");
    assertEquals(await promise, undefined);
  });
  it("resolves with value when `resolve` calls", async () => {
    type T = { x: string };
    const { resolve, promise } = _deferred<T>();

    assertEquals(await promiseState(promise), "pending");

    resolve({ x: "foo" });

    assertEquals(await promiseState(promise), "fulfilled");
    assertEquals(await promise, { x: "foo" });
  });
  it("rejects when `reject` calls", async () => {
    const { reject, promise } = _deferred<void>();

    assertEquals(await promiseState(promise), "pending");

    reject();

    assertEquals(await promiseState(promise), "rejected");
    const reason = await assertRejects(() => promise);
    assertEquals(reason, undefined);
  });
  it("rejects with reason when `reject` calls", async () => {
    const { reject, promise } = _deferred<unknown>();

    assertEquals(await promiseState(promise), "pending");

    reject("foo");

    assertEquals(await promiseState(promise), "rejected");
    const reason = await assertRejects(() => promise);
    assertEquals(reason, "foo");
  });
});
