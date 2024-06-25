import { describe, it } from "#bdd";
import {
  assertEquals,
  assertInstanceOf,
  assertRejects,
  assertThrows,
} from "@std/assert";
import { assertType, type IsExact } from "@std/testing/types";
import { assertSpyCallArgs, assertSpyCalls, spy } from "@std/testing/mock";
import { delay } from "@std/async/delay";
import { testStream } from "@milly/streamtest";
import { scan } from "./scan.ts";

const NOOP = () => {};

describe("scan()", () => {
  describe("returns a TransformStream type", () => {
    describe("if no `initialValue` is specified", () => {
      it("with template <I, I | A>", () => {
        const accumulator = (
          _prev: number | string,
          _value: number,
          _index: number,
        ): string => "a";

        const stream = scan(accumulator);

        assertType<
          IsExact<typeof stream, TransformStream<number, number | string>>
        >(true);
        assertInstanceOf(stream.readable, ReadableStream);
        assertInstanceOf(stream.writable, WritableStream);
      });
      it("with template <I | Promise<I>, I | Awaited<A>>", () => {
        const accumulator = (
          _prev: number | string,
          _value: number,
          _index: number,
        ): string => "a";

        const stream = scan(accumulator);

        assertType<
          IsExact<typeof stream, TransformStream<number, number | string>>
        >(true);
        assertInstanceOf(stream.readable, ReadableStream);
        assertInstanceOf(stream.writable, WritableStream);
      });
    });
    describe("if `initialValue` is specified", () => {
      it("with template <I, A>", () => {
        const accumulator = (
          _prev: string | boolean,
          _value: number,
          _index: number,
        ): string => "a";
        const initialValue: boolean = true;

        const stream = scan(accumulator, initialValue);

        assertType<
          IsExact<typeof stream, TransformStream<number, string>>
        >(true);
        assertInstanceOf(stream.readable, ReadableStream);
        assertInstanceOf(stream.writable, WritableStream);
      });
      it("with template <I | Promise<I>, I | Awaited<A>>", () => {
        const accumulator = (
          _prev: string | boolean,
          _value: number,
          _index: number,
        ): Promise<string> => Promise.resolve("a");
        const initialValue: Promise<boolean> = Promise.resolve(true);

        const stream = scan(accumulator, initialValue);

        assertType<
          IsExact<
            typeof stream,
            TransformStream<number | Promise<number>, string>
          >
        >(true);
        assertInstanceOf(stream.readable, ReadableStream);
        assertInstanceOf(stream.writable, WritableStream);
      });
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
          () => scan(accumulator),
          TypeError,
          "'accumulator' is not a function",
        );
      });
    }
  });
  describe("if `accumulator` returns not a Promise", () => {
    it("calls `accumulator` with each chunk value and index", async () => {
      await testStream(async ({ readable, writable, run }) => {
        const source = readable("abc(d|)");
        const accumulator = spy(
          (prev: string, value: string, _: number): string => prev + value,
        );

        const actual = source.pipeThrough(scan(accumulator));
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
    it("emits each accumulated result", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("a--b-c---d|");
        const expected = "       A--B-C---D|";
        const expectedValues = {
          A: "a",
          B: "ab",
          C: "abc",
          D: "abcd",
        };
        const accumulator = spy(
          (prev: string, value: string, _: number): string => prev + value,
        );

        const actual = source.pipeThrough(scan(accumulator));

        await assertReadable(actual, expected, expectedValues);
        assertSpyCalls(accumulator, 3);
      });
    });
    describe("if `initialValue` is specified", () => {
      it("calls `accumulator` with `initialValue`", async () => {
        await testStream(async ({ readable, writable, run }) => {
          const source = readable("abc(d|)");
          const accumulator = spy((
            prev: string,
            value: string,
            _index: number,
          ): string => prev + value);

          const actual = source.pipeThrough(scan(accumulator, "X"));
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
      it("emits each accumulated result with `initialValue`", async () => {
        await testStream(async ({ readable, assertReadable }) => {
          const source = readable("a--b-c---d|");
          const expected = "       A--B-C---D|";
          const expectedValues = {
            A: "Xa",
            B: "Xab",
            C: "Xabc",
            D: "Xabcd",
          };
          const accumulator = spy(
            (prev: string, value: string): string => prev + value,
          );

          const actual = source.pipeThrough(scan(accumulator, "X"));

          await assertReadable(actual, expected, expectedValues);
          assertSpyCalls(accumulator, 4);
        });
      });
    });
    it("terminates when `accumulator` throws", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("-a--b-c---d--e-f-g|", {}, "error");
        const expectedSource = " -a--b-c---(d!)";
        const expected = "       -A--B-C---#";
        const expectedValues = {
          A: "a",
          B: "ab",
          C: "abc",
        };
        const accumulator = spy(
          (prev: string, value: string, _index: number): string => {
            if (value === "d") throw "error";
            return prev + value;
          },
        );

        const actual = source.pipeThrough(scan(accumulator));

        await assertReadable(actual, expected, expectedValues, "error");
        await assertReadable(source, expectedSource, {}, "error");
        assertSpyCalls(accumulator, 3);
      });
    });
    it("terminates when the writable side aborts", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("a--b-c---#", {}, "error");
        const expected = "       A--B-C---#";
        const expectedValues = {
          A: "a",
          B: "ab",
          C: "abc",
        };
        const accumulator = spy(
          (prev: string, value: string, _index: number): string => prev + value,
        );

        const actual = source.pipeThrough(scan(accumulator));

        await assertReadable(actual, expected, expectedValues, "error");
        assertSpyCalls(accumulator, 2);
      });
    });
    it("terminates when the readable side cancels", async () => {
      await testStream(async ({ readable, writable, run, assertReadable }) => {
        const source = readable("-a-b-c-d-e-f-g|");
        const dest = writable("  --------#", "break");
        const expectedSource = " -a-b-c-d!";
        const expected = "       -A-B-C-D!";
        const expectedValues = {
          A: "a",
          B: "ab",
          C: "abc",
          D: "abcd",
        };
        const accumulator = spy(
          (prev: string, value: string, _index: number): string => prev + value,
        );

        const actual = source.pipeThrough(scan(accumulator));

        await run([actual], async (actual) => {
          const reason = await assertRejects(() => actual.pipeTo(dest));
          assertEquals(reason, "break");
        });

        await assertReadable(actual, expected, expectedValues, "break");
        await assertReadable(source, expectedSource, {}, "break");
        assertSpyCalls(accumulator, 3);
      });
    });
  });
  describe("if `accumulator` returns a Promise", () => {
    it("calls `accumulator` with each chunk value and index", async () => {
      await testStream(async ({ readable, writable, run }) => {
        const source = readable("abc(d|)");
        const accumulator = spy(
          async (prev: string, value: string, _: number): Promise<string> => {
            await delay(0);
            return prev + value;
          },
        );

        const actual = source.pipeThrough(scan(accumulator));
        await run([actual], async (actual) => {
          await actual.pipeTo(writable());
        });

        assertEquals(accumulator.calls.map((c) => c.args), [
          ["a", "b", 1],
          ["ab", "c", 2],
          ["abc", "d", 3],
        ]);
      });
    });
    it("emits each accumulated result", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("a--b-c---d|");
        const expected = "       A--B-C---D|";
        const expectedValues = {
          A: "a",
          B: "ab",
          C: "abc",
          D: "abcd",
        };
        const accumulator = spy(
          async (
            prev: string,
            value: string,
            _index: number,
          ): Promise<string> => {
            await delay(0);
            return prev + value;
          },
        );

        const actual = source.pipeThrough(scan(accumulator));

        await assertReadable(actual, expected, expectedValues);
        assertSpyCalls(accumulator, 3);
      });
    });
    describe("if `initialValue` is specified", () => {
      it("calls `accumulator` with `initialValue`", async () => {
        await testStream(async ({ readable, writable, run }) => {
          const source = readable("abc(d|)");
          const accumulator = spy(
            async (
              prev: string,
              value: string,
              _index: number,
            ): Promise<string> => {
              await delay(0);
              return prev + value;
            },
          );

          const actual = source.pipeThrough(scan(accumulator, "X"));
          await run([actual], async (actual) => {
            await actual.pipeTo(writable());
          });

          assertEquals(accumulator.calls.map((c) => c.args), [
            ["X", "a", 0],
            ["Xa", "b", 1],
            ["Xab", "c", 2],
            ["Xabc", "d", 3],
          ]);
        });
      });
      it("emits each accumulated result with `initialValue`", async () => {
        await testStream(async ({ readable, assertReadable }) => {
          const source = readable("a--b-c---d|");
          const expected = "       A--B-C---D|";
          const expectedValues = {
            A: "Xa",
            B: "Xab",
            C: "Xabc",
            D: "Xabcd",
          };
          const accumulator = spy(
            async (
              prev: string,
              value: string,
              _index: number,
            ): Promise<string> => {
              await delay(0);
              return prev + value;
            },
          );

          const actual = source.pipeThrough(scan(accumulator, "X"));

          await assertReadable(actual, expected, expectedValues);
          assertSpyCalls(accumulator, 4);
        });
      });
    });
    it("terminates when `accumulator` throws", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("-a--b-c---d--e-f-g|", {}, "error");
        const expectedSource = " -a--b-c---(d!)";
        const expected = "       -A--B-C---#";
        const expectedValues = {
          A: "a",
          B: "ab",
          C: "abc",
        };
        const accumulator = spy(
          async (
            prev: string,
            value: string,
            _index: number,
          ): Promise<string> => {
            await delay(0);
            if (value === "d") throw "error";
            return prev + value;
          },
        );

        const actual = source.pipeThrough(scan(accumulator));

        await assertReadable(actual, expected, expectedValues, "error");
        await assertReadable(source, expectedSource, {}, "error");
        assertSpyCalls(accumulator, 3);
      });
    });
    it("terminates when the writable side aborts", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("a--b-c---#", {}, "error");
        const expected = "       A--B-C---#";
        const expectedValues = {
          A: "a",
          B: "ab",
          C: "abc",
        };
        const accumulator = spy(
          async (
            prev: string,
            value: string,
            _index: number,
          ): Promise<string> => {
            await delay(0);
            return prev + value;
          },
        );

        const actual = source.pipeThrough(scan(accumulator));

        await assertReadable(actual, expected, expectedValues, "error");
        assertSpyCalls(accumulator, 2);
      });
    });
    it("terminates when the readable side cancels", async () => {
      await testStream(async ({ readable, writable, run, assertReadable }) => {
        const source = readable("-a-b-c-d-e-f-g|");
        const dest = writable("  --------#", "break");
        const expectedSource = " -a-b-c-d!";
        const expected = "       -A-B-C-D!";
        const expectedValues = {
          A: "a",
          B: "ab",
          C: "abc",
          D: "abcd",
        };
        const accumulator = spy(
          async (
            prev: string,
            value: string,
            _index: number,
          ): Promise<string> => {
            await delay(0);
            return prev + value;
          },
        );

        const actual = source.pipeThrough(scan(accumulator));

        await run([actual], async (actual) => {
          const reason = await assertRejects(() => actual.pipeTo(dest));
          assertEquals(reason, "break");
        });

        await assertReadable(actual, expected, expectedValues, "break");
        await assertReadable(source, expectedSource, {}, "break");
        assertSpyCalls(accumulator, 3);
      });
    });
  });
  describe("if `initialValue` is specified", () => {
    const tests: [name: string, initialValue: unknown, argValue: unknown][] = [
      ["null", null, null],
      ["undefined", undefined, undefined],
      ["string", "XYZ", "XYZ"],
      ["number", 0, 0],
      ["NaN", Number.NaN, Number.NaN],
      ["false", false, false],
      ["empty string", "", ""],
      ["resolved value of Promise", Promise.resolve("foo"), "foo"],
    ];
    for (const [name, initialValue, argValue] of tests) {
      it(`calls \`accumulator\` with ${name}`, async () => {
        await testStream(async ({ readable, writable, run }) => {
          const source = readable("a--b-c---d|");
          const accumulator = spy((
            prev: unknown,
            value: string,
            _index: number,
          ): string => prev + value);

          const actual = source.pipeThrough(scan(accumulator, initialValue));
          await run([actual], async (actual) => {
            await actual.pipeTo(writable());
          });

          assertSpyCallArgs(accumulator, 0, [argValue, "a", 0]);
          assertSpyCalls(accumulator, 4);
        });
      });
    }
  });
  describe("if `initialValue` rejects", () => {
    it("does not calls `accumulator`", async () => {
      await testStream(async ({ readable, writable, run }) => {
        const source = readable("-a--b--c--|");
        const accumulator = spy(
          (_prev: string, _value: string, _index: number): string => "a",
        );
        const initialValue = delay(500).then(() => {
          throw "error";
        });

        const actual = source.pipeThrough(scan(accumulator, initialValue));
        await run([actual], async (actual) => {
          await actual.pipeTo(writable()).catch(NOOP);
        });

        assertSpyCalls(accumulator, 0);
      });
    });
    it("terminates when `initialValue` rejects", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("-a--b--c--|");
        const expectedSource = " -a---!";
        const expected = "       -----#";
        const accumulator = (
          _prev: string,
          _value: string,
          _index: number,
        ): string => "a";
        const initialValue = delay(500).then(() => {
          throw "error";
        });

        const actual = source.pipeThrough(scan(accumulator, initialValue));

        await assertReadable(actual, expected, {}, "error");
        await assertReadable(source, expectedSource, {}, "error");
      });
    });
  });
  describe("if the writable side emits no chunks", () => {
    it("does not calls `accumulator`", async () => {
      await testStream(async ({ readable, writable, run }) => {
        const source = readable("--------|");
        const accumulator = spy(
          (_prev: string, _value: string, _: number): string => "a",
        );

        const actual = source.pipeThrough(scan(accumulator));
        await run([actual], async (actual) => {
          await actual.pipeTo(writable());
        });

        assertSpyCalls(accumulator, 0);
      });
    });
    it("does not emits", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("--------|");
        const expected = "       --------|";
        const accumulator = (
          prev: string,
          value: string,
          _index: number,
        ): string => prev + value;

        const actual = source.pipeThrough(scan(accumulator));

        await assertReadable(actual, expected);
      });
    });
    describe("if `initialValue` is specified", () => {
      it("does not calls `accumulator`", async () => {
        await testStream(async ({ readable, writable, run }) => {
          const source = readable("--------|");
          const accumulator = spy(
            (_prev: string, _value: string, _index: number): string => "a",
          );

          const actual = source.pipeThrough(scan(accumulator, "XYZ"));
          await run([actual], async (actual) => {
            await actual.pipeTo(writable());
          });

          assertSpyCalls(accumulator, 0);
        });
      });
      it("does not emits `initialValue`", async () => {
        await testStream(async ({ readable, assertReadable }) => {
          const source = readable("--------|");
          const expected = "       --------|";
          const accumulator = (
            prev: string,
            value: string,
            _index: number,
          ): string => prev + value;

          const actual = source.pipeThrough(scan(accumulator, "XYZ"));

          await assertReadable(actual, expected);
        });
      });
    });
  });
  describe("if the writable side emits only one chunk", () => {
    it("does not calls `accumulator`", async () => {
      await testStream(async ({ readable, writable, run }) => {
        const source = readable("-a------|", { a: 3 });
        const accumulator = spy((
          _prev: number | string,
          _value: number,
          _index: number,
        ): string => "a");

        const actual = source.pipeThrough(scan(accumulator));
        await run([actual], async (actual) => {
          await actual.pipeTo(writable());
        });

        assertSpyCalls(accumulator, 0);
      });
    });
    it("emits first chunk", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("-a------|", { a: 3 });
        const expected = "       -A------|";
        const accumulator = (
          _prev: number | string,
          _value: number,
          _index: number,
        ): string => "a";

        const actual = source.pipeThrough(scan(accumulator));

        await assertReadable(actual, expected, { A: 3 });
      });
    });
  });
});
