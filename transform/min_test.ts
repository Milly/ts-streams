import { describe, it } from "#bdd";
import {
  assertEquals,
  assertInstanceOf,
  assertRejects,
  assertThrows,
} from "@std/assert";
import { assertType, type IsExact } from "@std/testing/types";
import { assertSpyCalls, spy } from "@std/testing/mock";
import { delay } from "@std/async/delay";
import { testStream } from "@milly/streamtest";
import { min } from "./min.ts";

describe("min()", () => {
  describe("returns a TransformStream type", () => {
    describe("if no `comparer` is specified", () => {
      it("with template <T | Promise<T>, T>", () => {
        type T = { x: number };

        const stream = min<T>();

        assertType<
          IsExact<typeof stream, TransformStream<T | Promise<T>, T>>
        >(true);
        assertInstanceOf(stream.readable, ReadableStream);
        assertInstanceOf(stream.writable, WritableStream);
      });
    });
    describe("if return type of `comparer` is number", () => {
      it("with template <T | Promise<T>, T>", () => {
        type T = { x: number };
        const comparer = (_a: T, _b: T): number => 0;

        const stream = min(comparer);

        assertType<
          IsExact<typeof stream, TransformStream<T | Promise<T>, T>>
        >(true);
        assertInstanceOf(stream.readable, ReadableStream);
        assertInstanceOf(stream.writable, WritableStream);
      });
    });
    describe("if return type of `comparer` is Promise<number>", () => {
      it("with template <T | Promise<T>, T>", () => {
        type T = { x: number };
        const comparer = (_a: T, _b: T): Promise<number> => Promise.resolve(0);

        const stream = min(comparer);

        assertType<
          IsExact<typeof stream, TransformStream<T | Promise<T>, T>>
        >(true);
        assertInstanceOf(stream.readable, ReadableStream);
        assertInstanceOf(stream.writable, WritableStream);
      });
    });
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
          () => min(comparer),
          TypeError,
          "'comparer' is not a function",
        );
      });
    }
  });
  describe("if no `comparer` is specified", () => {
    it("emits smallest chunk when the writable side closes", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const values = { a: 8, b: 120, c: -80, d: 0 };
        const source = readable("a--b-c---d|", values);
        const expected = "       ----------(A|)";
        const expectedValues = { A: -80 };

        const actual = source.pipeThrough(min());

        await assertReadable(actual, expected, expectedValues);
      });
    });
    describe("if the writable side emits no chunks", () => {
      it("does not emits", async () => {
        await testStream(async ({ readable, assertReadable }) => {
          const source = readable("--------|");
          const expected = "       --------|";

          const actual = source.pipeThrough(min());

          await assertReadable(actual, expected);
        });
      });
    });
    describe("if the writable side emits only one chunk", () => {
      it("emits first chunk when the writable side closes", async () => {
        await testStream(async ({ readable, assertReadable }) => {
          const source = readable("-a------|", { a: 3 });
          const expected = "       --------(A|)";

          const actual = source.pipeThrough(min());

          await assertReadable(actual, expected, { A: 3 });
        });
      });
    });
    it("terminates when the writable side aborts", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("a--b-c---#", {}, "error");
        const expected = "       ---------#";

        const actual = source.pipeThrough(min());

        await assertReadable(actual, expected, {}, "error");
      });
    });
    it("terminates when the readable side cancels", async () => {
      await testStream(async ({ readable, writable, run, assertReadable }) => {
        const source = readable("-a-b-c-d-e-f-g|");
        const dest = writable("  --------#", "break");
        const expectedSource = " -a-b-c-d!";
        const expected = "       --------!";

        const actual = source.pipeThrough(min());

        await run([actual], async (actual) => {
          const reason = await assertRejects(() => actual.pipeTo(dest));
          assertEquals(reason, "break");
        });

        await assertReadable(actual, expected, {}, "break");
        await assertReadable(source, expectedSource, {}, "break");
      });
    });
  });
  describe("if `comparer` returns not a Promise", () => {
    it("calls `comparer` with each chunk value and index", async () => {
      await testStream(async ({ readable, writable, run }) => {
        const source = readable("abc(d|)");
        const comparer = spy(
          (_a: string, _b: string, _index: number): number => 1,
        );

        const actual = source.pipeThrough(min(comparer));

        await run([actual], async (actual) => {
          await actual.pipeTo(writable());
        });

        assertEquals(comparer.calls.map((c) => c.args), [
          ["a", "b", 1],
          ["b", "c", 2],
          ["c", "d", 3],
        ]);
      });
    });
    it("emits smallest chunk when the writable side closes", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("c--a-d---b|");
        const expected = "       ----------(a|)";
        const comparer = (a: string, b: string, _index: number): number => {
          return a.charCodeAt(0) - b.charCodeAt(0);
        };

        const actual = source.pipeThrough(min(comparer));

        await assertReadable(actual, expected);
      });
    });
    it("terminates when `comparer` throws", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("-a--b-c---d--e-f-g|", {}, "error");
        const expectedSource = " -a--b-c---(d!)";
        const expected = "       ----------#";
        const comparer = (_a: string, b: string, _index: number): number => {
          if (b === "d") throw "error";
          return 1;
        };

        const actual = source.pipeThrough(min(comparer));

        await assertReadable(actual, expected, {}, "error");
        await assertReadable(source, expectedSource, {}, "error");
      });
    });
    it("terminates when the writable side aborts", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("a--b-c---#", {}, "error");
        const expected = "       ---------#";
        const comparer = (_a: string, _b: string, _index: number): number => 1;

        const actual = source.pipeThrough(min(comparer));

        await assertReadable(actual, expected, {}, "error");
      });
    });
    it("terminates when the readable side cancels", async () => {
      await testStream(async ({ readable, writable, run, assertReadable }) => {
        const source = readable("-a-b-c-d-e-f-g|");
        const dest = writable("  --------#", "break");
        const expectedSource = " -a-b-c-d!";
        const expected = "       --------!";
        const comparer = (_a: string, _b: string, _index: number): number => 1;

        const actual = source.pipeThrough(min(comparer));

        await run([actual], async (actual) => {
          const reason = await assertRejects(() => actual.pipeTo(dest));
          assertEquals(reason, "break");
        });

        await assertReadable(actual, expected, {}, "break");
        await assertReadable(source, expectedSource, {}, "break");
      });
    });
  });
  describe("if `comparer` returns a Promise", () => {
    it("calls `comparer` with each chunk value and index", async () => {
      await testStream(async ({ readable, writable, run }) => {
        const source = readable("abc(d|)");
        const comparer = spy(
          async (_a: string, _b: string, _index: number): Promise<number> => {
            await delay(0);
            return 1;
          },
        );

        const actual = source.pipeThrough(min(comparer));

        await run([actual], async (actual) => {
          await actual.pipeTo(writable());
        });

        assertEquals(comparer.calls.map((c) => c.args), [
          ["a", "b", 1],
          ["b", "c", 2],
          ["c", "d", 3],
        ]);
      });
    });
    it("emits smallest chunk when the writable side closes", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("c--a-d---b|");
        const expected = "       ----------(a|)";
        const comparer = async (
          a: string,
          b: string,
          _index: number,
        ): Promise<number> => {
          await delay(0);
          return a.charCodeAt(0) - b.charCodeAt(0);
        };

        const actual = source.pipeThrough(min(comparer));

        await assertReadable(actual, expected);
      });
    });
    it("terminates when `comparer` throws", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("-a--b-c---d--e-f-g|", {}, "error");
        const expectedSource = " -a--b-c---(d!)";
        const expected = "       ----------#";
        const comparer = async (
          _a: string,
          b: string,
          _index: number,
        ): Promise<number> => {
          await delay(0);
          if (b === "d") throw "error";
          return 1;
        };

        const actual = source.pipeThrough(min(comparer));

        await assertReadable(actual, expected, {}, "error");
        await assertReadable(source, expectedSource, {}, "error");
      });
    });
    it("terminates when the writable side aborts", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("a--b-c---#", {}, "error");
        const expected = "       ---------#";
        const comparer = async (
          _a: string,
          _b: string,
          _index: number,
        ): Promise<number> => {
          await delay(0);
          return 1;
        };

        const actual = source.pipeThrough(min(comparer));

        await assertReadable(actual, expected, {}, "error");
      });
    });
    it("terminates when the readable side cancels", async () => {
      await testStream(async ({ readable, writable, run, assertReadable }) => {
        const source = readable("-a-b-c-d-e-f-g|");
        const dest = writable("  --------#", "break");
        const expectedSource = " -a-b-c-d!";
        const expected = "       --------!";
        const comparer = async (
          _a: string,
          _b: string,
          _index: number,
        ): Promise<number> => {
          await delay(0);
          return 1;
        };

        const actual = source.pipeThrough(min(comparer));

        await run([actual], async (actual) => {
          const reason = await assertRejects(() => actual.pipeTo(dest));
          assertEquals(reason, "break");
        });

        await assertReadable(actual, expected, {}, "break");
        await assertReadable(source, expectedSource, {}, "break");
      });
    });
  });
  describe("if the writable side emits no chunks", () => {
    it("does not calls `comparer`", async () => {
      await testStream(async ({ readable, writable, run }) => {
        const source = readable("--------|");
        const comparer = spy(
          (_a: string, _b: string, _index: number): number => 1,
        );

        const actual = source.pipeThrough(min(comparer));

        await run([actual], async (actual) => {
          await actual.pipeTo(writable());
        });

        assertSpyCalls(comparer, 0);
      });
    });
    it("does not emits", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("--------|");
        const expected = "       --------|";
        const comparer = (_a: string, _b: string, _index: number): number => 1;

        const actual = source.pipeThrough(min(comparer));

        await assertReadable(actual, expected);
      });
    });
  });
  describe("if the writable side emits only one chunk", () => {
    it("does not calls `comparer`", async () => {
      await testStream(async ({ readable, writable, run }) => {
        const source = readable("-a------|", { a: 3 });
        const comparer = spy(
          (_a: number, _b: number, _index: number): number => 1,
        );

        const actual = source.pipeThrough(min(comparer));

        await run([actual], async (actual) => {
          await actual.pipeTo(writable());
        });

        assertSpyCalls(comparer, 0);
      });
    });
    it("emits first chunk when the writable side closes", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("-a------|", { a: 3 });
        const expected = "       --------(A|)";
        const comparer = (_a: number, _b: number, _index: number): number => 1;

        const actual = source.pipeThrough(min(comparer));

        await assertReadable(actual, expected, { A: 3 });
      });
    });
  });
});
