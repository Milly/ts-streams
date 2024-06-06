import { describe, it } from "#bdd";
import { assertInstanceOf } from "@std/assert";
import { assertType, type IsExact } from "@std/testing/types";
import { testStream } from "@milly/streamtest";
import { timer } from "./timer.ts";

describe("timer()", () => {
  it("returns a ReadableStream<0> type if no `interval` specified", async () => {
    const actual = timer(100);
    await actual.cancel();

    assertType<IsExact<typeof actual, ReadableStream<0>>>(true);
    assertInstanceOf(actual, ReadableStream);
  });
  it("returns a ReadableStream<number> type if `interval` specified", async () => {
    const actual = timer(100, 200);
    await actual.cancel();

    assertType<IsExact<typeof actual, ReadableStream<number>>>(true);
    assertInstanceOf(actual, ReadableStream);
  });
  describe("returns a ReadableStream and", () => {
    it("emits 0 at specified `delay`", async () => {
      await testStream(async ({ assertReadable }) => {
        const actual = timer(300);
        const expected = "---(a|)";
        const expectedValues = {
          a: 0,
        };

        await assertReadable(actual, expected, expectedValues);
      });
    });
    it("emits count at specified `delay` and `interval`", async () => {
      await testStream(async ({ assertReadable, run }) => {
        const actual = timer(200, 300);
        const expected = "--a--b--c--d--(e!)";
        const expectedValues = {
          a: 0,
          b: 1,
          c: 2,
          d: 3,
          e: 4,
        };

        await run([actual], async (actual) => {
          await actual.pipeTo(
            new WritableStream({
              write(chunk, controller) {
                if (chunk === 4) controller.error("break");
              },
            }),
          ).catch(() => {});
        });

        await assertReadable(actual, expected, expectedValues);
      });
    });
  });
});
