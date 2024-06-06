import { describe, it } from "#bdd";
import { assertType, type IsExact } from "@std/testing/types";
import {
  assertEquals,
  assertInstanceOf,
  assertRejects,
  assertThrows,
} from "@std/assert";
import { testStream } from "@milly/streamtest";
import { empty } from "./empty.ts";
import { mergeWith } from "./merge_with.ts";

describe("mergeWith()", () => {
  describe("returns a ReadableStream<T> type if `inputs` is", () => {
    it("ReadableStream<ReadableStream<T>>", async () => {
      type T = { x: number };
      const inputs = new ReadableStream<ReadableStream<T>>();

      const actual = mergeWith<T>(inputs);
      await actual.cancel();

      assertType<IsExact<typeof actual, ReadableStream<T>>>(true);
      assertInstanceOf(actual, ReadableStream);
    });
    it("Array<Array<T>>", async () => {
      type T = { x: number };
      const inputs: Array<Array<T>> = [];

      const actual = mergeWith<T>(inputs);
      await actual.cancel();

      assertType<IsExact<typeof actual, ReadableStream<T>>>(true);
      assertInstanceOf(actual, ReadableStream);
    });
    it("Iterable<Iterable<T>>", async () => {
      type T = { x: number };
      const inputs: Iterable<Iterable<T>> = [];

      const actual = mergeWith(inputs);
      await actual.cancel();

      assertType<IsExact<typeof actual, ReadableStream<T>>>(true);
      assertInstanceOf(actual, ReadableStream);
    });
    it("Iterable<Promise<Itrable<T>>>", async () => {
      type T = { x: number };
      const inputs: Iterable<Promise<Iterable<T>>> = [];

      const actual = mergeWith(inputs);
      await actual.cancel();

      assertType<IsExact<typeof actual, ReadableStream<T>>>(true);
      assertInstanceOf(actual, ReadableStream);
    });
    it("AsyncIterable<AsyncIterable<T>>", async () => {
      type T = { x: number };
      async function* gen(): AsyncGenerator<AsyncIterable<T>, void, unknown> {}
      const inputs: AsyncIterable<AsyncIterable<T>> = gen();

      const actual = mergeWith(inputs);
      await actual.cancel();

      assertType<IsExact<typeof actual, ReadableStream<T>>>(true);
      assertInstanceOf(actual, ReadableStream);
    });
  });
  describe("throws if `inputs` is", () => {
    // deno-lint-ignore no-explicit-any
    const tests: [name: string, inputs: any][] = [
      ["null", null],
      ["undefined", undefined],
      ["number", 42],
      ["function", () => {}],
      ["object", { foo: 42 }],
      ["symbol", Symbol.for("some-symbol")],
      ["ArrayLike", { length: 2, "0": "a", "1": "b" }],
    ];
    for (const [name, inputs] of tests) {
      it(name, () => {
        assertThrows(
          () => mergeWith(inputs),
          TypeError,
        );
      });
    }
  });
  describe("returns a ReadableStream and", () => {
    it("merge and emits each chunk of higher-order ReadableStream", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const actual = mergeWith([
          readable("       a  ----- a  ----- a  -----|"),
          readable("       b  ---b- -  -----(b|)"),
          readable("       -  ----- c  ----- -  --c|"),
        ]);
        const expected = "(ab)---b-(ac)-----(ab)--c--|";

        await assertReadable(actual, expected);
      });
    });
    it("does not emits if higher-order ReadableStream is empty", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const actual = mergeWith([
          empty(),
          readable("      ------|"),
          readable("      ---|"),
        ]);
        const expected = "------|";

        await assertReadable(actual, expected);
      });
    });
    it("aborts when higher-order ReadableStream aborts", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const a = readable("a----a----a----|");
        const expectedA = " a----a---!";
        const b = readable("---b---b-#", {}, "error");
        const expected = "  a--b-a-b-#";

        const actual = mergeWith([a, b]);

        await assertReadable(actual, expected, {}, "error");
        await assertReadable(a, expectedA, {}, "error");
      });
    });
    it("cancels higher-order ReadableStream when the returned ReadableStream cancels", async () => {
      await testStream(async ({ readable, writable, run, assertReadable }) => {
        const a = readable("   a----a----a----|");
        const expectedA = "    a----a---!";
        const b = readable("   ---b---b|");
        const expectedB = "    ---b---b|";
        const dest = writable("---------#", "cancel");
        const expected = "     a--b-a-b-!";

        const actual = mergeWith([a, b]);

        await run([actual], async (actual) => {
          const reason = await assertRejects(() => actual.pipeTo(dest));
          assertEquals(reason, "cancel");
        });

        await assertReadable(actual, expected, {}, "cancel");
        await assertReadable(a, expectedA, {}, "cancel");
        await assertReadable(b, expectedB);
      });
    });
  });
});
