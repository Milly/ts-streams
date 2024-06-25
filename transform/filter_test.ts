import { describe, it } from "#bdd";
import { assertInstanceOf, assertThrows } from "@std/assert";
import { assertEquals } from "@std/assert";
import { assertType, type IsExact } from "@std/testing/types";
import { spy } from "@std/testing/mock";
import { testStream } from "@milly/streamtest";
import { filter } from "./filter.ts";

describe("filter()", () => {
  describe("returns a TransformStream type", () => {
    it("with template <T, T> if `predicate` is `(x) => boolean`", () => {
      type X = { x: number };
      const source = new ReadableStream<X>();

      const output = source.pipeThrough(
        filter((x) => x != null),
      );

      assertType<IsExact<typeof output, ReadableStream<X>>>(true);
      assertInstanceOf(output, ReadableStream);
    });
    it("with template <I, O> if `predicate` is `(x) => x is type`", () => {
      type X = { x: number };
      const source = new ReadableStream<unknown>();

      const output = source.pipeThrough(
        filter((x): x is X => x != null),
      );

      assertType<IsExact<typeof output, ReadableStream<X>>>(true);
      assertInstanceOf(output, ReadableStream);
    });
  });
  describe("throws if `options.predicate` is", () => {
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
          () => filter(predicate),
          TypeError,
          "'predicate' is not a function",
        );
      });
    }
  });
  describe("returns a TransformStream and", () => {
    it("calls `predicate` with each chunk value and index", async () => {
      await testStream(async ({ readable, writable, run }) => {
        const source = readable("a--b-c-(d|)");
        const predicate = spy((_: string, index: number) => index % 2 === 1);

        const actual = source.pipeThrough(filter(predicate));
        await run([actual], async (actual) => {
          await actual.pipeTo(writable());
        });

        assertEquals(predicate.calls, [
          { args: ["a", 0], returned: false },
          { args: ["b", 1], returned: true },
          { args: ["c", 2], returned: false },
          { args: ["d", 3], returned: true },
        ]);
      });
    });
    it("filters chunks by `predicate`", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("a-b-c---d---e(f|)");
        const expected = "       --b-----d----(f|)";

        const actual = source.pipeThrough(
          filter((_, index) => index % 2 === 1),
        );

        await assertReadable(actual, expected);
      });
    });
    it("terminates when `predicat` throws", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("-a-b-c-d-e-f-g|", {}, "error");
        const expectedSource = " -a-b-c-d-e-(f!)";
        const expected = "       -----c-----#";

        const actual = source.pipeThrough(filter((value) => {
          if (value === "f") throw "error";
          return value === "c";
        }));

        await assertReadable(actual, expected, {}, "error");
        await assertReadable(source, expectedSource, {}, "error");
      });
    });
    it("terminates when the writable side aborts", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("-a-b-c-d-e-#", {}, "error");
        const expected = "       -----c-----#";

        const actual = source.pipeThrough(filter((value) => value === "c"));

        await assertReadable(actual, expected, {}, "error");
      });
    });
    it("terminates when the readable side cancels", async () => {
      await testStream(async ({ readable, run, assertReadable }) => {
        const source = readable("-a-b-c-d-e-f-g|");
        const expectedSource = " -a-b-c-(d!)";
        const expected = "       ---b---(d!)";

        const actual = source.pipeThrough(
          filter((_, index) => index % 2 === 1),
        );

        await run([actual], async (actual) => {
          await actual.pipeTo(
            new WritableStream({
              write(chunk, controller) {
                if (chunk === "d") controller.error("break");
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
