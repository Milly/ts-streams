import { describe, it } from "#bdd";
import {
  assertEquals,
  assertInstanceOf,
  assertRejects,
  assertThrows,
} from "@std/assert";
import { assertType, type IsExact } from "@std/testing/types";
import { assertSpyCallArgs, assertSpyCalls, spy } from "@std/testing/mock";
import { delay } from "@std/async/delay";
import { testStream } from "@milly/streamtest";
import { forEach } from "./for_each.ts";

describe("forEach()", () => {
  describe("returns a WritableStream<T> type if `fn`", () => {
    it("is `(chunk: T, index: number) => void`", () => {
      type X = { x: number };
      const fn = (_chunk: X, _index: number): void => {};

      const actual = forEach(fn);

      assertType<IsExact<typeof actual, WritableStream<X>>>(true);
      assertInstanceOf(actual, WritableStream);
    });
    it("is `(chunk: T, index: number) => Promise<void>`", () => {
      type X = { x: number };
      const fn = (_chunk: X, _index: number): Promise<void> => {
        return Promise.resolve();
      };

      const actual = forEach(fn);

      assertType<IsExact<typeof actual, WritableStream<X>>>(true);
      assertInstanceOf(actual, WritableStream);
    });
  });
  describe("throws if `fn` is", () => {
    // deno-lint-ignore no-explicit-any
    const tests: [name: string, fn: any][] = [
      ["null", null],
      ["undefined", undefined],
      ["string", "foo"],
      ["number", 42],
      ["object", { foo: 42 }],
      ["symbol", Symbol.for("some-symbol")],
      ["Promise", Promise.resolve(() => {})],
    ];
    for (const [name, fn] of tests) {
      it(name, () => {
        assertThrows(
          () => forEach(fn),
          TypeError,
          "'fn' is not a function",
        );
      });
    }
  });
  describe("if `fn` returns not a Promise", () => {
    it("calls `fn`", async () => {
      await testStream(async ({ readable, run }) => {
        const fn = spy((_chunk: string, _index: number): void => {});
        const source = readable("-a-b--c|");

        await run([source], async (source) => {
          const p = source.pipeTo(forEach(fn));

          await delay(1);
          assertSpyCalls(fn, 0);
          await delay(100);
          assertSpyCalls(fn, 1);
          assertSpyCallArgs(fn, 0, ["a", 0]);
          await delay(200);
          assertSpyCalls(fn, 2);
          assertSpyCallArgs(fn, 1, ["b", 1]);
          await delay(300);
          assertSpyCalls(fn, 3);
          assertSpyCallArgs(fn, 2, ["c", 2]);
          await delay(100);

          await p;
        });
      });
    });
    it("aborts if `fn` throws an error", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const fn = spy((_chunk: string, _index: number): void => {
          throw "error";
        });
        const source = readable("-a-b--c|");
        const expectedSource = " -(a!)";

        const p = source.pipeTo(forEach(fn));
        p.catch(() => {});

        await assertReadable(source, expectedSource, {}, "error");
        const reason = await assertRejects(() => p);
        assertEquals(reason, "error");
        assertSpyCalls(fn, 1);
      });
    });
  });
  describe("if `fn` returns a Promise", () => {
    it("calls `fn`", async () => {
      await testStream(async ({ readable, run }) => {
        const fn = spy(
          async (_chunk: string, _index: number): Promise<void> => {
            await delay(0);
          },
        );
        const source = readable("-a-b--c|");

        await run([source], async (source) => {
          const p = source.pipeTo(forEach(fn));

          await delay(1);
          assertSpyCalls(fn, 0);
          await delay(100);
          assertSpyCalls(fn, 1);
          assertSpyCallArgs(fn, 0, ["a", 0]);
          await delay(200);
          assertSpyCalls(fn, 2);
          assertSpyCallArgs(fn, 1, ["b", 1]);
          await delay(300);
          assertSpyCalls(fn, 3);
          assertSpyCallArgs(fn, 2, ["c", 2]);
          await delay(100);

          await p;
        });
      });
    });
    it("aborts if `fn` throws an error", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const fn = spy(
          async (_chunk: string, _index: number): Promise<void> => {
            await delay(300);
            throw "error";
          },
        );
        const source = readable("-a-b--c|");
        const expectedSource = " -a--!";

        const p = source.pipeTo(forEach(fn));
        p.catch(() => {});

        await assertReadable(source, expectedSource, {}, "error");
        const reason = await assertRejects(() => p);
        assertEquals(reason, "error");
        assertSpyCalls(fn, 1);
      });
    });
  });
});
