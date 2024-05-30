import { describe, it } from "@std/testing/bdd";
import { assertInstanceOf } from "@std/assert";
import { assertType, type IsExact } from "@std/testing/types";
import { assertSpyCalls, spy } from "@std/testing/mock";
import { testStream } from "@milly/streamtest";
import { defer } from "../readable/defer.ts";
import { empty } from "../readable/empty.ts";
import { switchAll } from "./switch_all.ts";

describe("switchAll()", () => {
  describe("returns a TransformStream<X, T> type if X is", () => {
    it("ReadableStream<T>", () => {
      const source = new ReadableStream<
        ReadableStream<string> | ReadableStream<number>
      >();

      const output = source.pipeThrough(switchAll());

      assertType<IsExact<typeof output, ReadableStream<string | number>>>(true);
      assertInstanceOf(output, ReadableStream);
    });
    it("Array<T>", () => {
      const source = new ReadableStream<
        Array<string> | Array<number>
      >();

      const output = source.pipeThrough(switchAll());

      assertType<IsExact<typeof output, ReadableStream<string | number>>>(true);
      assertInstanceOf(output, ReadableStream);
    });
    it("Iterable<T>", () => {
      const source = new ReadableStream<
        Iterable<string> | Iterable<number>
      >();

      const output = source.pipeThrough(switchAll());

      assertType<IsExact<typeof output, ReadableStream<string | number>>>(true);
      assertInstanceOf(output, ReadableStream);
    });
    it("Iterable<Promise<T>>", () => {
      const source = new ReadableStream<
        Iterable<Promise<string>> | Iterable<Promise<number>>
      >();

      const output = source.pipeThrough(switchAll());

      assertType<IsExact<typeof output, ReadableStream<string | number>>>(true);
      assertInstanceOf(output, ReadableStream);
    });
    it("AsyncIterable<T>", () => {
      const source = new ReadableStream<
        AsyncIterable<string> | AsyncIterable<number>
      >();

      const output = source.pipeThrough(switchAll());

      assertType<IsExact<typeof output, ReadableStream<string | number>>>(true);
      assertInstanceOf(output, ReadableStream);
    });
  });
  describe("returns a TransformStream and", () => {
    it("emits each chunk of the most recently higher-order ReadableStream", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const a = spy(() => readable("A-A--A|"));
        const b = spy(() => readable("    B--B--B|"));
        const c = spy(() => readable("        C---C--C|"));
        const values = { a: defer(a), b: defer(b), c: defer(c) };
        const source = readable("    -a---b---c|", values);
        const expectedA = "           A-A-!";
        const expectedB = "               B--B!";
        const expectedC = "                   C---C--C|";
        const expected = "           -A-A-B--BC---C--C|";

        const actual = source.pipeThrough(switchAll());

        await assertReadable(actual, expected);
        await assertReadable(a.calls[0].returned!, expectedA);
        await assertReadable(b.calls[0].returned!, expectedB);
        await assertReadable(c.calls[0].returned!, expectedC);
      });
    });
    it("does not emits if all higher-order ReadableStream is empty", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("--a---b---|", { a: empty(), b: empty() });
        const expected = "       ----------|";

        const actual = source.pipeThrough(switchAll());

        await assertReadable(actual, expected);
      });
    });
    it("closes if the writable side emits no values", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("------|");
        const expected = "       ------|";

        const actual = source.pipeThrough(switchAll());

        await assertReadable(actual, expected);
      });
    });
    it("closes if the writable side immediately closed", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("|");
        const expected = "       |";

        const actual = source.pipeThrough(switchAll());

        await assertReadable(actual, expected);
      });
    });
    it("terminates when some higher-order ReadableStream cancels", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const a = spy(() => readable("------#", {}, "not-thrown-error"));
        const b = spy(() => readable("    ---#", {}, "error"));
        const c = spy(() => readable("        --------|"));
        const values = { a: defer(a), b: defer(b), c: defer(c) };
        const source = readable("    -a---b---c-----|", values);
        const expectedSource = "     -a---b--!";
        const expectedA = "           ----!";
        const expected = "           --------#";

        const actual = source.pipeThrough(switchAll());

        await assertReadable(actual, expected, {}, "error");
        await assertReadable(source, expectedSource, values, "error");
        await assertReadable(a.calls[0].returned!, expectedA);
        assertSpyCalls(c, 0);
      });
    });
    it("terminates when the writable side aborts", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const a = spy(() => readable("A-A-A|"));
        const b = spy(() => readable("   B-B-B|"));
        const values = { a: defer(a), b: defer(b) };
        const source = readable("    -a--b--#", values, "error");
        const expectedA = "           A-A!";
        const expectedB = "              B-B!";
        const expected = "           -A-AB-B#";

        const actual = source.pipeThrough(switchAll());

        await assertReadable(actual, expected, {}, "error");
        await assertReadable(a.calls[0].returned!, expectedA);
        await assertReadable(b.calls[0].returned!, expectedB, {}, "error");
      });
    });
    it("terminates when the readable side cancels", async () => {
      await testStream(async ({ readable, writable, run, assertReadable }) => {
        const a = spy(() => readable("A--B--C--|"));
        const values = { a: defer(a) };
        const source = readable("    -a------|", values);
        const dest = writable("      ------#", "break");
        const expectedSource = "     -a----!";
        const expectedA = "           A--B-!";
        const expected = "           -A--B-!";

        const actual = source.pipeThrough(switchAll());

        await run([actual], (actual) => {
          actual.pipeTo(dest).catch(() => {});
        });

        await assertReadable(actual, expected, {}, "break");
        await assertReadable(source, expectedSource, values, "break");
        await assertReadable(a.calls[0].returned!, expectedA, {}, "break");
      });
    });
  });
});
