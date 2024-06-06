import { describe, it } from "#bdd";
import { assertEquals, assertInstanceOf } from "@std/assert";
import { assertType, type IsExact } from "@std/testing/types";
import { testStream } from "@milly/streamtest";
import { abort } from "./abort.ts";
import { from } from "../readable/from.ts";

describe("abort()", () => {
  it("returns a TransformStream<unknown, never> type", () => {
    const actual = abort();

    assertType<IsExact<typeof actual, TransformStream<unknown, never>>>(true);
    assertInstanceOf(actual.readable, ReadableStream);
    assertInstanceOf(actual.writable, WritableStream);
  });
  describe("returns a TransformStream and", () => {
    it("aborts immediately with undefined if no `reason` specified", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("a--b--c|");
        const expectedSource = " !";
        const expected = "       #";

        const actual = abort();
        const output = source.pipeThrough(actual);

        await assertReadable(output, expected, {}, undefined);
        await assertReadable(source, expectedSource, {}, undefined);
      });
    });
    it("aborts immediately with `reason`", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("a--b-cd---e|");
        const expectedSource = " !";
        const expected = "       #";

        const actual = abort("error");
        const output = source.pipeThrough(actual);

        await assertReadable(output, expected, {}, "error");
        await assertReadable(source, expectedSource, {}, "error");
      });
    });
    it("can be used in parallel", async () => {
      const result = await Promise.allSettled([
        (from([1])).pipeThrough(abort("a")).pipeTo(new WritableStream()),
        (from([2])).pipeThrough(abort("b")).pipeTo(new WritableStream()),
        (from([3])).pipeThrough(abort("c")).pipeTo(new WritableStream()),
      ]);
      assertEquals(result, [
        { reason: "a", status: "rejected" },
        { reason: "b", status: "rejected" },
        { reason: "c", status: "rejected" },
      ]);
    });
  });
});
