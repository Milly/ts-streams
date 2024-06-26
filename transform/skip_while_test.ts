import { describe, it } from "#bdd";
import { assertEquals, assertInstanceOf, assertThrows } from "@std/assert";
import { assertType, type IsExact } from "@std/testing/types";
import { spy } from "@std/testing/mock";
import { delay } from "@std/async/delay";
import { testStream } from "@milly/streamtest";
import { skipWhile } from "./skip_while.ts";

const NOOP = () => {};

describe("skip()", () => {
  describe("returns a TransformStream type", () => {
    describe("if `predicate` is `BooleanConstructor`", () => {
      it("with template <T, T> type if source chunk contains truthy", () => {
        type T = "a" | 42 | "" | false | 0 | null | undefined;
        const source = new ReadableStream<T>();

        const output = source.pipeThrough(skipWhile(Boolean));

        assertType<IsExact<typeof output, ReadableStream<T>>>(true);
        assertInstanceOf(output, ReadableStream);
      });
      it("with template <T, never> type if souce chunk is falsy", () => {
        type T = "" | false | 0 | null | undefined;
        const source = new ReadableStream<T>();

        const output = source.pipeThrough(skipWhile(Boolean));

        assertType<IsExact<typeof output, ReadableStream<never>>>(true);
        assertInstanceOf(output, ReadableStream);
      });
    });
    it("with template <T, T> type if `predicate` is `(x) => boolean`", () => {
      type T = { x: number };
      const source = new ReadableStream<T>();
      const predicate = (_value: T, _index: number): boolean => true;

      const output = source.pipeThrough(skipWhile(predicate));

      assertType<IsExact<typeof output, ReadableStream<T>>>(true);
      assertInstanceOf(output, ReadableStream);
    });
    it("with template <T, T> type if `predicate` is `(x) => Promise<boolean>`", () => {
      type T = { x: number };
      const source = new ReadableStream<T>();
      const predicate = (
        _value: T,
        _index: number,
      ): Promise<boolean> => Promise.resolve(true);

      const output = source.pipeThrough(skipWhile(predicate));

      assertType<IsExact<typeof output, ReadableStream<T>>>(true);
      assertInstanceOf(output, ReadableStream);
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
          () => skipWhile(predicate),
          TypeError,
          "'predicate' is not a function",
        );
      });
    }
  });
  describe("if `predicate` returns not a Promise", () => {
    describe("if `predicate` always returns true", () => {
      it("calls `predicate` with each chunk value and index", async () => {
        await testStream(async ({ readable, writable, run }) => {
          const source = readable("abc(d|)");
          const predicate = spy(
            (_value: string, _index: number): boolean => true,
          );

          const actual = source.pipeThrough(skipWhile(predicate));
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
      it("does not emits chunks", async () => {
        await testStream(async ({ readable, assertReadable }) => {
          const source = readable("--a-b-c-d|");
          const expected = "       ---------|";
          const predicate = (_value: string, _index: number): boolean => true;

          const actual = source.pipeThrough(skipWhile(predicate));

          await assertReadable(actual, expected);
        });
      });
    });
    describe("if `predicate` always returns false", () => {
      it("calls `predicate` with first chunk value and index", async () => {
        await testStream(async ({ readable, writable, run }) => {
          const source = readable("--a-b-c-(d|)");
          const predicate = spy(
            (_value: string, _index: number): boolean => false,
          );

          const actual = source.pipeThrough(skipWhile(predicate));
          await run([actual], async (actual) => {
            await actual.pipeTo(writable());
          });

          assertEquals(predicate.calls, [{ args: ["a", 0], returned: false }]);
        });
      });
      it("emits all chunks", async () => {
        await testStream(async ({ readable, assertReadable }) => {
          const source = readable("--a-b-c-d|");
          const expected = "       --a-b-c-d|";
          const predicate = (_value: string, _index: number): boolean => false;

          const actual = source.pipeThrough(skipWhile(predicate));

          await assertReadable(actual, expected);
        });
      });
    });
    it("skips chunks while `predicate` returns true and emits all rest chunks", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("--a-b-c-d-e|");
        const expectedSource = " --a-b-c-d-e|";
        const expected = "       ------c-d-e|";
        const predicate = (
          value: string,
          _index: number,
        ): boolean => value !== "c";

        const actual = source.pipeThrough(skipWhile(predicate));

        await assertReadable(actual, expected);
        await assertReadable(source, expectedSource);
      });
    });
    it("aborts when `predicate` throws", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("--a--b-c--d|");
        const expectedSource = " --a--b-(c!)";
        const expected = "       -------#";
        const predicate = (value: string, _index: number): boolean => {
          if (value === "c") throw "error";
          return true;
        };

        const actual = source.pipeThrough(skipWhile(predicate));

        await assertReadable(actual, expected, {}, "error");
        await assertReadable(source, expectedSource);
      });
    });
    it("aborts when the writable side aborts", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("--a--b-c---#", {}, "error");
        const expected = "       -------c---#";
        const predicate = (value: string, _index: number): boolean => {
          return value !== "c";
        };

        const actual = source.pipeThrough(skipWhile(predicate));

        await assertReadable(actual, expected, {}, "error");
      });
    });
    it("cancels when the readable side cancels", async () => {
      await testStream(async ({ readable, writable, run, assertReadable }) => {
        const source = readable("-a-b-c-d-e-f-g|");
        const dest = writable("  ------#", "cancel");
        const expectedSource = " -a-b-c!";
        const expected = "       -----c!";
        const predicate = (value: string, _index: number): boolean => {
          return value !== "c";
        };

        const actual = source.pipeThrough(skipWhile(predicate));

        await run([actual], async (actual) => {
          await actual.pipeTo(dest).catch(NOOP);
        });

        await assertReadable(actual, expected, {}, "cancel");
        await assertReadable(source, expectedSource, {}, "cancel");
      });
    });
  });
  describe("if `predicate` returns a Promise", () => {
    describe("if `predicate` always returns true", () => {
      it("calls `predicate` with each chunk value and index", async () => {
        await testStream(async ({ readable, writable, run }) => {
          const source = readable("abc(d|)");
          const predicate = spy(
            async (_value: string, _index: number): Promise<boolean> => {
              await delay(0);
              return true;
            },
          );

          const actual = source.pipeThrough(skipWhile(predicate));
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
      it("does not emits chunks", async () => {
        await testStream(async ({ readable, assertReadable }) => {
          const source = readable("--a-b-c-d|");
          const expected = "       ---------|";
          const predicate = async (
            _value: string,
            _index: number,
          ): Promise<boolean> => {
            await delay(0);
            return true;
          };

          const actual = source.pipeThrough(skipWhile(predicate));

          await assertReadable(actual, expected);
        });
      });
    });
    describe("if `predicate` always returns false", () => {
      it("calls `predicate` with first chunk value and index", async () => {
        await testStream(async ({ readable, writable, run }) => {
          const source = readable("--a-b-c-(d|)");
          const predicate = spy(
            async (_value: string, _index: number): Promise<boolean> => {
              await delay(0);
              return false;
            },
          );

          const actual = source.pipeThrough(skipWhile(predicate));
          await run([actual], async (actual) => {
            await actual.pipeTo(writable());
          });

          assertEquals(predicate.calls.map((c) => c.args), [["a", 0]]);
        });
      });
      it("emits all chunks", async () => {
        await testStream(async ({ readable, assertReadable }) => {
          const source = readable("--a-b-c-d|");
          const expected = "       --a-b-c-d|";
          const predicate = async (
            _value: string,
            _index: number,
          ): Promise<boolean> => {
            await delay(0);
            return false;
          };

          const actual = source.pipeThrough(skipWhile(predicate));

          await assertReadable(actual, expected);
        });
      });
    });
    it("skips chunks while `predicate` returns true and emits all rest chunks", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("--a-b-c-d-e|");
        const expectedSource = " --a-b-c-d-e|";
        const expected = "       ------c-d-e|";
        const predicate = async (
          value: string,
          _index: number,
        ): Promise<boolean> => {
          await delay(0);
          return value !== "c";
        };

        const actual = source.pipeThrough(skipWhile(predicate));

        await assertReadable(actual, expected);
        await assertReadable(source, expectedSource);
      });
    });
    it("aborts when `predicate` throws", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("--a--b-c--d|");
        const expectedSource = " --a--b-(c!)";
        const expected = "       -------#";
        const predicate = async (
          value: string,
          _index: number,
        ): Promise<boolean> => {
          await delay(0);
          if (value === "c") throw "error";
          return true;
        };

        const actual = source.pipeThrough(skipWhile(predicate));

        await assertReadable(actual, expected, {}, "error");
        await assertReadable(source, expectedSource);
      });
    });
    it("aborts when the writable side aborts", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("--a--b-c---#", {}, "error");
        const expected = "       -------c---#";
        const predicate = async (
          value: string,
          _index: number,
        ): Promise<boolean> => {
          await delay(0);
          return value !== "c";
        };

        const actual = source.pipeThrough(skipWhile(predicate));

        await assertReadable(actual, expected, {}, "error");
      });
    });
    it("cancels when the readable side cancels", async () => {
      await testStream(async ({ readable, writable, run, assertReadable }) => {
        const source = readable("-a-b-c-d-e-f-g|");
        const dest = writable("  ------#", "cancel");
        const expectedSource = " -a-b-c!";
        const expected = "       -----c!";
        const predicate = async (
          value: string,
          _index: number,
        ): Promise<boolean> => {
          await delay(0);
          return value !== "c";
        };

        const actual = source.pipeThrough(skipWhile(predicate));

        await run([actual], async (actual) => {
          await actual.pipeTo(dest).catch(NOOP);
        });

        await assertReadable(actual, expected, {}, "cancel");
        await assertReadable(source, expectedSource, {}, "cancel");
      });
    });
  });
});
