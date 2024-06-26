import { describe, it } from "#bdd";
import { assertInstanceOf, assertThrows } from "@std/assert";
import { assertSpyCalls, spy } from "@std/testing/mock";
import { assertType, type IsExact } from "@std/testing/types";
import { testStream } from "@milly/streamtest";
import { defaultWith } from "./default_with.ts";

describe("defaultWith()", () => {
  it("returns a TransformStream<T, T | D> type which D is return type of `defaultFactory`", () => {
    const source = new ReadableStream<string>();
    const factory = () => new ReadableStream<number>();

    const output = source.pipeThrough(defaultWith(factory));

    assertType<IsExact<typeof output, ReadableStream<string | number>>>(true);
    assertInstanceOf(output, ReadableStream);
  });
  describe("throws if `defaultFactory` is", () => {
    // deno-lint-ignore no-explicit-any
    const tests: [name: string, defaultFactory: any][] = [
      ["null", null],
      ["undefined", undefined],
      ["string", "foo"],
      ["number", 42],
      ["object", { foo: 42 }],
      ["symbol", Symbol.for("some-symbol")],
      ["Promise", Promise.resolve(() => [])],
    ];
    for (const [name, defaultFactory] of tests) {
      it(name, () => {
        assertThrows(
          () => defaultWith(defaultFactory),
          TypeError,
          "'defaultFactory' is not a function",
        );
      });
    }
  });
  describe("returns a TransformStream and", () => {
    it("emits values from `defaultFactory` if the writable side emits no chunks", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("------|");
        const expectedSource = " ------|";
        const expected = "       ------(XYZ|)";
        const factory = spy(() => ["X", "Y", "Z"]);

        const actual = source.pipeThrough(defaultWith(factory));

        await assertReadable(actual, expected);
        await assertReadable(source, expectedSource);

        assertSpyCalls(factory, 1);
      });
    });
    it("does not calls `defaultFactory` if the writable side emits some chunks", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("--a---|");
        const expectedSource = " --a---|";
        const expected = "       --a---|";
        const factory = spy(() => ["X", "Y", "Z"]);

        const actual = source.pipeThrough(defaultWith(factory));

        await assertReadable(actual, expected);
        await assertReadable(source, expectedSource);
        assertSpyCalls(factory, 0);
      });
    });
    it("terminates when `defaultFactory` throws", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("------|", {}, "error");
        const expectedSource = " ------|";
        const expected = "       ------#";
        const factory = () => {
          throw "error";
        };

        const actual = source.pipeThrough(defaultWith(factory));

        await assertReadable(actual, expected, {}, "error");
        await assertReadable(source, expectedSource, {}, "error");
      });
    });
    it("terminates when the default stream aborts", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("     ------|");
        const expectedSource = "      ------|";
        const factory = spy(() => readable("-X-Y#", {}, "error"));
        const expectedDefaultStream = "     -X-Y#";
        const expected = "            -------X-Y#";

        const actual = source.pipeThrough(defaultWith(factory));

        await assertReadable(actual, expected, {}, "error");
        await assertReadable(source, expectedSource, {}, "error");
        assertSpyCalls(factory, 1);
        const defaultStream = factory.calls[0].returned!;
        await assertReadable(defaultStream, expectedDefaultStream, {}, "error");
      });
    });
    it("terminates and not call `defaultFactory` if the writable side aborts", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("------#", {}, "error");
        const expected = "       ------#";
        const factory = spy(() => ["X", "Y", "Z"]);

        const actual = source.pipeThrough(defaultWith(factory));

        await assertReadable(actual, expected, {}, "error");
        assertSpyCalls(factory, 0);
      });
    });
    it("terminates and not call `defaultFactory` if the readable side cancels before the writable side closed", async () => {
      await testStream(async ({ readable, writable, run, assertReadable }) => {
        const source = readable("---------|");
        const expectedSource = " ------!";
        const dest = writable("  ------#", "break");
        const expected = "       ------!";
        const factory = spy(() => ["X", "Y", "Z"]);

        const actual = source.pipeThrough(defaultWith(factory));

        await run([actual], (actual) => {
          actual.pipeTo(dest).catch(() => {});
        });

        await assertReadable(actual, expected, {}, "break");
        await assertReadable(source, expectedSource, {}, "break");
        assertSpyCalls(factory, 0);
      });
    });
    it("terminates the default stream if the readable side cancels after the writable side closed", async () => {
      await testStream(async ({ readable, writable, run, assertReadable }) => {
        const source = readable("     ------|");
        const expectedSource = "      ------|";
        const factory = spy(() => readable("-X-Y-Z|"));
        const expectedDefaultStream = "     -X-Y!";
        const dest = writable("       ----------#", "break");
        const expected = "            -------X-Y!";

        const actual = source.pipeThrough(defaultWith(factory));

        await run([actual], (actual) => {
          actual.pipeTo(dest).catch(() => {});
        });

        await assertReadable(actual, expected, {}, "break");
        await assertReadable(source, expectedSource, {}, "break");
        assertSpyCalls(factory, 1);
        const defaultStream = factory.calls[0].returned!;
        await assertReadable(defaultStream, expectedDefaultStream, {}, "break");
      });
    });
  });
});
