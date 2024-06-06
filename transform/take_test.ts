import { describe, it } from "#bdd";
import { assertInstanceOf } from "@std/assert";
import { assertType, type IsExact } from "@std/testing/types";
import { testStream } from "@milly/streamtest";
import { take } from "./take.ts";

describe("take()", () => {
  it("emits the type of the input", () => {
    type T = { x: number };
    const source = new ReadableStream<T>();

    const output = source.pipeThrough(take());

    assertType<IsExact<typeof output, ReadableStream<T>>>(true);
    assertInstanceOf(output, ReadableStream);
  });
  describe("returns a TransformStream and", () => {
    it("emits first count chunks", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("a--b-cd---e|");
        const expected = "       a--b-(c|)";

        const actual = source.pipeThrough(take(3));

        await assertReadable(actual, expected);
      });
    });
    it("emits first chunk if no count specified", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("a--b-cd---e|");
        const expected = "       (a|)";

        const actual = source.pipeThrough(take());

        await assertReadable(actual, expected);
      });
    });
    it("closes immediately if 0 is specified", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("a--b-cd---e|");
        const expected = "       |";

        const actual = source.pipeThrough(take(0));

        await assertReadable(actual, expected);
      });
    });
    it("terminates when the writable side aborts", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("a--b-c---#", {}, "error");
        const expected = "       a--b-c---#";

        const actual = source.pipeThrough(take(5));

        await assertReadable(actual, expected, {}, "error");
      });
    });
    it("terminates when the readable side cancels", async () => {
      await testStream(async ({ readable, run, assertReadable }) => {
        const source = readable("-a-b-c-d-e-f-g|");
        const expectedSource = " -a-b-c-(d!)";
        const expected = "       -a-b-c-(d!)";

        const actual = source.pipeThrough(take(5));

        await run([actual], async (actual) => {
          await actual.pipeTo(
            new WritableStream({
              write(chunk, controller) {
                if (chunk === "d") controller.error("break");
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
