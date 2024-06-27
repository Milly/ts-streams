import { describe, it } from "#bdd";
import {
  assertEquals,
  assertInstanceOf,
  assertRejects,
  assertThrows,
} from "@std/assert";
import { assertType, type IsExact } from "@std/testing/types";
import { delay } from "@std/async/delay";
import { testStream } from "@milly/streamtest";
import { deferred } from "../internal/deferred.ts";
import { from } from "../readable/from.ts";
import { transform } from "./transform.ts";

const NOOP = () => {};

describe("transform()", () => {
  describe("returns a TransformStream<I, O> type if `transformer` is", () => {
    it("(value: I) => ReadableStream<O>", () => {
      type I = { x: string };
      type O = { y: number };
      const transformer = (_source: ReadableStream<I>) =>
        new ReadableStream<O>();

      const actual = transform(transformer);

      assertType<IsExact<typeof actual, TransformStream<I, O>>>(true);
      assertInstanceOf(actual.readable, ReadableStream);
      assertInstanceOf(actual.writable, WritableStream);
    });
    it("(value: I) => Array<O>", () => {
      type I = { x: string };
      type O = { y: number };
      const transformer = (_source: ReadableStream<I>): Array<O> => [];

      const actual = transform(transformer);

      assertType<IsExact<typeof actual, TransformStream<I, O>>>(true);
      assertInstanceOf(actual.readable, ReadableStream);
      assertInstanceOf(actual.writable, WritableStream);
    });
    it("(value: I) => Iterable<O>", () => {
      type I = { x: string };
      type O = { y: number };
      const transformer = (_source: ReadableStream<I>): Iterable<O> => [];

      const actual = transform(transformer);

      assertType<IsExact<typeof actual, TransformStream<I, O>>>(true);
      assertInstanceOf(actual.readable, ReadableStream);
      assertInstanceOf(actual.writable, WritableStream);
    });
    it("(value: I) => Iterable<Promise<O>>", () => {
      type I = { x: string };
      type O = { y: number };
      const transformer = (
        _source: ReadableStream<I>,
      ): Iterable<Promise<O>> => [];

      const actual = transform(transformer);

      assertType<IsExact<typeof actual, TransformStream<I, O>>>(true);
      assertInstanceOf(actual.readable, ReadableStream);
      assertInstanceOf(actual.writable, WritableStream);
    });
    it("(value: I) => AsyncIterable<O>", () => {
      type I = { x: string };
      type O = { y: number };
      const transformer = (_source: ReadableStream<I>): AsyncIterable<O> => ({
        async *[Symbol.asyncIterator]() {},
      });

      const actual = transform(transformer);

      assertType<IsExact<typeof actual, TransformStream<I, O>>>(true);
      assertInstanceOf(actual.readable, ReadableStream);
      assertInstanceOf(actual.writable, WritableStream);
    });
    it("(value: I) => AsyncGenerator<O>", () => {
      type I = { x: string };
      type O = { y: number };
      async function* gen(): AsyncGenerator<O, void, unknown> {}
      const transformer = (
        _source: ReadableStream<I>,
      ): AsyncGenerator<O> => gen();

      const actual = transform(transformer);

      assertType<IsExact<typeof actual, TransformStream<I, O>>>(true);
      assertInstanceOf(actual.readable, ReadableStream);
      assertInstanceOf(actual.writable, WritableStream);
    });
  });
  describe("throws if `transformer` is", () => {
    // deno-lint-ignore no-explicit-any
    const tests: [name: string, transformer: any][] = [
      ["null", null],
      ["undefined", undefined],
      ["string", "foo"],
      ["number", 42],
      ["object", { foo: 42 }],
      ["symbol", Symbol.for("some-symbol")],
      ["Promise", Promise.resolve(() => [])],
    ];
    for (const [name, transformer] of tests) {
      it(name, () => {
        assertThrows(
          () => transform(transformer),
          TypeError,
          "'transformer' is not a function",
        );
      });
    }
  });
  describe("if `transformer` throws", () => {
    it("throws an error", () => {
      const transformer = () => {
        throw new Error("my-error");
      };

      assertThrows(
        () => transform(transformer),
        Error,
        "my-error",
      );
    });
  });
  describe("if `transformer` returns `ReadableStream`", () => {
    const transformer = (
      source: ReadableStream<string>,
    ): ReadableStream<string> => {
      return source.pipeThrough(
        new TransformStream({
          transform(value, controller) {
            controller.enqueue(value.toUpperCase());
          },
        }),
      );
    };

    it("emits each chunks of the returned stream", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("-a---b-c|");
        const expected = "       -A---B-C|";

        const actual = source.pipeThrough(transform(transformer));

        await assertReadable(actual, expected);
      });
    });
    it("aborts the readable side when the returned stream aborts", async () => {
      await testStream(async ({ readable, writable, assertReadable }) => {
        const source = readable("a--b--c|");
        const transformer = (source: ReadableStream) => {
          source.pipeTo(writable()).catch(NOOP);
          return readable("      x--y-#", {}, "error");
        };
        const expectedSource = " a--b--c|";
        const expected = "       x--y-#";

        const actual = source.pipeThrough(transform(transformer));

        await assertReadable(actual, expected, {}, "error");
        await assertReadable(source, expectedSource, {}, "error");
      });
    });
    it("aborts when the writable side aborts", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("a--b#", {}, "error");
        const expected = "       A--B#";

        const actual = source.pipeThrough(transform(transformer));

        await assertReadable(actual, expected, {}, "error");
      });
    });
    it("aborts the returned stream when the readable side cancels", async () => {
      await testStream(async ({ readable, writable, run, assertReadable }) => {
        const source = readable(" a--b--c|");
        const dest = writable("   -----#", "abort");
        const expectedSource = "  a--b-!";
        const expected = "        A--B-!";

        const actual = source.pipeThrough(transform(transformer));

        await run([actual], async (actual) => {
          const error = await assertRejects(() => actual.pipeTo(dest));
          assertEquals(error, "abort");
        });

        await assertReadable(actual, expected, {}, "abort");
        await assertReadable(source, expectedSource, {}, "abort");
      });
    });
  });
  describe("if `transformer` returns `AsyncGenerator`", () => {
    const transformer = async function* (source: ReadableStream<string>) {
      for await (const chunk of source) {
        yield chunk.toUpperCase();
      }
    };

    it("emits each chunks of the returned stream", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("-a---b-c|");
        const expected = "       -A---B-C|";

        const actual = source.pipeThrough(transform(transformer));

        await assertReadable(actual, expected);
      });
    });
    it("aborts the readable side when the returned stream aborts", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const transformer = async function* (source: ReadableStream<string>) {
          for await (const chunk of source) {
            if (chunk === "c") throw "error";
            yield chunk.toUpperCase();
          }
        };
        const source = readable("a-b-c-d|");
        const expectedSource = " a-b-(c!)";
        const expected = "       A-B-#";

        const actual = source.pipeThrough(transform(transformer));

        await assertReadable(actual, expected, {}, "error");
        await assertReadable(source, expectedSource);
      });
    });
    it("aborts when the writable side aborts", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("a--b#", {}, "error");
        const expected = "       A--B#";

        const actual = source.pipeThrough(transform(transformer));

        await assertReadable(actual, expected, {}, "error");
      });
    });
    it("breaks the returned stream when the readable side cancels", async () => {
      await testStream(async ({ readable, writable, run, assertReadable }) => {
        const transformerWaiter = deferred<string>();
        const transformer = async function* (source: ReadableStream<string>) {
          try {
            for await (const chunk of source) {
              yield chunk.toUpperCase();
            }
          } catch (e: unknown) {
            // Should not calls this line.
            transformerWaiter.reject(e);
          } finally {
            transformerWaiter.resolve("X");
          }
        };
        const transformerStream = from([transformerWaiter.promise]);
        const source = readable("    a--b--c|");
        const dest = writable("      --#", "abort");
        const expectedSource = "     a--(b!)";
        const expectedTransformer = "---(X|)";
        const expected = "           A-!";

        const actual = source.pipeThrough(transform(transformer));

        await run(
          [actual, transformerStream],
          async (actual, transformerStream) => {
            transformerStream.pipeTo(writable());
            const error = await assertRejects(() => actual.pipeTo(dest));
            assertEquals(error, "abort");
          },
        );

        await assertReadable(actual, expected, {}, "abort");
        await assertReadable(source, expectedSource);
        await assertReadable(transformerStream, expectedTransformer);
      });
    });
  });
  describe("if `transformer` does not closes the source stream", () => {
    it("does not cancel the writable side when the returned stream closes", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const transformer = async function* (_source: ReadableStream<string>) {
          await delay(200);
          yield "X";
          await delay(300);
          yield "Y";
        };
        const source = readable("a-b-c-d|");
        const expectedSource = " a-----------";
        const expected = "       --X--(Y|)";

        const actual = source.pipeThrough(transform(transformer));

        await assertReadable(actual, expected, {}, "error");
        await assertReadable(source, expectedSource);
      });
    });
    it("does not cancel the writable side when the returned stream aborts", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const transformer = async function* (_source: ReadableStream<string>) {
          await delay(200);
          yield "X";
          await delay(300);
          throw "error";
        };
        const source = readable("a-b-c-d|");
        const expectedSource = " a-----------";
        const expected = "       --X--#";

        const actual = source.pipeThrough(transform(transformer));

        await assertReadable(actual, expected, {}, "error");
        await assertReadable(source, expectedSource);
      });
    });
    it("does not cancel the writable side when the readable side cancels", async () => {
      await testStream(async ({ readable, writable, run, assertReadable }) => {
        const transformer = async function* (_source: ReadableStream<string>) {
          await delay(200);
          yield "X";
          await delay(500);
          yield "Y";
        };
        const source = readable("a--b--c|");
        const dest = writable("  -----#", "abort");
        const expectedSource = " a-----------";
        const expected = "       --X--!";

        const actual = source.pipeThrough(transform(transformer));

        await run([actual], async (actual) => {
          const error = await assertRejects(() => actual.pipeTo(dest));
          assertEquals(error, "abort");
        });

        await assertReadable(actual, expected, {}, "abort");
        await assertReadable(source, expectedSource, {}, "abort");
      });
    });
  });
});
