import { describe, it } from "#bdd";
import { assertInstanceOf } from "@std/assert";
import { assertType, type IsExact } from "@std/testing/types";
import { testStream } from "@milly/streamtest";
import { terminate } from "./terminate.ts";
import { from } from "../readable/from.ts";

describe("terminate()", () => {
  it("returns a TransformStream<unknown, never> type", () => {
    const actual = terminate();

    assertType<IsExact<typeof actual, TransformStream<unknown, never>>>(true);
    assertInstanceOf(actual, TransformStream);
  });
  describe("returns a TransformStream and", () => {
    it("teminates immediately", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("a--b--c|");
        const expected = "       |";

        const output = source.pipeThrough(terminate());

        await assertReadable(output, expected);
      });
    });
    it("can be used in parallel", async () => {
      await Promise.all([
        (from([1])).pipeThrough(terminate()).pipeTo(new WritableStream()),
        (from([2])).pipeThrough(terminate()).pipeTo(new WritableStream()),
        (from([3])).pipeThrough(terminate()).pipeTo(new WritableStream()),
      ]);
    });
  });
});
