import { describe, it } from "@std/testing/bdd";
import { assertInstanceOf } from "@std/assert";
import { assertType, type IsExact } from "@std/testing/types";
import { equal } from "@std/assert";
import { testStream } from "@milly/streamtest";
import { bufferCount } from "./buffer_count.ts";

describe("bufferCount()", () => {
  it("returns a TransformStream<T, T[]> type", () => {
    type T = { x: number };

    const actual = bufferCount<T>(2);

    assertType<IsExact<typeof actual, TransformStream<T, T[]>>>(true);
    assertInstanceOf(actual.readable, ReadableStream);
    assertInstanceOf(actual.writable, WritableStream);
  });
  describe("returns a TransformStream and", () => {
    it("buffers chunks and emits as an array when size reached `bufferSize`", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("a-b-c-d-e-f|");
        const expected = "       --x---y---z|";
        const expectedValues = {
          x: ["a", "b"],
          y: ["c", "d"],
          z: ["e", "f"],
        };

        const actual = source.pipeThrough(bufferCount(2));

        await assertReadable(actual, expected, expectedValues);
      });
    });
    it("emits the remaining chunks as an array when the source closes", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("a-b-c-d-e-f-g|");
        const expected = "       ------x------(F|)";
        const expectedValues = {
          x: ["a", "b", "c", "d"],
          F: ["e", "f", "g"],
        };

        const actual = source.pipeThrough(bufferCount(4));

        await assertReadable(actual, expected, expectedValues);
      });
    });
    it("terminates when the writable side aborts", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("-a-b-c-d-e-#", {}, "error");
        const expected = "       -----x-----#";
        const expectedValues = {
          x: ["a", "b", "c"],
        };

        const actual = source.pipeThrough(bufferCount(3));

        await assertReadable(actual, expected, expectedValues, "error");
      });
    });
    it("terminates when the readable side cancels", async () => {
      await testStream(async ({ readable, run, assertReadable }) => {
        const source = readable("-a-b-c-d-e-f-g|");
        const expectedSource = " -a-b-c-(d!)";
        const expected = "       ---x---(y!)";
        const expectedValues = {
          x: ["a", "b"],
          y: ["c", "d"],
        };

        const actual = source.pipeThrough(bufferCount(2));

        await run([actual], async (actual) => {
          await actual.pipeTo(
            new WritableStream({
              write(chunk, controller) {
                if (equal(chunk, ["c", "d"])) controller.error("break");
              },
            }),
          ).catch(() => {});
        });

        await assertReadable(actual, expected, expectedValues, "break");
        await assertReadable(source, expectedSource, {}, "break");
      });
    });
  });
});
