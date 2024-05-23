import { describe, it } from "@std/testing/bdd";
import { assertInstanceOf } from "@std/assert";
import { assertType, type IsExact } from "@std/testing/types";
import { delay } from "@std/async/delay";
import { testStream } from "@milly/streamtest";
import { count } from "./count.ts";

describe("count()", () => {
  it("returns a TransformStream<unknown, number> type", () => {
    const actual = count();

    assertType<IsExact<typeof actual, TransformStream<unknown, number>>>(true);
    assertInstanceOf(actual.readable, ReadableStream);
    assertInstanceOf(actual.writable, WritableStream);
  });
  describe("returns a TransformStream and", () => {
    it("emits number of chunks", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("a--b-cd---e|");
        const expected = "       -----------(C|)";
        const expectedValues = {
          C: 5,
        };

        const actual = source.pipeThrough(count());

        await assertReadable(actual, expected, expectedValues);
      });
    });
    it("emits 0 if the writable side emits no chunks", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("------|");
        const expected = "       ------(C|)";
        const expectedValues = {
          C: 0,
        };

        const actual = source.pipeThrough(count());

        await assertReadable(actual, expected, expectedValues);
      });
    });
    it("terminates when the writable side aborts", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("a--b-c---#", {}, "error");
        const expected = "       ---------#";

        const actual = source.pipeThrough(count());

        await assertReadable(actual, expected, {}, "error");
      });
    });
    it("terminates when the readable side cancels", async () => {
      await testStream(async ({ readable, run, assertReadable }) => {
        const source = readable("-a-b-c-d-e-f-g|");
        const expectedSource = " -a-b-c-d!";
        const expected = "       --------!";

        const actual = source.pipeThrough(count());

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
