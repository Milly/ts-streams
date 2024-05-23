import { describe, it } from "@std/testing/bdd";
import { assertInstanceOf } from "@std/assert";
import { assertType, type IsExact } from "@std/testing/types";
import { assertSpyCalls, spy } from "@std/testing/mock";
import { testStream } from "@milly/streamtest";
import { defer } from "../readable/defer.ts";
import { empty } from "../readable/empty.ts";
import { exhaustAll } from "./exhaust_all.ts";

describe("exhaustAll()", () => {
  describe("returns a TransformStream<StreamSource<T>, T> type if the source type is", () => {
    it("ReadableStream<T>", () => {
      const source = new ReadableStream<
        ReadableStream<string> | ReadableStream<number>
      >();

      const output = source.pipeThrough(exhaustAll());

      assertType<IsExact<typeof output, ReadableStream<string | number>>>(true);
      assertInstanceOf(output, ReadableStream);
    });
    it("Array<T>", () => {
      const source = new ReadableStream<
        Array<string> | Array<number>
      >();

      const output = source.pipeThrough(exhaustAll());

      assertType<IsExact<typeof output, ReadableStream<string | number>>>(true);
      assertInstanceOf(output, ReadableStream);
    });
    it("Iterable<T>", () => {
      const source = new ReadableStream<
        Iterable<string> | Iterable<number>
      >();

      const output = source.pipeThrough(exhaustAll());

      assertType<IsExact<typeof output, ReadableStream<string | number>>>(true);
      assertInstanceOf(output, ReadableStream);
    });
    it("Iterable<Promise<T>>", () => {
      const source = new ReadableStream<
        Iterable<Promise<string>> | Iterable<Promise<number>>
      >();

      const output = source.pipeThrough(exhaustAll());

      assertType<IsExact<typeof output, ReadableStream<string | number>>>(true);
      assertInstanceOf(output, ReadableStream);
    });
    it("AsyncIterable<T>", () => {
      const source = new ReadableStream<
        AsyncIterable<string> | AsyncIterable<number>
      >();

      const output = source.pipeThrough(exhaustAll());

      assertType<IsExact<typeof output, ReadableStream<string | number>>>(true);
      assertInstanceOf(output, ReadableStream);
    });
  });
  describe("returns a TransformStream and", () => {
    it("emits chunks of higher-order ReadableStream when the previous higher-order ReadableStream has completed", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const a = spy(() => readable("A--A---A|"));
        const b = spy(() => readable("      B-B-B|"));
        const c = spy(() => readable("            C--C-C--|"));
        const values = { a: defer(a), b: defer(b), c: defer(c) };
        const source = readable("    -a-----b-----c|", values);
        const expected = "           -A--A---A----C--C-C--|";
        const expectedA = "           A--A---A|";
        const expectedC = "                       C--C-C--|";

        const actual = source.pipeThrough(exhaustAll());

        await assertReadable(actual, expected);
        await assertReadable(a.calls[0].returned!, expectedA);
        assertSpyCalls(b, 0);
        await assertReadable(c.calls[0].returned!, expectedC);
      });
    });
    it("does not emits if higher-order ReadableStream is empty", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("--a---b---|", { a: empty(), b: empty() });
        const expected = "       ----------|";

        const actual = source.pipeThrough(exhaustAll());

        await assertReadable(actual, expected);
      });
    });
    it("closes when the writable side emits no values", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("------|");
        const expected = "       ------|";

        const actual = source.pipeThrough(exhaustAll());

        await assertReadable(actual, expected);
      });
    });
    it("closes when the writable side immediately closed", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("|");
        const expected = "       |";

        const actual = source.pipeThrough(exhaustAll());

        await assertReadable(actual, expected);
      });
    });
    it("terminates when some higher-order ReadableStream cancels", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const a = spy(() => readable("-----|"));
        const b = spy(() => readable("   ----#", {}, "not-thrown-error"));
        const c = spy(() => readable("      ---#", {}, "error"));
        const values = { a: defer(a), b: defer(b), c: defer(c) };
        const source = readable("    -a--b--c-----|", values);
        const expectedSource = "     -a--b--c--!";
        const expectedA = "           -----|";
        const expected = "           ----------#";

        const actual = source.pipeThrough(exhaustAll());

        await assertReadable(actual, expected, {}, "error");
        await assertReadable(source, expectedSource, values, "error");
        await assertReadable(a.calls[0].returned!, expectedA, {}, "error");
        assertSpyCalls(b, 0);
      });
    });
    it("terminates when the writable side aborts", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const a = spy(() => readable("A-A-A|"));
        const b = spy(() => readable("   B---B---B|"));
        const c = spy(() => readable("       C-C-C--|"));
        const values = { a: defer(a), b: defer(b), c: defer(c) };
        const source = readable("    -a--b---c--#", values, "error");
        const expectedA = "           A-A-A|";
        const expectedC = "                  C-C!";
        const expected = "           -A-A-A--C-C#";

        const actual = source.pipeThrough(exhaustAll());

        await assertReadable(actual, expected, {}, "error");
        await assertReadable(a.calls[0].returned!, expectedA);
        assertSpyCalls(b, 0);
        await assertReadable(c.calls[0].returned!, expectedC, {}, "error");
      });
    });
    it("terminates when the readable side cancels", async () => {
      await testStream(async ({ readable, writable, run, assertReadable }) => {
        const a = spy(() => readable("A-A-A|"));
        const b = spy(() => readable("   B---B---B|"));
        const c = spy(() => readable("       C-C-C--|"));
        const values = { a: defer(a), b: defer(b), c: defer(c) };
        const source = readable("    -a--b---c----|", values);
        const dest = writable("      -----------#", "break");
        const expectedSource = "     -a--b---c--!";
        const expectedA = "           A-A-A|";
        const expectedC = "                  C-C!";
        const expected = "           -A-A-A--C-C!";

        const actual = source.pipeThrough(exhaustAll());

        await run([actual], (actual) => {
          actual.pipeTo(dest).catch(() => {});
        });

        await assertReadable(actual, expected, {}, "break");
        await assertReadable(source, expectedSource, values, "break");
        await assertReadable(a.calls[0].returned!, expectedA);
        assertSpyCalls(b, 0);
        await assertReadable(c.calls[0].returned!, expectedC, {}, "break");
      });
    });
  });
});
