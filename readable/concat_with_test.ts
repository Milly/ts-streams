import { describe, it } from "#bdd";
import { assertType, type IsExact } from "@std/testing/types";
import {
  assertEquals,
  assertInstanceOf,
  assertRejects,
  assertThrows,
} from "@std/assert";
import { assertSpyCalls, spy } from "@std/testing/mock";
import { testStream } from "@milly/streamtest";
import { defer } from "./defer.ts";
import { empty } from "./empty.ts";
import { concatWith } from "./concat_with.ts";

describe("concatWith()", () => {
  describe("returns a ReadableStream<T> type if `inputs` is", () => {
    it("ReadableStream<ReadableStream<T>>", async () => {
      type T = { x: number };
      const inputs = new ReadableStream<ReadableStream<T>>();

      const actual = concatWith<T>(inputs);
      await actual.cancel();

      assertType<IsExact<typeof actual, ReadableStream<T>>>(true);
      assertInstanceOf(actual, ReadableStream);
    });
    it("Array<Array<T>>", async () => {
      type T = { x: number };
      const inputs: Array<Array<T>> = [];

      const actual = concatWith<T>(inputs);
      await actual.cancel();

      assertType<IsExact<typeof actual, ReadableStream<T>>>(true);
      assertInstanceOf(actual, ReadableStream);
    });
    it("Iterable<Iterable<T>>", async () => {
      type T = { x: number };
      const inputs: Iterable<Iterable<T>> = [];

      const actual = concatWith(inputs);
      await actual.cancel();

      assertType<IsExact<typeof actual, ReadableStream<T>>>(true);
      assertInstanceOf(actual, ReadableStream);
    });
    it("Iterable<Promise<Itrable<T>>>", async () => {
      type T = { x: number };
      const inputs: Iterable<Promise<Iterable<T>>> = [];

      const actual = concatWith(inputs);
      await actual.cancel();

      assertType<IsExact<typeof actual, ReadableStream<T>>>(true);
      assertInstanceOf(actual, ReadableStream);
    });
    it("AsyncIterable<AsyncIterable<T>>", async () => {
      type T = { x: number };
      async function* gen(): AsyncGenerator<AsyncIterable<T>, void, unknown> {}
      const inputs: AsyncIterable<AsyncIterable<T>> = gen();

      const actual = concatWith(inputs);
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
          () => concatWith(inputs),
          TypeError,
        );
      });
    }
  });
  describe("returns a ReadableStream and", () => {
    it("emits each chunk of higher-order ReadableStream in order", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const actual = concatWith([
          defer(() => readable("AB(C|)")),
          defer(() => readable("  E   ---F---|")),
          defer(() => readable("             G--H--I--|")),
        ]);
        const expected = "      AB(CE)---F---G--H--I--|";

        await assertReadable(actual, expected);
      });
    });
    it("does not emits if higher-order ReadableStream is empty", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const actual = concatWith([
          empty(),
          defer(() => readable("------|")),
          defer(() => readable("      ----|")),
        ]);
        const expected = "      ----------|";

        await assertReadable(actual, expected);
      });
    });
    it("aborts when higher-order ReadableStream aborts", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const a = spy(() => readable("--|"));
        const b = spy(() => readable("  ---#", {}, "error"));
        const c = spy(() => readable("     --|"));
        const expectedA = "           --|";
        const expectedB = "             ---#";
        const expected = "            -----#";

        const actual = concatWith([
          defer(a),
          defer(b),
          defer(c),
        ]);

        await assertReadable(actual, expected, {}, "error");
        await assertReadable(a.calls[0].returned!, expectedA);
        await assertReadable(b.calls[0].returned!, expectedB, {}, "error");
        assertSpyCalls(c, 0);
      });
    });
    it("cancels higher-order ReadableStream when the returned ReadableStream cancels", async () => {
      await testStream(async ({ readable, writable, run, assertReadable }) => {
        const a = spy(() => readable("A--B--C--|"));
        const b = spy(() => readable("         X--Y--Z|"));
        const expectedA = "           A--B-!";
        const dest = writable("       -----#", "cancel");
        const expected = "            A--B-!";

        const actual = concatWith([
          defer(a),
          defer(b),
        ]);

        await run([actual], async (actual) => {
          const reason = await assertRejects(() => actual.pipeTo(dest));
          assertEquals(reason, "cancel");
        });

        await assertReadable(actual, expected, {}, "cancel");
        await assertReadable(a.calls[0].returned!, expectedA, {}, "cancel");
        assertSpyCalls(b, 0);
      });
    });
  });
});
