import { describe, it } from "#bdd";
import { assertInstanceOf } from "@std/assert";
import { assertType, type IsExact } from "@std/testing/types";
import { testStream } from "@milly/streamtest";
import { debounceTime } from "./debounce_time.ts";

describe("debounceTime()", () => {
  it("returns a TransformStream<T, T> type", () => {
    type T = { x: number };
    const source = new ReadableStream<T>();

    const output = source.pipeThrough(debounceTime(100));

    assertType<IsExact<typeof output, ReadableStream<T>>>(true);
    assertInstanceOf(output, ReadableStream);
  });
  describe("returns a TransformStream and", () => {
    it("debounces values by the specified duration", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("-a-b-c---de----|");
        const expected = "       --------c----e-|";

        const actual = source.pipeThrough(debounceTime(300));

        await assertReadable(actual, expected);
      });
    });
    it("emits immediately if negative duration is specified", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("-a-b-c--|");
        const expected = "       -a-b-c--|";

        const actual = source.pipeThrough(debounceTime(-100));

        await assertReadable(actual, expected);
      });
    });
    it("emits immediately if zero duration is specified", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("-a-b-c--|");
        const expected = "       -a-b-c--|";

        const actual = source.pipeThrough(debounceTime(0));

        await assertReadable(actual, expected);
      });
    });
    it("emits the last value when stream closes during debounce", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("-a-b-c-  |");
        const expected = "       -------(c|)";

        const actual = source.pipeThrough(debounceTime(300));

        await assertReadable(actual, expected);
      });
    });
    it("closes immediately if the writable side emits no values", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("------|");
        const expected = "       ------|";

        const actual = source.pipeThrough(debounceTime(300));

        await assertReadable(actual, expected);
      });
    });
    it("closes immediately if the writable side immediately closed", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("|");
        const expected = "       |";

        const actual = source.pipeThrough(debounceTime(300));

        await assertReadable(actual, expected);
      });
    });
    it("terminates immediately if the writable side aborts", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("-a-b-c-#", {}, "error");
        const expected = "       -------#";

        const actual = source.pipeThrough(debounceTime(300));

        await assertReadable(actual, expected, {}, "error");
      });
    });
    it("terminates immediately if the readable side cancels", async () => {
      await testStream(async ({ readable, writable, run, assertReadable }) => {
        const source = readable("-a---b-c------");
        const expectedSource = " -a---b-c-!";
        const expected = "       ----a----!";
        const dest = writable("  ---------#", "break");

        const actual = source.pipeThrough(debounceTime(300));

        await run([actual], (actual) => {
          actual.pipeTo(dest).catch(() => {});
        });

        await assertReadable(actual, expected, {}, "break");
        await assertReadable(source, expectedSource, {}, "break");
      });
    });
    it("handles rapid sequential values correctly", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("-(abc)----d-(ef)----(gh|)");
        const expected = "       - -   --c--- -  --f- (h|)";

        const actual = source.pipeThrough(debounceTime(300));

        await assertReadable(actual, expected);
      });
    });
  });
});
