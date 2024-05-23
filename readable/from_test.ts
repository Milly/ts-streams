import { afterEach, beforeEach, describe, it } from "@std/testing/bdd";
import {
  assert,
  assertEquals,
  assertInstanceOf,
  assertRejects,
  assertThrows,
} from "@std/assert";
import { assertType, type IsExact } from "@std/testing/types";
import { delay } from "@std/async/delay";
import { testStream } from "@milly/streamtest";
import { from } from "./from.ts";

describe("from()", () => {
  describe("returns a ReadableStream<T> type if `input` is", () => {
    it("ReadableStream<T>", () => {
      type T = { x: number };
      const input = new ReadableStream<T>();

      const actual = from(input);

      assertType<IsExact<typeof actual, ReadableStream<T>>>(true);
      assertInstanceOf(actual, ReadableStream);
    });
    it("Array<T>", () => {
      type T = { x: number };
      const input: Array<T> = [];

      const actual = from(input);

      assertType<IsExact<typeof actual, ReadableStream<T>>>(true);
      assertInstanceOf(actual, ReadableStream);
    });
    it("Iterable<T>", () => {
      type T = { x: number };
      const input: Iterable<T> = [];

      const actual = from(input);

      assertType<IsExact<typeof actual, ReadableStream<T>>>(true);
      assertInstanceOf(actual, ReadableStream);
    });
    it("Iterable<Promise<T>>", () => {
      type T = { x: number };
      const input: Iterable<Promise<T>> = [];

      const actual = from(input);

      assertType<IsExact<typeof actual, ReadableStream<T>>>(true);
      assertInstanceOf(actual, ReadableStream);
    });
    it("AsyncIterable<T>", () => {
      type T = { x: number };
      async function* gen(): AsyncGenerator<T, void, unknown> {}
      const input: AsyncIterable<T> = gen();

      const actual = from(input);

      assertType<IsExact<typeof actual, ReadableStream<T>>>(true);
      assertInstanceOf(actual, ReadableStream);
    });
  });
  describe("throws if `input` is", () => {
    // deno-lint-ignore no-explicit-any
    const tests: [name: string, input: any][] = [
      ["null", null],
      ["undefined", undefined],
      ["number", 42],
      ["function", () => {}],
      ["object", { foo: 42 }],
      ["symbol", Symbol.for("some-symbol")],
      ["ArrayLike", { length: 2, "0": "a", "1": "b" }],
    ];
    for (const [name, input] of tests) {
      it(name, () => {
        assertThrows(
          () => from(input),
          TypeError,
        );
      });
    }
  });
  describe("returns a ReadableStream and", () => {
    it("emits each chunk of ReadableStream", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const input = readable("---a--b--(c|)");
        const expectedInput = " ---a--b--(c|)";
        const expected = "      ---a--b--(c|)";

        const actual = from(input);

        await assertReadable(actual, expected);
        await assertReadable(input, expectedInput);
      });
    });
    it("emits each chunk of Array", async () => {
      await testStream(async ({ assertReadable }) => {
        const input = ["a", "b", "c"];
        const expected = "(abc|)";

        const actual = from(input);

        await assertReadable(actual, expected);
      });
    });
    it("emits each chunk of Iterable", async () => {
      await testStream(async ({ assertReadable }) => {
        const input: Iterable<string> = {
          *[Symbol.iterator]() {
            yield "a";
            yield "b";
            yield "c";
          },
        };
        const expected = "(abc|)";

        const actual = from(input);

        await assertReadable(actual, expected);
      });
    });
    it("emits the resolved value of each chunk of Iterable<Promise>", async () => {
      await testStream(async ({ assertReadable }) => {
        const input: Iterable<Promise<string>> = {
          *[Symbol.iterator]() {
            yield delay(100).then(() => "a");
            yield delay(200).then(() => "b");
            yield delay(300).then(() => "c");
          },
        };
        const expected = "-a-b--(c|)";

        const actual = from(input);

        await assertReadable(actual, expected);
      });
    });
    it("emits each chunk of AsyncIterable", async () => {
      await testStream(async ({ assertReadable }) => {
        const input: AsyncIterable<string> = {
          async *[Symbol.asyncIterator]() {
            await delay(300);
            yield "a";
            await delay(300);
            yield "b";
            await delay(300);
            yield "c";
          },
        };
        const expected = "---a--b--(c|)";

        const actual = from(input);

        await assertReadable(actual, expected);
      });
    });
    it("aborts when `input` ReadableStream aborts", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const input = readable("---a--b--#", {}, "error");
        const expected = "      ---a--b--#";

        const actual = from(input);

        await assertReadable(actual, expected, {}, "error");
      });
    });
    it("aborts when `input` Iterable's iterator.next() throws", async () => {
      await testStream(async ({ assertReadable }) => {
        const input = {
          *[Symbol.iterator]() {
            yield "a";
            yield "b";
            throw "error";
          },
        };
        const expected = "(ab#)";

        const actual = from(input);

        await assertReadable(actual, expected, {}, "error");
      });
    });
    it("aborts when `input` Iterable<Promise>'s iterator.next() rejects", async () => {
      await testStream(async ({ assertReadable }) => {
        const input = {
          *[Symbol.iterator]() {
            yield delay(100).then(() => "a");
            yield delay(200).then(() => "b");
            yield delay(300).then(() => {
              throw "error";
            });
          },
        };
        const expected = "-a-b--#";

        const actual = from(input);

        await assertReadable(actual, expected, {}, "error");
      });
    });
    it("aborts when `input` AsyncIterable's iterator.next() rejects", async () => {
      await testStream(async ({ assertReadable }) => {
        const input = {
          async *[Symbol.asyncIterator]() {
            await delay(300);
            yield "a";
            await delay(300);
            yield "b";
            await delay(300);
            throw "error";
          },
        };
        const expected = "---a--b--#";

        const actual = from(input);

        await assertReadable(actual, expected, {}, "error");
      });
    });
    it("cancels `input` ReadableStream when the returned ReadableStream cancels", async () => {
      await testStream(async ({ readable, writable, run, assertReadable }) => {
        const input = readable("---a--b--c--(d|)");
        const expectedInput = " ---a--b--(c!)";
        const dest = writable(" --------#", "cancel");
        const expected = "      ---a--b-!";

        const actual = from(input);

        await run([actual], async (actual) => {
          const reason = await assertRejects(() => actual.pipeTo(dest));
          assertEquals(reason, "cancel");
        });
        await assertReadable(actual, expected, {}, "cancel");
        await assertReadable(input, expectedInput, {}, "cancel");
      });
    });
    it("calls `input` Iterable's iterator.return() when the returned ReadableStream cancels", async () => {
      await testStream(async ({ run, assertReadable }) => {
        const inputLog: string[] = [];
        const inputValues = ["a", "b", "c", "d"];
        const input = {
          [Symbol.iterator]: () => ({
            next: () => {
              const done = inputValues.length === 0;
              const value = inputValues.shift();
              inputLog.push(`next (${done}, ${value})`);
              return { done, value };
            },
            return: (reason?: unknown) => {
              inputLog.push(`return (${reason})`);
              return { done: true };
            },
          }),
        } as Iterable<string>;

        const actual = from(input);

        await run([actual], async (actual) => {
          const reader = actual.getReader();
          assertEquals(await reader.read(), { done: false, value: "a" });
          assertEquals(await reader.read(), { done: false, value: "b" });
          await reader.cancel("cancel");
        });
        await assertReadable(actual, "(ab!)", {}, "cancel");
        assertEquals(inputLog, [
          "next (false, a)",
          "next (false, b)",
          `return (cancel)`,
        ]);
      });
    });
    it("calls `input` Iterable<Promise>'s iterator.return() when the returned ReadableStream cancels", async () => {
      await testStream(async ({ writable, run, assertReadable }) => {
        const inputLog: string[] = [];
        const inputValues = ["a", "b", "c", "d"];
        const input = {
          [Symbol.iterator]: () => ({
            next: () => {
              const done = inputValues.length === 0;
              const value = inputValues.shift();
              const promise = delay(300).then(() => value);
              inputLog.push(`next (${done}, ${value})`);
              return { done, value: promise };
            },
            return: (reason?: unknown) => {
              inputLog.push(`return (${reason})`);
              return { done: true };
            },
          }),
        } as Iterable<string>;
        const dest = writable("--------#", "cancel");
        const expected = "     ---a--b-!";

        const actual = from(input);

        await run([actual], async (actual) => {
          const reason = await assertRejects(() => actual.pipeTo(dest));
          assertEquals(reason, "cancel");
        });
        await assertReadable(actual, expected, {}, "cancel");
        assertEquals(inputLog, [
          "next (false, a)",
          "next (false, b)",
          "next (false, c)",
          `return (cancel)`,
        ]);
      });
    });
    it("calls `input` AsyncIterable's iterator.return() when the returned ReadableStream cancels", async () => {
      await testStream(async ({ writable, run, assertReadable }) => {
        const inputLog: string[] = [];
        const inputValues = ["a", "b", "c", "d"];
        const input = {
          [Symbol.asyncIterator]: () => ({
            next: async () => {
              const done = inputValues.length === 0;
              const value = inputValues.shift();
              inputLog.push(`next (${done}, ${value})`);
              await delay(300);
              return { done, value };
            },
            return: (reason?: unknown) => {
              inputLog.push(`return (${reason})`);
              return Promise.resolve({ done: true });
            },
          }),
        } as AsyncIterable<string>;
        const dest = writable("--------#", "cancel");
        const expected = "     ---a--b-!";

        const actual = from(input);

        await run([actual], async (actual) => {
          const reason = await assertRejects(() => actual.pipeTo(dest));
          assertEquals(reason, "cancel");
        });
        await assertReadable(actual, expected, {}, "cancel");
        assertEquals(inputLog, [
          "next (false, a)",
          "next (false, b)",
          "next (false, c)",
          `return (cancel)`,
        ]);
      });
    });
    describe("does not fires unhandled rejection if", () => {
      let uncaughtError: unknown;
      beforeEach(() => {
        uncaughtError = undefined;
        globalThis.onunhandledrejection = (event) => {
          uncaughtError = event.reason;
          event.preventDefault();
        };
      });
      afterEach(() => {
        globalThis.onunhandledrejection = null;
      });
      it("cancelled before `input` AsyncGenerator resolves", async () => {
        let isYieldB = false;
        async function* gen() {
          await delay(300);
          yield "A";
          await delay(300);
          isYieldB = true;
          yield "B";
        }

        await testStream(async ({ writable, run, assertReadable }) => {
          const dest = writable("-----#", "cancel");
          const expected = "     ---A-!";

          const actual = from(gen());

          await run([actual], async (actual) => {
            const reason = await assertRejects(() => actual.pipeTo(dest));
            assertEquals(reason, "cancel");
          });
          assertEquals(uncaughtError, undefined);
          await assertReadable(actual, expected, {}, "cancel");
        });

        assert(isYieldB);
      });
      it("cancelled before `input` AsyncGenerator rejects", async () => {
        let isThrowError = false;
        async function* gen() {
          await delay(300);
          yield "A";
          await delay(300);
          isThrowError = true;
          throw "error";
        }

        await testStream(async ({ writable, run, assertReadable }) => {
          const dest = writable("-----#", "cancel");
          const expected = "     ---A-!";

          const actual = from(gen());

          await run([actual], async (actual) => {
            const reason = await assertRejects(() => actual.pipeTo(dest));
            assertEquals(reason, "cancel");
          });
          assertEquals(uncaughtError, undefined);
          await assertReadable(actual, expected, {}, "cancel");
        });

        assert(isThrowError);
      });
    });
  });
});
