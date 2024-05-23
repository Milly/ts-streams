import { describe, it } from "@std/testing/bdd";
import { assertInstanceOf } from "@std/assert";
import { assertType, type IsExact } from "@std/testing/types";
import { testStream } from "@milly/streamtest";
import { range } from "./range.ts";

describe("range()", () => {
  it("returns a ReadableStream<number> type", async () => {
    const actual = range(5);
    await actual.cancel();

    assertType<IsExact<typeof actual, ReadableStream<number>>>(true);
    assertInstanceOf(actual, ReadableStream);
  });
  describe("returns a ReadableStream and", () => {
    it("emits a sequence starting from 0 with the number specifed in `count`", async () => {
      await testStream(async ({ assertReadable }) => {
        const actual = range(5);
        const expected = "(abcde|)";
        const expectedValues = {
          a: 0,
          b: 1,
          c: 2,
          d: 3,
          e: 4,
        };

        await assertReadable(actual, expected, expectedValues);
      });
    });
    it("emits a sequence starting from `start` with the number specifed in `count`", async () => {
      await testStream(async ({ assertReadable }) => {
        const actual = range(5, 7);
        const expected = "(abcdefg|)";
        const expectedValues = {
          a: 5,
          b: 6,
          c: 7,
          d: 8,
          e: 9,
          f: 10,
          g: 11,
        };

        await assertReadable(actual, expected, expectedValues);
      });
    });
    it("emits a sequence starting from `start` that is negative with the number specifed in `count`", async () => {
      await testStream(async ({ assertReadable }) => {
        const actual = range(-3, 7);
        const expected = "(abcdefg|)";
        const expectedValues = {
          a: -3,
          b: -2,
          c: -1,
          d: 0,
          e: 1,
          f: 2,
          g: 3,
        };

        await assertReadable(actual, expected, expectedValues);
      });
    });
    it("closes if `count` is 0 and `start` is no specified", async () => {
      await testStream(async ({ assertReadable }) => {
        const actual = range(0);
        const expected = "|";

        await assertReadable(actual, expected, {});
      });
    });
    it("closes if `count` is 0", async () => {
      await testStream(async ({ assertReadable }) => {
        const actual = range(5, 0);
        const expected = "|";

        await assertReadable(actual, expected, {});
      });
    });
    it("closes if `count` is negative and `start` is no specified", async () => {
      await testStream(async ({ assertReadable }) => {
        const actual = range(-5);
        const expected = "|";

        await assertReadable(actual, expected, {});
      });
    });
    it("closes if `count` is negative", async () => {
      await testStream(async ({ assertReadable }) => {
        const actual = range(5, -5);
        const expected = "|";

        await assertReadable(actual, expected, {});
      });
    });
  });
});
