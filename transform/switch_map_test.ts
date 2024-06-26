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
import { switchMap } from "./switch_map.ts";

describe("switchMap()", () => {
  describe("returns a TransformStream<I, O> type if `project` is", () => {
    it("(value: I) => ReadableStream<O>", () => {
      type I = { x: string };
      type O = { y: number };
      const project = (_value: I) => new ReadableStream<O>();

      const actual = switchMap(project);

      assertType<IsExact<typeof actual, TransformStream<I, O>>>(true);
      assertInstanceOf(actual.readable, ReadableStream);
      assertInstanceOf(actual.writable, WritableStream);
    });
    it("(value: I) => Array<O>", () => {
      type I = { x: string };
      type O = { y: number };
      const project = (_value: I): Array<O> => [];

      const actual = switchMap(project);

      assertType<IsExact<typeof actual, TransformStream<I, O>>>(true);
      assertInstanceOf(actual.readable, ReadableStream);
      assertInstanceOf(actual.writable, WritableStream);
    });
    it("(value: I) => Iterable<O>", () => {
      type I = { x: string };
      type O = { y: number };
      const project = (_value: I): Iterable<O> => [];

      const actual = switchMap(project);

      assertType<IsExact<typeof actual, TransformStream<I, O>>>(true);
      assertInstanceOf(actual.readable, ReadableStream);
      assertInstanceOf(actual.writable, WritableStream);
    });
    it("(value: I) => Iterable<Promise<O>>", () => {
      type I = { x: string };
      type O = { y: number };
      const project = (_value: I): Iterable<Promise<O>> => [];

      const actual = switchMap(project);

      assertType<IsExact<typeof actual, TransformStream<I, O>>>(true);
      assertInstanceOf(actual.readable, ReadableStream);
      assertInstanceOf(actual.writable, WritableStream);
    });
    it("(value: I) => AsyncIterable<O>", () => {
      type I = { x: string };
      type O = { y: number };
      async function* gen(): AsyncGenerator<O, void, unknown> {}
      const project = (_value: I): AsyncIterable<O> => gen();

      const actual = switchMap(project);

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
          () => switchMap(project),
          TypeError,
          "'project' is not a function",
        );
      });
    }
  });
  describe("returns a TransformStream and", () => {
    it("calls `project` when the writable side emits", async () => {
      await testStream(async ({ readable, writable, run, assertReadable }) => {
        const source = readable("a---b-c|");
        const project = spy((value: string, _index: number) => {
          return readable("      x--x--x--|", { x: value });
        });
        //                       a--a!
        //                           b-!
        //                             c--c--c--|
        const expected = "       a--ab-c--c--c--|";
        //                +400ms ----^
        //                    +200ms --^

        const actual = source.pipeThrough(switchMap(project));

        await run([actual], async (actual) => {
          actual.pipeTo(writable());

          // emits 'a' and project called with 'a'
          await delay(1);
          assertSpyCalls(project, 1);
          assertSpyCallArgs(project, 0, ["a", 0]);

          // emits 'b' and project called with 'b'
          await delay(400);
          assertSpyCalls(project, 2);
          assertSpyCallArgs(project, 1, ["b", 1]);

          // emits 'c' and project called with 'c'
          await delay(200);
          assertSpyCalls(project, 3);
          assertSpyCallArgs(project, 2, ["c", 2]);
        });

        await assertReadable(actual, expected);
        assertSpyCalls(project, 3);
      });
    });
    it("emits each chunks of only the most recent `project`", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const project = spy((value: string) => {
          return readable("       x-x-x|", { x: value.toUpperCase() });
        });
        const source = readable("-a------b--c|");
        const expectedA = "       A-A-A|";
        const expectedB = "              B-B!";
        const expectedC = "                 C-C-C|";
        const expected = "       -A-A-A--B-BC-C-C|";

        const actual = source.pipeThrough(switchMap(project));

        await assertReadable(actual, expected);
        await assertReadable(project.calls[0].returned!, expectedA);
        await assertReadable(project.calls[1].returned!, expectedB);
        await assertReadable(project.calls[2].returned!, expectedC);
      });
    });
    it("does not emits `project` chunks while under backpressure", async () => {
      await testStream(async ({ readable, writable, run, assertReadable }) => {
        const project = spy((value: string) => {
          return readable("         x-x-x|", { x: value.toUpperCase() });
        });
        const dest = writable("  <--------->   -------------");
        const source = readable("-a--b--c|");
        const expectedA = "       A-A!";
        const expectedB = "          B-B!";
        const expectedC = "             C-C-      C|";
        const expected = "       -A--------(ABBCC)C|";
        //                        ^ First chunk after backpressure is alway emits

        const actual = source.pipeThrough(switchMap(project));

        await run([actual], async (actual) => {
          await actual.pipeTo(dest);
        });

        await assertReadable(actual, expected);
        await assertReadable(project.calls[0].returned!, expectedA);
        await assertReadable(project.calls[1].returned!, expectedB);
        await assertReadable(project.calls[2].returned!, expectedC);
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

        const actual = source.pipeThrough(switchMap(project));

        await assertReadable(actual, expected);
      });
    });
    it("closes if the writable side emits no values", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("------|");
        const expected = "       ------|";
        const project = (value: string) => [value];

        const actual = source.pipeThrough(switchMap(project));

        await assertReadable(actual, expected);
      });
    });
    it("closes if the writable side immediately closed", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("|");
        const expected = "       |";
        const project = (value: string) => [value];

        const actual = source.pipeThrough(switchMap(project));

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

        const actual = source.pipeThrough(switchMap(project));

        await assertReadable(actual, expected, {}, "error");
        await assertReadable(source, expectedSource, {}, "error");
      });
    });
    it("terminates when some `project` ReadableStream cancels", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("      -a--------|");
        const project = () => readable("---#", {}, "error");
        const expectedSource = "       -a--!";
        const expected = "             ----#";

        const actual = source.pipeThrough(switchMap(project));

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

        const actual = source.pipeThrough(switchMap(project));

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

        const actual = source.pipeThrough(switchMap(project));

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
