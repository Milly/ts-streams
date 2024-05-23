import { describe, it } from "@std/testing/bdd";
import { assertInstanceOf } from "@std/assert";
import { assertEquals } from "@std/assert";
import { assertType, type IsExact } from "@std/testing/types";
import { spy } from "@std/testing/mock";
import { delay } from "@std/async/delay";
import { testStream } from "@milly/streamtest";
import { every } from "./every.ts";

describe("every()", () => {
  it("returns a TransformStream<unknown, boolean> type", () => {
    const actual = every((value) => value != null);

    assertType<IsExact<typeof actual, TransformStream<unknown, boolean>>>(true);
    assertInstanceOf(actual.readable, ReadableStream);
    assertInstanceOf(actual.writable, WritableStream);
  });
  describe("returns a TransformStream and", () => {
    it("calls `predicate` with each chunk value and index", async () => {
      await testStream(async ({ readable, writable, run }) => {
        const source = readable("a--b-c-(d|)");
        const predicate = spy((_value: string, _index: number) => true);

        const actual = source.pipeThrough(every(predicate));
        await run([actual], async (actual) => {
          await actual.pipeTo(writable());
        });

        assertEquals(predicate.calls, [
          { args: ["a", 0], returned: true },
          { args: ["b", 1], returned: true },
          { args: ["c", 2], returned: true },
          { args: ["d", 3], returned: true },
        ]);
      });
    });
    it("does not calls `predicate` after returns false", async () => {
      await testStream(async ({ readable, writable, run }) => {
        const source = readable("a--x-c-(d|)");
        const predicate = spy(
          (value: string, _index: number) => /[a-d]/.test(value),
        );

        const actual = source.pipeThrough(every(predicate));
        await run([actual], async (actual) => {
          await actual.pipeTo(writable());
        });

        assertEquals(predicate.calls, [
          { args: ["a", 0], returned: true },
          { args: ["x", 1], returned: false },
        ]);
      });
    });
    it("emits true if all chunks satisfy `predicate`", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("a-b-c---d---ef-|");
        const expectedSource = " a-b-c---d---ef-|";
        const expected = "       ---------------(A|)";

        const actual = source.pipeThrough(every(() => true));

        await assertReadable(actual, expected, { A: true });
        await assertReadable(source, expectedSource);
      });
    });
    it("emits true if the writable side emits no chunks", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("-------|");
        const expectedSource = " -------|";
        const expected = "       -------(A|)";

        const actual = source.pipeThrough(every(() => false));

        await assertReadable(actual, expected, { A: true });
        await assertReadable(source, expectedSource);
      });
    });
    it("emits false if some chunk not satisfy `predicate`", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("a-b-x---d---e(f|)");
        const expectedSource = " a-b-(x!)";
        const expected = "       ----(A|)";

        const actual = source.pipeThrough(
          every((value) => /[a-f]/.test(value)),
        );

        await assertReadable(actual, expected, { A: false });
        await assertReadable(source, expectedSource);
      });
    });
    it("terminates when predicat throws", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("-a-b-c-d-e-f-g|", {}, "error");
        const expectedSource = " -a-b-c-d-e-(f!)";
        const expected = "       -----------#";

        const actual = source.pipeThrough(every((value) => {
          if (value === "f") throw "error";
          return true;
        }));

        await assertReadable(actual, expected, {}, "error");
        await assertReadable(source, expectedSource, {}, "error");
      });
    });
    it("terminates when the writable side aborts", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("-a-b-c-d-e-#", {}, "error");
        const expected = "       -----------#";

        const actual = source.pipeThrough(every(() => true));

        await assertReadable(actual, expected, {}, "error");
      });
    });
    it("terminates when the readable side cancels", async () => {
      await testStream(async ({ readable, run, assertReadable }) => {
        const source = readable("-a-b-c-d-e-f-g|");
        const expectedSource = " -a-b-c-d!";
        const expected = "       --------!";

        const actual = source.pipeThrough(every(() => true));

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
