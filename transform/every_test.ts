import { describe, it } from "#bdd";
import { assertInstanceOf, assertThrows } from "@std/assert";
import { assertEquals } from "@std/assert";
import { assertType, type IsExact } from "@std/testing/types";
import { spy } from "@std/testing/mock";
import { delay } from "@std/async/delay";
import { testStream } from "@milly/streamtest";
import { every } from "./every.ts";

describe("every()", () => {
  describe("returns a TransformStream type", () => {
    it("with template <unknown, boolean> type if `predicate` is `(x) => boolean`", () => {
      const actual = every((value) => value != null);

      assertType<IsExact<typeof actual, TransformStream<unknown, boolean>>>(
        true,
      );
      assertInstanceOf(actual.readable, ReadableStream);
      assertInstanceOf(actual.writable, WritableStream);
    });
    it("with template <unknown, boolean> type if `predicate` is `(x) => Promise<boolean>`", () => {
      const actual = every((value) => Promise.resolve(value != null));

      assertType<IsExact<typeof actual, TransformStream<unknown, boolean>>>(
        true,
      );
      assertInstanceOf(actual.readable, ReadableStream);
      assertInstanceOf(actual.writable, WritableStream);
    });
  });
  describe("throws if `predicate` is", () => {
    // deno-lint-ignore no-explicit-any
    const tests: [name: string, predicate: any][] = [
      ["null", null],
      ["undefined", undefined],
      ["string", "foo"],
      ["number", 42],
      ["object", { foo: 42 }],
      ["symbol", Symbol.for("some-symbol")],
      ["Promise", Promise.resolve(() => true)],
    ];
    for (const [name, predicate] of tests) {
      it(name, () => {
        assertThrows(
          () => every(predicate),
          TypeError,
          "'predicate' is not a function",
        );
      });
    }
  });
  describe("returns a TransformStream and", () => {
    describe("if `predicate` is `(x) => boolean`", () => {
      it("calls `predicate` with each chunk value and index", async () => {
        await testStream(async ({ readable, writable, run }) => {
          const source = readable("a--b-c-(d|)");
          const predicate = spy((_value: string, _index: number) => true);

          const actual = source.pipeThrough(every(predicate));
          await run([actual], async (actual) => {
            await actual.pipeTo(writable());
          });

          assertEquals(predicate.calls.map((c) => c.args), [
            ["a", 0],
            ["b", 1],
            ["c", 2],
            ["d", 3],
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

          assertEquals(predicate.calls.map((c) => c.args), [
            ["a", 0],
            ["x", 1],
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
    describe("if `predicate` is `(x) => Promise<boolean>`", () => {
      it("calls `predicate` with each chunk value and index", async () => {
        await testStream(async ({ readable, writable, run }) => {
          const source = readable("a--b-c-(d|)");
          const predicate = spy(async (_value: string, _index: number) => {
            await delay(0);
            return true;
          });

          const actual = source.pipeThrough(every(predicate));
          await run([actual], async (actual) => {
            await actual.pipeTo(writable());
          });

          assertEquals(predicate.calls.map((c) => c.args), [
            ["a", 0],
            ["b", 1],
            ["c", 2],
            ["d", 3],
          ]);
        });
      });
      it("does not calls `predicate` after returns false", async () => {
        await testStream(async ({ readable, writable, run }) => {
          const source = readable("a--x-c-(d|)");
          const predicate = spy(async (value: string, _index: number) => {
            await delay(0);
            return /[a-d]/.test(value);
          });

          const actual = source.pipeThrough(every(predicate));
          await run([actual], async (actual) => {
            await actual.pipeTo(writable());
          });

          assertEquals(predicate.calls.map((c) => c.args), [
            ["a", 0],
            ["x", 1],
          ]);
        });
      });
      it("emits true if all chunks satisfy `predicate`", async () => {
        await testStream(async ({ readable, assertReadable }) => {
          const source = readable("a-b-c---d---ef-|");
          const expectedSource = " a-b-c---d---ef-|";
          const expected = "       ---------------(A|)";

          const actual = source.pipeThrough(every(async () => {
            await delay(0);
            return true;
          }));

          await assertReadable(actual, expected, { A: true });
          await assertReadable(source, expectedSource);
        });
      });
      it("emits true if the writable side emits no chunks", async () => {
        await testStream(async ({ readable, assertReadable }) => {
          const source = readable("-------|");
          const expectedSource = " -------|";
          const expected = "       -------(A|)";

          const actual = source.pipeThrough(every(async () => {
            await delay(0);
            return false;
          }));

          await assertReadable(actual, expected, { A: true });
          await assertReadable(source, expectedSource);
        });
      });
      it("emits false if some chunk not satisfy `predicate`", async () => {
        await testStream(async ({ readable, assertReadable }) => {
          const source = readable("a-b-x---d---e(f|)");
          const expectedSource = " a-b-(x!)";
          const expected = "       ----(A|)";

          const actual = source.pipeThrough(every(async (value) => {
            await delay(0);
            return /[a-f]/.test(value);
          }));

          await assertReadable(actual, expected, { A: false });
          await assertReadable(source, expectedSource);
        });
      });
      it("terminates when predicat rejects", async () => {
        await testStream(async ({ readable, assertReadable }) => {
          const source = readable("-a-b-c-d-e-f-g|", {}, "error");
          const expectedSource = " -a-b-c-d-e-(f!)";
          const expected = "       -----------#";

          const actual = source.pipeThrough(every(async (value) => {
            await delay(0);
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

          const actual = source.pipeThrough(every(async () => {
            await delay(0);
            return true;
          }));

          await assertReadable(actual, expected, {}, "error");
        });
      });
      it("terminates when the readable side cancels", async () => {
        await testStream(async ({ readable, run, assertReadable }) => {
          const source = readable("-a-b-c-d-e-f-g|");
          const expectedSource = " -a-b-c-d!";
          const expected = "       --------!";

          const actual = source.pipeThrough(every(async () => {
            await delay(0);
            return true;
          }));

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
});
