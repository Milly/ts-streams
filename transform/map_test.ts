import { describe, it } from "#bdd";
import { assertEquals, assertInstanceOf, assertThrows } from "@std/assert";
import { assertType, type IsExact } from "@std/testing/types";
import { spy } from "@std/testing/mock";
import { delay } from "@std/async/delay";
import { testStream } from "@milly/streamtest";
import { map } from "./map.ts";

describe("map()", () => {
  describe("returns a TransformStream<I, O> type if `project` is", () => {
    it("(value: I) => O", () => {
      type I = { x: string };
      type O = { y: number };
      const project = (_value: I): O => ({ y: 42 });

      const actual = map(project);

      assertType<IsExact<typeof actual, TransformStream<I, O>>>(true);
      assertInstanceOf(actual.readable, ReadableStream);
      assertInstanceOf(actual.writable, WritableStream);
    });
    it("(value: I) => Promise<T>", () => {
      type I = { x: string };
      type O = { y: number };
      const project = (_value: I): Promise<O> => Promise.resolve({ y: 42 });

      const actual = map(project);

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
      ["Promise", Promise.resolve(() => 0)],
    ];
    for (const [name, project] of tests) {
      it(name, () => {
        assertThrows(
          () => map(project),
          TypeError,
          "'project' is not a function",
        );
      });
    }
  });
  describe("returns a TransformStream and", () => {
    it("calls `project` for each chunk from the writable side", async () => {
      await testStream(async ({ readable, writable, run }) => {
        const source = readable("abcd|");
        const project = spy(
          (value: string, _index: number) => value.toUpperCase(),
        );

        await run([], async () => {
          await source
            .pipeThrough(map(project))
            .pipeTo(writable());
        });

        assertEquals(project.calls, [
          { args: ["a", 0], returned: "A" },
          { args: ["b", 1], returned: "B" },
          { args: ["c", 2], returned: "C" },
          { args: ["d", 3], returned: "D" },
        ]);
      });
    });
    it("emits chunk values transformed by `project`", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("a--b-cd---e|");
        const expected = "       A--B-CD---E|";
        const project = (value: string): string => {
          return value.toUpperCase();
        };

        const actual = source.pipeThrough(map(project));

        await assertReadable(actual, expected);
      });
    });
    it("emits resolved chunk values transformed by `project` that returns a Promise", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("a--b-cd---e|");
        const expected = "       A--B-CD---E|";
        const project = async (value: string): Promise<string> => {
          await delay(0);
          return value.toUpperCase();
        };

        const actual = source.pipeThrough(map(project));

        await assertReadable(actual, expected);
      });
    });
    it("terminates when `project` throws", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("-a--b- c  ---d|", {}, "error");
        const expectedSource = " -a--b-(c!)";
        const expected = "       -A--B- #";
        const project = (value: string): string => {
          if (value === "c") throw "error";
          return value.toUpperCase();
        };

        const actual = source.pipeThrough(map(project));

        await assertReadable(actual, expected, {}, "error");
        await assertReadable(source, expectedSource, {}, "error");
      });
    });
    it("terminates when `project` returned Promise rejects", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("-a--b- c  ---d|", {}, "error");
        const expectedSource = " -a--b-(c!)";
        const expected = "       -A--B- #";
        const project = async (value: string): Promise<string> => {
          await Promise.resolve();
          if (value === "c") throw "error";
          return value.toUpperCase();
        };

        const actual = source.pipeThrough(map(project));

        await assertReadable(actual, expected, {}, "error");
        await assertReadable(source, expectedSource, {}, "error");
      });
    });
    it("terminates when the writable side aborts", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("a--b-c---d-#", {}, "error");
        const expected = "       A--B-C---D-#";
        const project = (value: string): string => value.toUpperCase();

        const actual = source.pipeThrough(map(project));

        await assertReadable(actual, expected, {}, "error");
      });
    });
    it("terminates when the readable side cancels", async () => {
      await testStream(async ({ readable, writable, run, assertReadable }) => {
        const source = readable("-a-b-c-d-e-f-g|");
        const expectedSource = " -a-b-c-d!";
        const dest = writable("  --------#", "break");
        const expected = "       -A-B-C-D!";
        const project = (value: string): string => value.toUpperCase();

        const actual = source.pipeThrough(map(project));

        await run([actual], (actual) => {
          actual.pipeTo(dest).catch(() => {});
        });

        await assertReadable(actual, expected, {}, "break");
        await assertReadable(source, expectedSource, {}, "break");
      });
    });
  });
});
