import { describe, it } from "#bdd";
import { assertInstanceOf, assertThrows } from "@std/assert";
import { assertType, type IsExact } from "@std/testing/types";
import { delay } from "@std/async/delay";
import { testStream } from "@milly/streamtest";
import { max } from "./max.ts";

describe("max()", () => {
  it("returns a TransformStream<T, T> type", () => {
    type X = { x: number };
    const source = new ReadableStream<X>();

    const output = source.pipeThrough(max());

    assertType<IsExact<typeof output, ReadableStream<X>>>(true);
    assertInstanceOf(output, ReadableStream);
  });
  describe("throws if `comparer` is", () => {
    // deno-lint-ignore no-explicit-any
    const tests: [name: string, comparer: any][] = [
      ["null", null],
      ["string", "foo"],
      ["number", 42],
      ["object", { foo: 42 }],
      ["symbol", Symbol.for("some-symbol")],
      ["Promise", Promise.resolve(() => 0)],
    ];
    for (const [name, comparer] of tests) {
      it(name, () => {
        assertThrows(
          () => max(comparer),
          TypeError,
          "'comparer' is not a function",
        );
      });
    }
  });
  describe("returns a TransformStream and", () => {
    it("emits largest chunk", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const values = { a: 8, b: 120, c: 80, d: 0 };
        const source = readable("a--b-c---d|", values);
        const expected = "       ----------(A|)";
        const expectedValues = { A: 120 };

        const actual = source.pipeThrough(max());

        await assertReadable(actual, expected, expectedValues);
      });
    });
    it("emits largest chunk with comparer", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("c--a-d---b|");
        const expected = "       ----------(d|)";

        const actual = source.pipeThrough(
          max((a, b) => a.charCodeAt(0) - b.charCodeAt(0)),
        );

        await assertReadable(actual, expected);
      });
    });
    it("does not emits if the writable side emits no chunks", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("--------|");
        const expected = "       --------|";

        const actual = source.pipeThrough(max());

        await assertReadable(actual, expected);
      });
    });
    it("terminates when the comparer throws", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("-a--b-c---d--e-f-g|", {}, "error");
        const expectedSource = " -a--b-c---(d!)";
        const expected = "       ----------#";

        const actual = source.pipeThrough(max((_a, b) => {
          if (b === "d") throw "error";
          return 1;
        }));

        await assertReadable(actual, expected, {}, "error");
        await assertReadable(source, expectedSource, {}, "error");
      });
    });
    it("terminates when the writable side aborts", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("a--b-c---#", {}, "error");
        const expected = "       ---------#";

        const actual = source.pipeThrough(max(() => 1));

        await assertReadable(actual, expected, {}, "error");
      });
    });
    it("terminates when the readable side cancels", async () => {
      await testStream(async ({ readable, run, assertReadable }) => {
        const source = readable("-a-b-c-d-e-f-g|");
        const expectedSource = " -a-b-c-d!";
        const expected = "       --------!";

        const actual = source.pipeThrough(max(() => 1));

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
