import { describe, it } from "#bdd";
import { assertInstanceOf } from "@std/assert";
import { assertType, type IsExact } from "@std/testing/types";
import { testStream } from "@milly/streamtest";
import { skip } from "./skip.ts";

const NOOP = () => {};

describe("skip()", () => {
  describe("returns a TransformStream type", () => {
    it("with template <T, T> if `count` is not specified", () => {
      type T = { x: number };
      const source = new ReadableStream<T>();

      const output = source.pipeThrough(skip());

      assertType<IsExact<typeof output, ReadableStream<T>>>(true);
      assertInstanceOf(output, ReadableStream);
    });
    it("with template <T, T> if `count` is specified", () => {
      type T = { x: number };
      const source = new ReadableStream<T>();

      const output = source.pipeThrough(skip(42));

      assertType<IsExact<typeof output, ReadableStream<T>>>(true);
      assertInstanceOf(output, ReadableStream);
    });
  });
  describe("if `count` is not specified", () => {
    it("emits chunks without first chunk", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("-a--b-cd|");
        const expected = "       ----b-cd|";

        const actual = source.pipeThrough(skip());

        await assertReadable(actual, expected);
      });
    });
    it("aborts when the writable side aborts", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("a--b-c---#", {}, "error");
        const expected = "       ---b-c---#";

        const actual = source.pipeThrough(skip());

        await assertReadable(actual, expected, {}, "error");
      });
    });
    it("aborts when the readable side cancels", async () => {
      await testStream(async ({ readable, run, assertReadable }) => {
        const source = readable("-a-b-c-d-e-f-g|");
        const expectedSource = " -a-b-c-(d!)";
        const expected = "       ---b-c-(d!)";

        const actual = source.pipeThrough(skip());

        await run([actual], async (actual) => {
          await actual.pipeTo(
            new WritableStream({
              write(chunk, controller) {
                if (chunk === "d") controller.error("cancel");
              },
            }),
          ).catch(NOOP);
        });

        await assertReadable(actual, expected, {}, "cancel");
        await assertReadable(source, expectedSource, {}, "cancel");
      });
    });
  });
  describe("if `count` is specified", () => {
    describe("if `count` is positive", () => {
      it("emits chunks without first `count` chunks", async () => {
        await testStream(async ({ readable, assertReadable }) => {
          const source = readable("-a--b-cd|");
          const expected = "       -------d|";

          const actual = source.pipeThrough(skip(3));

          await assertReadable(actual, expected);
        });
      });
    });
    describe("if `count` is 0", () => {
      it("emits all chunks", async () => {
        await testStream(async ({ readable, assertReadable }) => {
          const source = readable("-a--b-cd|");
          const expected = "       -a--b-cd|";

          const actual = source.pipeThrough(skip(0));

          await assertReadable(actual, expected);
        });
      });
    });
    describe("if `count` is negative", () => {
      it("emits all chunks", async () => {
        await testStream(async ({ readable, assertReadable }) => {
          const source = readable("-a--b-cd|");
          const expected = "       -a--b-cd|";

          const actual = source.pipeThrough(skip(-42));

          await assertReadable(actual, expected);
        });
      });
    });
    describe("if `count` is Infinity", () => {
      it("does not emits chunks", async () => {
        await testStream(async ({ readable, assertReadable }) => {
          const source = readable("-a--b-cd|");
          const expected = "       --------|";

          const actual = source.pipeThrough(skip(Infinity));

          await assertReadable(actual, expected);
        });
      });
    });
    describe("if `count` is NaN", () => {
      it("does not emits chunks", async () => {
        await testStream(async ({ readable, assertReadable }) => {
          const source = readable("-a--b-cd|");
          const expected = "       --------|";

          const actual = source.pipeThrough(skip(Number.NaN));

          await assertReadable(actual, expected);
        });
      });
    });
    it("aborts when the writable side aborts", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("a--b-c---#", {}, "error");
        const expected = "       ---------#";

        const actual = source.pipeThrough(skip(5));

        await assertReadable(actual, expected, {}, "error");
      });
    });
    it("aborts when the readable side cancels", async () => {
      await testStream(async ({ readable, writable, run, assertReadable }) => {
        const source = readable("-a-b-c-d-e-f-g|");
        const dest = writable("  --------#", "cancel");
        const expectedSource = " -a-b-c-d!";
        const expected = "       --------!";

        const actual = source.pipeThrough(skip(5));

        await run([actual], async (actual) => {
          await actual.pipeTo(dest).catch(NOOP);
        });

        await assertReadable(actual, expected, {}, "cancel");
        await assertReadable(source, expectedSource, {}, "cancel");
      });
    });
  });
});
