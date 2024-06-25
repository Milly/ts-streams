import { describe, it } from "#bdd";
import {
  assertEquals,
  assertInstanceOf,
  assertRejects,
  assertThrows,
} from "@std/assert";
import { assertType, type IsExact } from "@std/testing/types";
import { assertSpyCallArgs, assertSpyCalls, spy } from "@std/testing/mock";
import { testStream } from "@milly/streamtest";
import { reduce } from "./reduce.ts";

describe("reduce()", () => {
  describe("returns a TransformStream type", () => {
    it("with template <I, I | A> if no `initialValue` specified", () => {
      const source = new ReadableStream<number>();

      const output = source.pipeThrough(reduce(() => "a"));

      assertType<IsExact<typeof output, ReadableStream<number | string>>>(true);
      assertInstanceOf(output, ReadableStream);
    });
    it("with template <I, A | V> if `initialValue` specified", () => {
      const source = new ReadableStream<number>();

      const output = source.pipeThrough(reduce(() => "a", true));

      assertType<IsExact<typeof output, ReadableStream<string | boolean>>>(
        true,
      );
      assertInstanceOf(output, ReadableStream);
    });
  });
  describe("throws if `accumulator` is", () => {
    // deno-lint-ignore no-explicit-any
    const tests: [name: string, accumulator: any][] = [
      ["null", null],
      ["undefined", undefined],
      ["string", "foo"],
      ["number", 42],
      ["object", { foo: 42 }],
      ["symbol", Symbol.for("some-symbol")],
      ["Promise", Promise.resolve(() => 0)],
    ];
    for (const [name, accumulator] of tests) {
      it(name, () => {
        assertThrows(
          () => reduce(accumulator),
          TypeError,
        );
      });
    }
  });
  describe("returns a TransformStream and", () => {
    it("calls `accumulator` with each chunk value and index", async () => {
      await testStream(async ({ readable, writable, run }) => {
        const source = readable("abc(d|)");
        const accumulator = spy(
          (prev: string, value: string, _: number) => prev + value,
        );

        const actual = source.pipeThrough(reduce(accumulator));
        await run([actual], async (actual) => {
          await actual.pipeTo(writable());
        });

        assertEquals(accumulator.calls, [
          { args: ["a", "b", 1], returned: "ab" },
          { args: ["ab", "c", 2], returned: "abc" },
          { args: ["abc", "d", 3], returned: "abcd" },
        ]);
      });
    });
    it("calls `accumulator` with `initialValue` if specified", async () => {
      await testStream(async ({ readable, writable, run }) => {
        const source = readable("abc(d|)");
        const accumulator = spy(
          (prev: string, value: string, _index: number) => prev + value,
        );

        const actual = source.pipeThrough(reduce(accumulator, "X"));
        await run([actual], async (actual) => {
          await actual.pipeTo(writable());
        });

        assertEquals(accumulator.calls, [
          { args: ["X", "a", 0], returned: "Xa" },
          { args: ["Xa", "b", 1], returned: "Xab" },
          { args: ["Xab", "c", 2], returned: "Xabc" },
          { args: ["Xabc", "d", 3], returned: "Xabcd" },
        ]);
      });
    });
    describe("calls `accumulator` with `initialValue` that is", () => {
      const tests: [name: string, initialValue: unknown][] = [
        ["null", null],
        ["undefined", undefined],
        ["string", "XYZ"],
        ["number", 0],
        ["NaN", NaN],
        ["false", false],
        ["empty string", ""],
      ];
      for (const [name, initialValue] of tests) {
        it(name, async () => {
          await testStream(async ({ readable, writable, run }) => {
            const source = readable("a--b-c---d|");
            const accumulator = spy(
              (prev: unknown, value: string) => `${prev}` + value,
            );

            const actual = source.pipeThrough(
              reduce(accumulator, initialValue),
            );
            await run([actual], async (actual) => {
              await actual.pipeTo(writable());
            });

            assertSpyCallArgs(accumulator, 0, [initialValue, "a", 0]);
            assertSpyCalls(accumulator, 4);
          });
        });
      }
    });
    it("emits accumulated result when the writable side closes", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("a--b-c---d|");
        const expected = "       ----------(A|)";
        const expectedValues = {
          A: "abcd",
        };
        const accumulator = spy((prev: string, value: string) => prev + value);

        const actual = source.pipeThrough(reduce(accumulator));

        await assertReadable(actual, expected, expectedValues);
        assertSpyCalls(accumulator, 3);
      });
    });
    it("emits accumulated result if `initialValue` specified", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("a--b-c---d|");
        const expected = "       ----------(A|)";
        const expectedValues = {
          A: "Xabcd",
        };
        const accumulator = spy((prev: string, value: string) => prev + value);

        const actual = source.pipeThrough(reduce(accumulator, "X"));

        await assertReadable(actual, expected, expectedValues);
        assertSpyCalls(accumulator, 4);
      });
    });
    it("emits first chunk if the writable side emits only it", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("-a------|", { a: 3 });
        const expected = "       --------(A|)";
        const accumulator = spy(
          (prev: number | string, value: number) => prev + " " + value,
        );

        const actual = source.pipeThrough(reduce(accumulator));

        await assertReadable(actual, expected, { A: 3 });
        assertSpyCalls(accumulator, 0);
      });
    });
    it("does not emits if the writable side emits no chunks", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("--------|");
        const expected = "       --------|";
        const accumulator = spy((prev: string, value: string) => prev + value);

        const actual = source.pipeThrough(reduce(accumulator));

        await assertReadable(actual, expected);
        assertSpyCalls(accumulator, 0);
      });
    });
    it("emits `initialValue` if specified and if the writable side emits no chunks", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("--------|");
        const expected = "       --------(A|)";
        const expectedValues = {
          A: "XYZ",
        };
        const accumulator = spy((prev: string, value: string) => prev + value);

        const actual = source.pipeThrough(reduce(accumulator, "XYZ"));

        await assertReadable(actual, expected, expectedValues);
        assertSpyCalls(accumulator, 0);
      });
    });
    it("terminates when `accumulator` throws", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("-a--b-c---d--e-f-g|", {}, "error");
        const expectedSource = " -a--b-c---(d!)";
        const expected = "       ----------#";
        const accumulator = (prev: string, value: string) => {
          if (value === "d") throw "error";
          return prev + value;
        };

        const actual = source.pipeThrough(reduce(accumulator));

        await assertReadable(actual, expected, {}, "error");
        await assertReadable(source, expectedSource, {}, "error");
      });
    });
    it("terminates when the writable side aborts", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("a--b-c---#", {}, "error");
        const expected = "       ---------#";
        const accumulator = (prev: string, value: string) => prev + value;

        const actual = source.pipeThrough(reduce(accumulator));

        await assertReadable(actual, expected, {}, "error");
      });
    });
    it("terminates when the readable side cancels", async () => {
      await testStream(async ({ readable, writable, run, assertReadable }) => {
        const source = readable("-a-b-c-d-e-f-g|");
        const dest = writable("  --------#", "break");
        const expectedSource = " -a-b-c-d!";
        const expected = "       --------!";
        const accumulator = (prev: string, value: string) => prev + value;

        const actual = source.pipeThrough(reduce(accumulator));

        await run([actual], async (actual) => {
          const reason = await assertRejects(() => actual.pipeTo(dest));
          assertEquals(reason, "break");
        });

        await assertReadable(actual, expected, {}, "break");
        await assertReadable(source, expectedSource, {}, "break");
      });
    });
  });
});
