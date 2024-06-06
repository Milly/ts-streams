import { describe, it } from "#bdd";
import { assertInstanceOf } from "@std/assert";
import { assertType, type IsExact } from "@std/testing/types";
import { testStream } from "@milly/streamtest";
import { interval } from "./interval.ts";

describe("interval()", () => {
  it("returns a ReadableStream<number> type", async () => {
    const actual = interval(100);
    await actual.cancel();

    assertType<IsExact<typeof actual, ReadableStream<number>>>(true);
    assertInstanceOf(actual, ReadableStream);
  });
  it("returns a ReadableStream and emits count at specified `period`", async () => {
    await testStream(async ({ assertReadable, run }) => {
      const actual = interval(300);
      const expected = "---a--b--c--d--(e!)";
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
