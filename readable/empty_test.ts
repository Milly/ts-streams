import { describe, it } from "#bdd";
import { assertInstanceOf } from "@std/assert";
import { assertType, type IsExact } from "@std/testing/types";
import { testStream } from "@milly/streamtest";
import { empty } from "./empty.ts";

describe("empty()", () => {
  it("returns a ReadableStream<never> type", () => {
    const actual = empty();

    assertType<IsExact<typeof actual, ReadableStream<never>>>(true);
    assertInstanceOf(actual, ReadableStream);
  });
  describe("returns a ReadableStream and", () => {
    it("closes immediately", async () => {
      await testStream(async ({ assertReadable }) => {
        const actual = empty();

        await assertReadable(actual, "|");
      });
    });
    it("can be used in parallel", async () => {
      await Promise.all([
        empty().pipeTo(new WritableStream()),
        empty().pipeTo(new WritableStream()),
        empty().pipeTo(new WritableStream()),
      ]);
    });
  });
});
