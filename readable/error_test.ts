import { describe, it } from "#bdd";
import { assertEquals, assertInstanceOf } from "@std/assert";
import { assertType, type IsExact } from "@std/testing/types";
import { testStream } from "@milly/streamtest";
import { error } from "./error.ts";

describe("error()", () => {
  it("returns a ReadableStream<never> type", () => {
    const actual = error();

    assertType<IsExact<typeof actual, ReadableStream<never>>>(true);
    assertInstanceOf(actual, ReadableStream);
  });
  describe("returns a ReadableStream and", () => {
    it("cancels immediately with undefined if no `reason` specified", async () => {
      await testStream(async ({ assertReadable }) => {
        const actual = error();

        await assertReadable(actual, "#", {}, undefined);
      });
    });
    it("cancels immediately with `reason`", async () => {
      await testStream(async ({ assertReadable }) => {
        const actual = error("error");

        await assertReadable(actual, "#", {}, "error");
      });
    });
    it("can be used in parallel", async () => {
      const result = await Promise.allSettled([
        error("a").pipeTo(new WritableStream()),
        error("b").pipeTo(new WritableStream()),
        error("c").pipeTo(new WritableStream()),
      ]);

      assertEquals(result, [
        { reason: "a", status: "rejected" },
        { reason: "b", status: "rejected" },
        { reason: "c", status: "rejected" },
      ]);
    });
  });
});
