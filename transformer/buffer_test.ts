import { describe, it } from "@std/testing/bdd";
import { assertInstanceOf } from "@std/assert";
import { assertType, type IsExact } from "@std/testing/types";
import { equal } from "@std/assert";
import { testStream } from "@milly/streamtest";
import { buffer } from "./buffer.ts";

describe("buffer()", () => {
  it("returns a TransformStream<T, T[]> type", () => {
    type T = { x: number };
    const emitter = new ReadableStream<void>();

    const actual = buffer<T>(emitter);

    assertType<IsExact<typeof actual, TransformStream<T, T[]>>>(true);
    assertInstanceOf(actual.readable, ReadableStream);
    assertInstanceOf(actual.writable, WritableStream);
  });
  describe("returns a TransformStream and", () => {
    it("buffers chunks and emits as an array when `emitter` emits", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable(" -a--b-c--d-e----f|");
        const emitter = readable("----A--------A--A---");
        const expectedEmitter = " ----A--------A--A!";
        const expected = "        ----x--------y--z|";
        const expectedValues = {
          x: ["a", "b"],
          y: ["c", "d", "e"],
          z: ["f"],
        };

        const actual = source.pipeThrough(buffer(emitter));

        await assertReadable(actual, expected, expectedValues);
        await assertReadable(emitter, expectedEmitter);
      });
    });
    it("emits an empty array when `emitter` emits if no buffered", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable(" ------a-b---|");
        const emitter = readable("----A---A-A----");
        const expectedEmitter = " ----A---A-A-!";
        const expected = "        ----x---y-z-|";
        const expectedValues = {
          x: [] as string[],
          y: ["a", "b"],
          z: [] as string[],
        };

        const actual = source.pipeThrough(buffer(emitter));

        await assertReadable(actual, expected, expectedValues);
        await assertReadable(emitter, expectedEmitter);
      });
    });
    it("emits the remaining chunks as an array if `emitter` is closed before source close", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable(" -a--b-c-d-e--f-|");
        const emitter = readable("----A---A---|");
        const expected = "        ----x---y------(F|)";
        const expectedValues = {
          x: ["a", "b"],
          y: ["c", "d"],
          F: ["e", "f"],
        };

        const actual = source.pipeThrough(buffer(emitter));

        await assertReadable(actual, expected, expectedValues);
      });
    });
    it("emits the remaining chunks as an array if source is closed before the `emitter` close", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable(" -a--b-c--d-e--f-|");
        const emitter = readable("-------A-----------");
        const expected = "        -------x--------(F|)";
        const expectedValues = {
          x: ["a", "b", "c"],
          F: ["d", "e", "f"],
        };

        const actual = source.pipeThrough(buffer(emitter));

        await assertReadable(actual, expected, expectedValues);
      });
    });
    it("terminates when `emitter` aborts", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable(" -a--b-c--d-e--f-|");
        const expectedSource = "  -a--b-c--d-e-!";
        const emitter = readable("-------A-----#", {}, "error");
        const expected = "        -------x-----#";
        const expectedValues = {
          x: ["a", "b", "c"],
        };

        const actual = source.pipeThrough(buffer(emitter));

        await assertReadable(actual, expected, expectedValues, "error");
        await assertReadable(source, expectedSource, {}, "error");
      });
    });
    it("terminates when the writable side aborts", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable(" -a--b-c--d-e-#", {}, "error");
        const emitter = readable("-------A---------");
        const expectedEmitter = " -------A-----!";
        const expected = "        -------x-----#";
        const expectedValues = {
          x: ["a", "b", "c"],
        };

        const actual = source.pipeThrough(buffer(emitter));

        await assertReadable(actual, expected, expectedValues, "error");
        await assertReadable(emitter, expectedEmitter, {}, "error");
      });
    });
    it("terminates when the writable side aborts after `emitter` closes", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable(" -a--b-c--d-e-#", {}, "error");
        const emitter = readable("-------|");
        const expectedEmitter = " -------|";
        const expected = "        -------------#";

        const actual = source.pipeThrough(buffer(emitter));

        await assertReadable(actual, expected, {}, "error");
        await assertReadable(emitter, expectedEmitter);
      });
    });
    it("terminates when the readable side cancels", async () => {
      await testStream(async ({ readable, run, assertReadable }) => {
        const source = readable(" -a-b-c- d  -e-f-g|");
        const expectedSource = "  -a-b-c-(d!)";
        const emitter = readable("---A--- A  ---------");
        const expectedEmitter = " ---A---(A!)";
        const expected = "        ---x---(y!)";
        const expectedValues = {
          x: ["a", "b"],
          y: ["c", "d"],
        };

        const actual = source.pipeThrough(buffer(emitter));

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
        await assertReadable(emitter, expectedEmitter, {}, "break");
      });
    });
    it("terminates when the readable side cancels after `emitter` closes", async () => {
      await testStream(async ({ readable, writable, run, assertReadable }) => {
        const source = readable(" -a-b-c-d-e-f-g|");
        const expectedSource = "  -a-b-c-d!";
        const emitter = readable("---|");
        const expectedEmitter = " ---|";
        const dest = writable("   --------#", "break");
        const expected = "        --------!";

        const actual = source.pipeThrough(buffer(emitter));

        await run([actual], (actual) => {
          actual.pipeTo(dest).catch(() => {});
        });

        await assertReadable(actual, expected, {}, "break");
        await assertReadable(source, expectedSource, {}, "break");
        await assertReadable(emitter, expectedEmitter, {}, "break");
      });
    });
  });
});
