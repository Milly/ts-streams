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
import { exhaustMap } from "./exhaust_map.ts";

describe("exhaustMap()", () => {
  describe("returns a TransformStream<I, O> type if `project` is", () => {
    it("(value: I) => ReadableStream<O>", () => {
      type I = { x: string };
      type O = { y: number };
      const project = (_value: I) => new ReadableStream<O>();

      const actual = exhaustMap(project);

      assertType<IsExact<typeof actual, TransformStream<I, O>>>(true);
      assertInstanceOf(actual.readable, ReadableStream);
      assertInstanceOf(actual.writable, WritableStream);
    });
    it("(value: I) => Array<O>", () => {
      type I = { x: string };
      type O = { y: number };
      const project = (_value: I): Array<O> => [];

      const actual = exhaustMap(project);

      assertType<IsExact<typeof actual, TransformStream<I, O>>>(true);
      assertInstanceOf(actual.readable, ReadableStream);
      assertInstanceOf(actual.writable, WritableStream);
    });
    it("(value: I) => Iterable<O>", () => {
      type I = { x: string };
      type O = { y: number };
      const project = (_value: I): Iterable<O> => [];

      const actual = exhaustMap(project);

      assertType<IsExact<typeof actual, TransformStream<I, O>>>(true);
      assertInstanceOf(actual.readable, ReadableStream);
      assertInstanceOf(actual.writable, WritableStream);
    });
    it("(value: I) => Iterable<Promise<O>>", () => {
      type I = { x: string };
      type O = { y: number };
      const project = (_value: I): Iterable<Promise<O>> => [];

      const actual = exhaustMap(project);

      assertType<IsExact<typeof actual, TransformStream<I, O>>>(true);
      assertInstanceOf(actual.readable, ReadableStream);
      assertInstanceOf(actual.writable, WritableStream);
    });
    it("(value: I) => AsyncIterable<O>", () => {
      type I = { x: string };
      type O = { y: number };
      async function* gen(): AsyncGenerator<O, void, unknown> {}
      const project = (_value: I): AsyncIterable<O> => gen();

      const actual = exhaustMap(project);

      assertType<IsExact<typeof actual, TransformStream<I, O>>>(true);
      assertInstanceOf(actual.readable, ReadableStream);
      assertInstanceOf(actual.writable, WritableStream);
    });
  });
  describe("throws if `project` is", () => {
    // deno-lint-ignore no-explicit-any
    const tests: [name: string, project: any][] = [
      ["null", null],
      ["undefined", undefined],
      ["string", "foo"],
      ["number", 42],
      ["object", { foo: 42 }],
      ["symbol", Symbol.for("some-symbol")],
      ["Promise", Promise.resolve(() => [])],
    ];
    for (const [name, project] of tests) {
      it(name, () => {
        assertThrows(
          () => exhaustMap(project),
          TypeError,
        );
      });
    }
  });
  describe("returns a TransformStream and", () => {
    it("calls `project` when the writable side emits if the previous `project` ReadableStream has completed", async () => {
      await testStream(async ({ readable, writable, run, assertReadable }) => {
        const source = readable("-a--bc--d|");
        const project = spy((value: string, _index: number) => {
          return readable("       x-x-x|", { x: value });
        });
        const expectedA = "       a-a-a|";
        //                           b-b-b|
        //                            c-c-c|
        const expectedD = "              d-d-d|";
        const expected = "       -a-a-a--d-d-d|";

        const actual = source.pipeThrough(exhaustMap(project));

        await run([actual], async (actual) => {
          actual.pipeTo(writable());

          // emits 'a' and project called with 'a'
          await delay(101);
          assertSpyCalls(project, 1);
          assertSpyCallArgs(project, 0, ["a", 0]);

          // emits 'b' but project not called
          await delay(300);
          assertSpyCalls(project, 1);

          // emits 'c' but project not called
          await delay(100);
          assertSpyCalls(project, 1);

          // emits 'd' and project called with 'd'
          await delay(300);
          assertSpyCalls(project, 2);
          assertSpyCallArgs(project, 1, ["d", 3]);
        });

        await assertReadable(actual, expected);
        assertSpyCalls(project, 2);
        await assertReadable(project.calls[0].returned!, expectedA);
        await assertReadable(project.calls[1].returned!, expectedD);
      });
    });
    it("emits each chunks of each `project` in exhaust", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const project = spy((value: string) => {
          return readable("       x-x-x|", { x: value });
        });
        const source = readable("-a--b---c|");
        const expectedA = "       a-a-a|";
        //                           b-b-b|
        const expectedC = "              c-c-c|";
        const expected = "       -a-a-a--c-c-c|";

        const actual = source.pipeThrough(exhaustMap(project));

        await assertReadable(actual, expected);
        assertSpyCalls(project, 2);
        await assertReadable(project.calls[0].returned!, expectedA);
        await assertReadable(project.calls[1].returned!, expectedC);
      });
    });
    it("does not emits `project` chunks while under backpressure", async () => {
      await testStream(async ({ readable, writable, run, assertReadable }) => {
        const project = spy((value: string) => {
          return readable("         x-x-x|", { x: value.toUpperCase() });
        });
        const dest = writable("  <--------->     -------------");
        const source = readable("-a--b--c|");
        const expectedA = "       A-A-A|";
        //                           B-B-B|
        const expectedC = "             C-C-     C|";
        const expected = "       -A--------(AACC)C|";
        //                        ^ First chunk after backpressure is alway emits

        const actual = source.pipeThrough(exhaustMap(project));

        await run([actual], async (actual) => {
          await actual.pipeTo(dest);
        });

        await assertReadable(actual, expected);
        await assertReadable(project.calls[0].returned!, expectedA);
        await assertReadable(project.calls[1].returned!, expectedC);
      });
    });
    it("does not emits if `project` returns an empty array", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("--a---b--c---(d|)");
        const expected = "       --a------c---|";
        const project = (value: string) => {
          if (value === "b" || value === "d") return [];
          return [value];
        };

        const actual = source.pipeThrough(exhaustMap(project));

        await assertReadable(actual, expected);
      });
    });
    it("closes if the writable side emits no values", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("------|");
        const expected = "       ------|";
        const project = (value: string) => [value];

        const actual = source.pipeThrough(exhaustMap(project));

        await assertReadable(actual, expected);
      });
    });
    it("closes if the writable side immediately closed", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("|");
        const expected = "       |";
        const project = (value: string) => [value];

        const actual = source.pipeThrough(exhaustMap(project));

        await assertReadable(actual, expected);
      });
    });
    it("terminates when `project` throws", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable(" --a-------|");
        const expectedSource = "  --(a!)";
        const expected = "        --#";
        const project = () => {
          throw "error";
        };

        const actual = source.pipeThrough(exhaustMap(project));

        await assertReadable(actual, expected, {}, "error");
        await assertReadable(source, expectedSource, {}, "error");
      });
    });
    it("terminates when some `project` ReadableStream cancels", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("      -a--------|");
        const expectedSource = "       -a--!";
        const project = () => readable("---#", {}, "error");
        const expected = "             ----#";

        const actual = source.pipeThrough(exhaustMap(project));

        await assertReadable(actual, expected, {}, "error");
        await assertReadable(source, expectedSource, {}, "error");
      });
    });
    it("terminates when the writable side aborts", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("         --a----#", {}, "error");
        const project = spy(() => readable("x--y--z|"));
        const expectedProject = "           x--y-!";
        const expected = "                --x--y-#";

        const actual = source.pipeThrough(exhaustMap(project));

        await assertReadable(actual, expected, {}, "error");
        assertSpyCalls(project, 1);
        await assertReadable(
          project.calls[0].returned!,
          expectedProject,
          {},
          "error",
        );
      });
    });
    it("terminates when the readable side cancels", async () => {
      await testStream(async ({ readable, writable, run, assertReadable }) => {
        const source = readable("         --a---------|");
        const dest = writable("           -------#", "abort");
        const project = spy(() => readable("x--y--z|"));
        const expectedSource = "          --a----!";
        const expectedProject = "           x--y-!";
        const expected = "                --x--y-!";

        const actual = source.pipeThrough(exhaustMap(project));

        await run([actual], async (actual) => {
          const error = await assertRejects(() => actual.pipeTo(dest));
          assertEquals(error, "abort");
        });

        await assertReadable(actual, expected, {}, "abort");
        await assertReadable(source, expectedSource, {}, "abort");
        assertSpyCalls(project, 1);
        await assertReadable(
          project.calls[0].returned!,
          expectedProject,
          {},
          "abort",
        );
      });
    });
  });
});
