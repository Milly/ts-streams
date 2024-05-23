import { describe, it } from "@std/testing/bdd";
import { assertEquals, assertFalse, assertRejects } from "@std/assert";
import { from } from "../readable/from.ts";
import { pull } from "./pull.ts";

describe("pull()", () => {
  it("returns the next chunk in the stream", async () => {
    const stream = from([1, 2, 3]);
    assertEquals(await pull(stream), 1);
    assertEquals(await pull(stream), 2);
    assertEquals(await pull(stream), 3);
    assertFalse(stream.locked);
  });
  it("returns undefined if the stream is closed", async () => {
    const stream = from([1]);
    assertEquals(await pull(stream), 1);
    assertEquals(await pull(stream), undefined);
    assertEquals(await pull(stream), undefined);
    assertFalse(stream.locked);
  });
  it("returns `defaultValue` if the stream is closed", async () => {
    const stream = from([1]);
    assertEquals(await pull(stream, "a"), 1);
    assertEquals(await pull(stream, "b"), "b");
    assertEquals(await pull(stream, "c"), "c");
    assertFalse(stream.locked);
  });
  it("throws if the stream is rejected", async () => {
    const stream = from([1, 2, Promise.reject("error")]);
    assertEquals(await pull(stream), 1);
    assertEquals(await pull(stream), 2);
    const actual = await assertRejects(() => pull(stream));
    assertEquals(actual, "error");
    assertFalse(stream.locked);
  });
});
