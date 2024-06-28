import { afterEach, beforeEach, describe, it } from "#bdd";
import {
  assert,
  assertEquals,
  assertInstanceOf,
  assertRejects,
  assertThrows,
} from "@std/assert";
import { assertType, type IsExact } from "@std/testing/types";
import { assertSpyCalls, spy } from "@std/testing/mock";
import { delay } from "@std/async/delay";
import { testStream } from "@milly/streamtest";
import { defer } from "./defer.ts";

describe("defer()", () => {
  describe("returns a ReadableStream<T> type if `inputFactory` returns", () => {
    it("ReadableStream<T>", () => {
      type T = { x: number };
      const factory = () => new ReadableStream<T>();

      const actual = defer(factory);

      assertType<IsExact<typeof actual, ReadableStream<T>>>(true);
      assertInstanceOf(actual, ReadableStream);
    });
    it("Array<T>", () => {
      type T = { x: number };
      const factory = (): Array<T> => [];

      const actual = defer(factory);

      assertType<IsExact<typeof actual, ReadableStream<T>>>(true);
      assertInstanceOf(actual, ReadableStream);
    });
    it("Iterable<T>", () => {
      type T = { x: number };
      const factory = (): Iterable<T> => [];

      const actual = defer(factory);

      assertType<IsExact<typeof actual, ReadableStream<T>>>(true);
      assertInstanceOf(actual, ReadableStream);
    });
    it("Iterable<Promise<T>>", () => {
      type T = { x: number };
      const factory = (): Iterable<Promise<T>> => [];

      const actual = defer(factory);

      assertType<IsExact<typeof actual, ReadableStream<T>>>(true);
      assertInstanceOf(actual, ReadableStream);
    });
    it("AsyncIterable<T>", () => {
      type T = { x: number };
      async function* gen(): AsyncGenerator<T, void, unknown> {}
      const factory = (): AsyncIterable<T> => gen();

      const actual = defer(factory);

      assertType<IsExact<typeof actual, ReadableStream<T>>>(true);
      assertInstanceOf(actual, ReadableStream);
    });
  });
  describe("returns a ReadableStream<T> type if `inputFactory` resolves", () => {
    it("ReadableStream<T>", () => {
      type T = { x: number };
      const factory = () => Promise.resolve(new ReadableStream<T>());

      const actual = defer(factory);

      assertType<IsExact<typeof actual, ReadableStream<T>>>(true);
      assertInstanceOf(actual, ReadableStream);
    });
    it("Array<T>", () => {
      type T = { x: number };
      const factory = (): Promise<Array<T>> => Promise.resolve([]);

      const actual = defer(factory);

      assertType<IsExact<typeof actual, ReadableStream<T>>>(true);
      assertInstanceOf(actual, ReadableStream);
    });
    it("Iterable<T>", () => {
      type T = { x: number };
      const factory = (): Promise<Iterable<T>> => Promise.resolve([]);

      const actual = defer(factory);

      assertType<IsExact<typeof actual, ReadableStream<T>>>(true);
      assertInstanceOf(actual, ReadableStream);
    });
    it("Iterable<Promise<T>>", () => {
      type T = { x: number };
      const factory = (): Promise<Iterable<Promise<T>>> => Promise.resolve([]);

      const actual = defer(factory);

      assertType<IsExact<typeof actual, ReadableStream<T>>>(true);
      assertInstanceOf(actual, ReadableStream);
    });
    it("AsyncIterable<T>", () => {
      type T = { x: number };
      async function* gen(): AsyncGenerator<T, void, unknown> {}
      const factory = (): Promise<AsyncIterable<T>> => Promise.resolve(gen());

      const actual = defer(factory);

      assertType<IsExact<typeof actual, ReadableStream<T>>>(true);
      assertInstanceOf(actual, ReadableStream);
    });
  });
  describe("throws if `inputFactory` is", () => {
    // deno-lint-ignore no-explicit-any
    const tests: [name: string, inputFactory: any][] = [
      ["null", null],
      ["undefined", undefined],
      ["string", "foo"],
      ["number", 42],
      ["object", { foo: 42 }],
      ["symbol", Symbol.for("some-symbol")],
      ["Promise", Promise.resolve(() => [])],
      ["ArrayLike", { length: 2, "0": "a", "1": "b" }],
    ];
    for (const [name, inputFactory] of tests) {
      it(name, () => {
        assertThrows(
          () => defer(inputFactory),
          TypeError,
          "'inputFactory' is not a function",
        );
      });
    }
  });
  describe("if `inputFactory` is specified", () => {
    it("calls `inputFactory` when the stream pipes", async () => {
      const factory = spy(() => []);

      const actual = defer(factory);

      assertSpyCalls(factory, 0);
      await actual.pipeTo(new WritableStream());
      assertSpyCalls(factory, 1);
    });
  });
  describe("if `inputFactory` returns not a Promise", () => {
    describe("aborts when pipes if `inputFactory` returns", () => {
      // deno-lint-ignore no-explicit-any
      const tests: [name: string, inputFactoryReturn: any][] = [
        ["null", null],
        ["undefined", undefined],
        ["number", 42],
        ["function", () => {}],
        ["object", { foo: 42 }],
        ["symbol", Symbol.for("some-symbol")],
        ["ArrayLike", { length: 2, "0": "a", "1": "b" }],
      ];
      for (const [name, inputFactoryReturn] of tests) {
        it(name, async () => {
          await testStream(async ({ assertReadable }) => {
            const actual = defer(() => inputFactoryReturn);

            await assertReadable(actual, "#", {});
          });
        });
      }
    });
    describe("if `inputFactory` returns a ReadableStream", () => {
      it("emits each chunk of the ReadableStream", async () => {
        await testStream(async ({ readable, assertReadable }) => {
          const factory = spy(() => {
            return readable("     ---a--b--(c|)");
          });
          const expectedInput = " ---a--b--(c|)";
          const expected = "      ---a--b--(c|)";

          const actual = defer(factory);

          await assertReadable(actual, expected);
          const deferStream = factory.calls[0].returned!;
          await assertReadable(deferStream, expectedInput);
        });
      });
      it("aborts when the ReadableStream aborts", async () => {
        await testStream(async ({ readable, assertReadable }) => {
          const factory = spy(() => {
            return readable("---a--b--#", {}, "error");
          });
          const expected = " ---a--b--#";

          const actual = defer(factory);

          await assertReadable(actual, expected, {}, "error");
        });
      });
      it("cancels `inputFactory` returned ReadableStream when cancels", async () => {
        await testStream(
          async ({ readable, writable, run, assertReadable }) => {
            const factory = spy(() => {
              return readable("    ---a--b--c--(d|)");
            });
            const expectedInput = "---a--b-!";
            const dest = writable("--------#", "cancel");
            const expected = "     ---a--b-!";

            const actual = defer(factory);

            await run([actual], async (actual) => {
              const reason = await assertRejects(() => actual.pipeTo(dest));
              assertEquals(reason, "cancel");
            });
            await assertReadable(actual, expected, {}, "cancel");
            const deferStream = factory.calls[0].returned!;
            await assertReadable(deferStream, expectedInput, {}, "cancel");
          },
        );
      });
    });
    describe("if `inputFactory` returns a Array", () => {
      it("emits each chunk of the Array", async () => {
        await testStream(async ({ assertReadable }) => {
          const factory = () => ["a", "b", "c"];
          const expected = "(abc|)";

          const actual = defer(factory);

          await assertReadable(actual, expected);
        });
      });
    });
    describe("if `inputFactory` returns a Iterable", () => {
      it("emits each chunk of the Iterable", async () => {
        await testStream(async ({ assertReadable }) => {
          const factory = (): Iterable<string> => ({
            *[Symbol.iterator]() {
              yield "a";
              yield "b";
              yield "c";
            },
          });
          const expected = "(abc|)";

          const actual = defer(factory);

          await assertReadable(actual, expected);
        });
      });
      it("aborts when iterator.next() throws", async () => {
        await testStream(async ({ assertReadable }) => {
          const factory = () => ({
            *[Symbol.iterator]() {
              yield "a";
              yield "b";
              throw "error";
            },
          });
          const expected = "(ab#)";

          const actual = defer(factory);

          await assertReadable(actual, expected, {}, "error");
        });
      });
      it("calls iterator.return() when cancels", async () => {
        await testStream(async ({ run, assertReadable }) => {
          const inputLog: string[] = [];
          const inputValues = ["a", "b", "c", "d"];
          const factory = () =>
            ({
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
            }) as Iterable<string>;

          const actual = defer(factory);

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
    });
    describe("if `inputFactory` returns a Iterable<Promise>", () => {
      it("emits each resolved chunk of the Iterable<Promise>", async () => {
        await testStream(async ({ assertReadable }) => {
          const factory = (): Iterable<Promise<string>> => ({
            *[Symbol.iterator]() {
              yield delay(100).then(() => "a");
              yield delay(200).then(() => "b");
              yield delay(300).then(() => "c");
            },
          });
          const expected = "-a-b--(c|)";

          const actual = defer(factory);

          await assertReadable(actual, expected);
        });
      });
      it("aborts when iterator.next() rejects", async () => {
        await testStream(async ({ assertReadable }) => {
          const factory = () => ({
            *[Symbol.iterator]() {
              yield delay(100).then(() => "a");
              yield delay(200).then(() => "b");
              yield delay(300).then(() => {
                throw "error";
              });
            },
          });
          const expected = "-a-b--#";

          const actual = defer(factory);

          await assertReadable(actual, expected, {}, "error");
        });
      });
      it("calls iterator.return() when cancels", async () => {
        await testStream(async ({ writable, run, assertReadable }) => {
          const inputLog: string[] = [];
          const inputValues = ["a", "b", "c", "d"];
          const factory = () =>
            ({
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
            }) as Iterable<string>;
          const dest = writable("--------#", "cancel");
          const expected = "     ---a--b-!";

          const actual = defer(factory);

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
    });
    describe("if `inputFactory` returns a AsyncIterable", () => {
      it("emits each chunk of the AsyncIterable", async () => {
        await testStream(async ({ assertReadable }) => {
          const factory = (): AsyncIterable<string> => ({
            async *[Symbol.asyncIterator]() {
              await delay(300);
              yield "a";
              await delay(300);
              yield "b";
              await delay(300);
              yield "c";
            },
          });
          const expected = "---a--b--(c|)";

          const actual = defer(factory);

          await assertReadable(actual, expected);
        });
      });
      it("aborts when iterator.next() rejects", async () => {
        await testStream(async ({ assertReadable }) => {
          const factory = () => ({
            async *[Symbol.asyncIterator]() {
              await delay(300);
              yield "a";
              await delay(300);
              yield "b";
              await delay(300);
              throw "error";
            },
          });
          const expected = "---a--b--#";

          const actual = defer(factory);

          await assertReadable(actual, expected, {}, "error");
        });
      });
      it("calls iterator.return() when cancels", async () => {
        await testStream(async ({ writable, run, assertReadable }) => {
          const inputLog: string[] = [];
          const inputValues = ["a", "b", "c", "d"];
          const factory = () =>
            ({
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
            }) as AsyncIterable<string>;
          const dest = writable("--------#", "cancel");
          const expected = "     ---a--b-!";

          const actual = defer(factory);

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
      it("cancelled before iterator.next() resolves", async () => {
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

          const actual = defer(() => gen());

          await run([actual], async (actual) => {
            const reason = await assertRejects(() => actual.pipeTo(dest));
            assertEquals(reason, "cancel");
          });
          assertEquals(uncaughtError, undefined);
          await assertReadable(actual, expected, {}, "cancel");
        });

        assert(isYieldB);
      });
      it("cancelled before iterator.next() rejects", async () => {
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

          const actual = defer(() => gen());

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
  describe("if `inputFactory` returns a Promise", () => {
    describe("aborts when pipes if `inputFactory` resolves", () => {
      // deno-lint-ignore no-explicit-any
      const tests: [name: string, inputFactoryReturn: any][] = [
        ["null", null],
        ["undefined", undefined],
        ["number", 42],
        ["function", () => {}],
        ["object", { foo: 42 }],
        ["symbol", Symbol.for("some-symbol")],
        ["ArrayLike", { length: 2, "0": "a", "1": "b" }],
      ];
      for (const [name, inputFactoryReturn] of tests) {
        it(name, async () => {
          await testStream(async ({ assertReadable }) => {
            const actual = defer(() => Promise.resolve(inputFactoryReturn));

            await assertReadable(actual, "#", {});
          });
        });
      }
    });
    describe("if `inputFactory` resolves a ReadableStream", () => {
      it("emits each chunk of the ReadableStream", async () => {
        await testStream(async ({ readable, assertReadable }) => {
          const factory = spy(async () => {
            await delay(200);
            return readable("       -a--b--(c|)");
          });
          const expectedInput = "   -a--b--(c|)";
          const expected = "      ---a--b--(c|)";

          const actual = defer(factory);

          await assertReadable(actual, expected);
          const deferStream = await factory.calls[0].returned!;
          await assertReadable(deferStream, expectedInput);
        });
      });
    });
    describe("if `inputFactory` resolves a Array", () => {
      it("emits each chunk of the Array", async () => {
        await testStream(async ({ assertReadable }) => {
          const factory = async (): Promise<Array<string>> => {
            await delay(200);
            return ["a", "b", "c"];
          };
          const expected = "--(abc|)";

          const actual = defer(factory);

          await assertReadable(actual, expected);
        });
      });
    });
    describe("if `inputFactory` resolves a Iterable", () => {
      it("emits each chunk of the Iterable", async () => {
        await testStream(async ({ assertReadable }) => {
          const factory = async (): Promise<Iterable<string>> => {
            await delay(200);
            return {
              *[Symbol.iterator]() {
                yield "a";
                yield "b";
                yield "c";
              },
            };
          };
          const expected = "--(abc|)";

          const actual = defer(factory);

          await assertReadable(actual, expected);
        });
      });
    });
    describe("if `inputFactory` resolves a Iterable<Promise>", () => {
      it("emits each resolved chunk of the Iterable<Promise>", async () => {
        await testStream(async ({ assertReadable }) => {
          const factory = async (): Promise<Iterable<Promise<string>>> => {
            await delay(200);
            return {
              *[Symbol.iterator]() {
                yield delay(100).then(() => "a");
                yield delay(200).then(() => "b");
                yield delay(300).then(() => "c");
              },
            };
          };
          const expected = "---a-b--(c|)";

          const actual = defer(factory);

          await assertReadable(actual, expected);
        });
      });
    });
    describe("if `inputFactory` resolves a AsyncIterable", () => {
      it("emits each chunk of the AsyncIterable", async () => {
        await testStream(async ({ assertReadable }) => {
          const factory = async (): Promise<AsyncIterable<string>> => {
            await delay(200);
            return {
              async *[Symbol.asyncIterator]() {
                await delay(300);
                yield "a";
                await delay(300);
                yield "b";
                await delay(300);
                yield "c";
              },
            };
          };
          const expected = "-----a--b--(c|)";

          const actual = defer(factory);

          await assertReadable(actual, expected);
        });
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
      it("cancelled before `inputFactory` resolves", async () => {
        await testStream(async ({ writable, run, assertReadable }) => {
          const dest = writable("-----#", "cancel");
          const expected = "     -----!";
          const factory = async (): Promise<Array<string>> => {
            await delay(600);
            return ["a"];
          };

          const actual = defer(factory);

          await run([actual], async (actual) => {
            const reason = await assertRejects(() => actual.pipeTo(dest));
            assertEquals(reason, "cancel");
          });
          assertEquals(uncaughtError, undefined);
          await assertReadable(actual, expected, {}, "cancel");
        });
      });
      it("cancelled before `inputFactory` rejects", async () => {
        await testStream(async ({ writable, run, assertReadable }) => {
          const dest = writable("-----#", "cancel");
          const expected = "     -----!";
          const factory = async (): Promise<Array<string>> => {
            await delay(600);
            throw "error";
          };

          const actual = defer(factory);

          await run([actual], async (actual) => {
            const reason = await assertRejects(() => actual.pipeTo(dest));
            assertEquals(reason, "cancel");
          });
          assertEquals(uncaughtError, undefined);
          await assertReadable(actual, expected, {}, "cancel");
        });
      });
      it("`iterator.return()` rejects", async () => {
        await testStream(async ({ writable, run, assertReadable }) => {
          const factory = (): AsyncIterable<string> => ({
            [Symbol.asyncIterator]() {
              return {
                async next() {
                  await delay(500);
                  return { done: true, value: undefined };
                },
                async return() {
                  await delay(100);
                  throw "iterator-return-error";
                },
              };
            },
          });
          const dest = writable("---#", "cancel");
          const expected = "     ---!";

          const actual = defer(factory);

          await run([actual], async (actual) => {
            const reason = await assertRejects(() => actual.pipeTo(dest));
            assertEquals(reason, "iterator-return-error");
          });
          assertEquals(uncaughtError, undefined);
          await assertReadable(actual, expected, {}, "cancel");
        });
      });
    });
  });
});
