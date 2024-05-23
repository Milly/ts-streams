import { describe, it } from "@std/testing/bdd";
import { assertInstanceOf } from "@std/assert";
import { assertType, type IsExact } from "@std/testing/types";
import { delay } from "@std/async/delay";
import { testStream } from "@milly/streamtest";
import { takeLast } from "./take_last.ts";

describe("takeLast()", () => {
  it("returns a TransformStream<T, T> type", () => {
    type T = { x: number };
    const source = new ReadableStream<T>();

    const output = source.pipeThrough(takeLast());

    assertType<IsExact<typeof output, ReadableStream<T>>>(true);
    assertInstanceOf(output, ReadableStream);
  });
  describe("returns a TransformStream and", () => {
    it("emits last count chunks", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("a--b-cd---e|");
        const expected = "       -----------(cde|)";

        const actual = source.pipeThrough(takeLast(3));

        await assertReadable(actual, expected);
      });
    });
    it("emits last chunk if no count specified", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("a--b-cd---e|");
        const expected = "       -----------(e|)";

        const actual = source.pipeThrough(takeLast());

        await assertReadable(actual, expected);
      });
    });
    it("closes immediately if 0 is specified", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("a--b-cd---e|");
        const expected = "       |";

        const actual = source.pipeThrough(takeLast(0));

        await assertReadable(actual, expected);
      });
    });
    it("terminates when the writable side aborts", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("a--b-c---#", {}, "error");
        const expected = "       ---------#";

        const actual = source.pipeThrough(takeLast(5));

        await assertReadable(actual, expected, {}, "error");
      });
    });
    it("terminates when the readable side cancels", async () => {
      await testStream(async ({ readable, run, assertReadable }) => {
        const source = readable("-a-b-c-d-e-f-g|");
        const expectedSource = " -a-b-c-d!";
        const expected = "       --------!";

        const actual = source.pipeThrough(takeLast(5));

        await run([actual], async (actual) => {
          await actual.pipeTo(
            new WritableStream({
              async start(controller) {
                await delay(800);
                controller.error("break");
              },
            }),
          ).catch(() => {});
        });

        await assertReadable(actual, expected, {}, "break");
        await assertReadable(source, expectedSource, {}, "break");
      });
    });
  });
});
