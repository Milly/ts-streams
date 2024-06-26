import { describe, it } from "#bdd";
import { assertInstanceOf } from "@std/assert";
import { assertType, type IsExact } from "@std/testing/types";
import { testStream } from "@milly/streamtest";
import { skipLast } from "./skip_last.ts";

const NOOP = () => {};

describe("skipLast()", () => {
  describe("returns a TransformStream type", () => {
    it("with template <T, T> if `count` is not specified", () => {
      type T = { x: number };
      const source = new ReadableStream<T>();

      const output = source.pipeThrough(skipLast());

      assertType<IsExact<typeof output, ReadableStream<T>>>(true);
      assertInstanceOf(output, ReadableStream);
    });
    it("with template <T, T> if `count` is specified", () => {
      type T = { x: number };
      const source = new ReadableStream<T>();

      const output = source.pipeThrough(skipLast(42));

      assertType<IsExact<typeof output, ReadableStream<T>>>(true);
      assertInstanceOf(output, ReadableStream);
    });
  });
  describe("if `count` is not specified", () => {
    it("buffers and emits chunks without last chunk", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("-a--b-cd|");
        const expected = "       --------(abc|)";

        const actual = source.pipeThrough(skipLast());

        await assertReadable(actual, expected);
      });
    });
    it("aborts when the writable side aborts", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("a--b-c---#", {}, "error");
        const expected = "       ---------#";

        const actual = source.pipeThrough(skipLast());

        await assertReadable(actual, expected, {}, "error");
      });
    });
    it("aborts when the readable side cancels", async () => {
      await testStream(async ({ readable, writable, run, assertReadable }) => {
        const source = readable("-a-b-c-d-e-f-g|");
        const dest = writable("  --------#", "cancel");
        const expectedSource = " -a-b-c-d!";
        const expected = "       --------!";

        const actual = source.pipeThrough(skipLast());

        await run([actual], async (actual) => {
          await actual.pipeTo(dest).catch(NOOP);
        });

        await assertReadable(actual, expected, {}, "cancel");
        await assertReadable(source, expectedSource, {}, "cancel");
      });
    });
  });
  describe("if `count` is specified", () => {
    describe("if `count` is positive", () => {
      it("buffers and emits chunks without last `count` chunks", async () => {
        await testStream(async ({ readable, assertReadable }) => {
          const source = readable("-a--b-cd|");
          const expected = "       --------(a|)";

          const actual = source.pipeThrough(skipLast(3));

          await assertReadable(actual, expected);
        });
      });
    });
    describe("if `count` is 0", () => {
      it("buffers and emits all chunks", async () => {
        await testStream(async ({ readable, assertReadable }) => {
          const source = readable("-a--b-cd|");
          const expected = "       --------(abcd|)";

          const actual = source.pipeThrough(skipLast(0));

          await assertReadable(actual, expected);
        });
      });
    });
    describe("if `count` is negative", () => {
      it("emits all chunks", async () => {
        await testStream(async ({ readable, assertReadable }) => {
          const source = readable("-a--b-cd|");
          const expected = "       --------(abcd|)";

          const actual = source.pipeThrough(skipLast(-42));

          await assertReadable(actual, expected);
        });
      });
    });
    describe("if `count` is Infinity", () => {
      it("does not emits chunks", async () => {
        await testStream(async ({ readable, assertReadable }) => {
          const source = readable("-a--b-cd|");
          const expected = "       --------|";

          const actual = source.pipeThrough(skipLast(Infinity));

          await assertReadable(actual, expected);
        });
      });
    });
    describe("if `count` is NaN", () => {
      it("buffers and emits all chunks", async () => {
        await testStream(async ({ readable, assertReadable }) => {
          const source = readable("-a--b-cd|");
          const expected = "       --------(abcd|)";

          const actual = source.pipeThrough(skipLast(Number.NaN));

          await assertReadable(actual, expected);
        });
      });
    });
    it("aborts when the writable side aborts", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("a--b-c---#", {}, "error");
        const expected = "       ---------#";

        const actual = source.pipeThrough(skipLast(2));

        await assertReadable(actual, expected, {}, "error");
      });
    });
    it("aborts when the readable side cancels", async () => {
      await testStream(async ({ readable, writable, run, assertReadable }) => {
        const source = readable("-a-b-c-d-e-f-g|");
        const dest = writable("  --------#", "cancel");
        const expectedSource = " -a-b-c-d!";
        const expected = "       --------!";

        const actual = source.pipeThrough(skipLast(2));

        await run([actual], async (actual) => {
          await actual.pipeTo(dest).catch(NOOP);
        });

        await assertReadable(actual, expected, {}, "cancel");
        await assertReadable(source, expectedSource, {}, "cancel");
      });
    });
  });
});
