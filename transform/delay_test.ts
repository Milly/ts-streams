import { describe, it } from "#bdd";
import { assertInstanceOf } from "@std/assert";
import { assertType, type IsExact } from "@std/testing/types";
import { testStream } from "@milly/streamtest";
import { delay } from "./delay.ts";

describe("delay()", () => {
  it("returns a TransformStream<T, T> type", () => {
    type T = { x: number };
    const source = new ReadableStream<T>();

    const output = source.pipeThrough(delay(100));

    assertType<IsExact<typeof output, ReadableStream<T>>>(true);
    assertInstanceOf(output, ReadableStream);
  });
  describe("returns a TransformStream and", () => {
    it("emits with the specified delay", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("-a------b--c-----|");
        const expected = "       -----a------b--c-|";

        const actual = source.pipeThrough(delay(400));

        await assertReadable(actual, expected);
      });
    });
    it("emits without delay if the negative value is specified", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("-a------b--c---|");
        const expected = "       -a------b--c---|";

        const actual = source.pipeThrough(delay(-100));

        await assertReadable(actual, expected);
      });
    });
    it("closes immediately after emitted last value if the writable side already closed", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("-a--b--c|");
        const expected = "       ---a--b--(c|)";

        const actual = source.pipeThrough(delay(200));

        await assertReadable(actual, expected);
      });
    });
    it("closes immediately if the writable side emits no values", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("------|");
        const expected = "       ------|";

        const actual = source.pipeThrough(delay(200));

        await assertReadable(actual, expected);
      });
    });
    it("closes immediately if the writable side immediately closed", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("|");
        const expected = "       |";

        const actual = source.pipeThrough(delay(300));

        await assertReadable(actual, expected);
      });
    });
    it("terminates immediately if the writable side aborts", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("-a----#", {}, "error");
        const expected = "       ---a--#";

        const actual = source.pipeThrough(delay(200));

        await assertReadable(actual, expected, {}, "error");
      });
    });
    it("terminates immediately if the readable side cancels", async () => {
      await testStream(async ({ readable, writable, run, assertReadable }) => {
        const source = readable("-a--------");
        const expectedSource = " -a----!";
        const expected = "       ----a-!";
        const dest = writable("  ------#", "break");

        const actual = source.pipeThrough(delay(300));

        await run([actual], (actual) => {
          actual.pipeTo(dest).catch(() => {});
        });

        await assertReadable(actual, expected, {}, "break");
        await assertReadable(source, expectedSource, {}, "break");
      });
    });
  });
});
