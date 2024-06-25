import { describe, it } from "#bdd";
import { assertInstanceOf, assertThrows } from "@std/assert";
import { assertSpyCalls, spy } from "@std/testing/mock";
import { assertType, type IsExact } from "@std/testing/types";
import { delay } from "@std/async/delay";
import { testStream } from "@milly/streamtest";
import { defaultWith } from "./default_with.ts";

describe("defaultWith()", () => {
  describe("returns a TransformStream<T, T | D> type if `inputFactory` returns", () => {
    it("ReadableStream<D>", () => {
      type T = { x: number };
      type D = { y: string };
      const source = new ReadableStream<T>();
      const factory = (): ReadableStream<D> => new ReadableStream();

      const output = source.pipeThrough(defaultWith(factory));

      assertType<IsExact<typeof output, ReadableStream<T | D>>>(true);
      assertInstanceOf(output, ReadableStream);
    });
    it("Array<D>", () => {
      type T = { x: number };
      type D = { y: string };
      const source = new ReadableStream<T>();
      const factory = (): Array<D> => [];

      const output = source.pipeThrough(defaultWith(factory));

      assertType<IsExact<typeof output, ReadableStream<T | D>>>(true);
      assertInstanceOf(output, ReadableStream);
    });
    it("Iterable<D>", () => {
      type T = { x: number };
      type D = { y: string };
      const source = new ReadableStream<T>();
      const factory = (): Iterable<D> => [];

      const output = source.pipeThrough(defaultWith(factory));

      assertType<IsExact<typeof output, ReadableStream<T | D>>>(true);
      assertInstanceOf(output, ReadableStream);
    });
    it("Iterable<Promise<D>>", () => {
      type T = { x: number };
      type D = { y: string };
      const source = new ReadableStream<T>();
      const factory = (): Iterable<Promise<D>> => [];

      const output = source.pipeThrough(defaultWith(factory));

      assertType<IsExact<typeof output, ReadableStream<T | D>>>(true);
      assertInstanceOf(output, ReadableStream);
    });
    it("AsyncIterable<Promise<D>>", () => {
      type T = { x: number };
      type D = { y: string };
      const source = new ReadableStream<T>();
      async function* gen(): AsyncGenerator<D, void, unknown> {}
      const factory = (): AsyncIterable<D> => gen();

      const output = source.pipeThrough(defaultWith(factory));

      assertType<IsExact<typeof output, ReadableStream<T | D>>>(true);
      assertInstanceOf(output, ReadableStream);
    });
  });
  describe("returns a TransformStream<T, T | D> type if `inputFactory` resolves", () => {
    it("ReadableStream<D>", () => {
      type T = { x: number };
      type D = { y: string };
      const source = new ReadableStream<T>();
      const factory = (): Promise<ReadableStream<D>> =>
        Promise.resolve(new ReadableStream());

      const output = source.pipeThrough(defaultWith(factory));

      assertType<IsExact<typeof output, ReadableStream<T | D>>>(true);
      assertInstanceOf(output, ReadableStream);
    });
    it("Array<D>", () => {
      type T = { x: number };
      type D = { y: string };
      const source = new ReadableStream<T>();
      const factory = (): Promise<Array<D>> => Promise.resolve([]);

      const output = source.pipeThrough(defaultWith(factory));

      assertType<IsExact<typeof output, ReadableStream<T | D>>>(true);
      assertInstanceOf(output, ReadableStream);
    });
    it("Iterable<D>", () => {
      type T = { x: number };
      type D = { y: string };
      const source = new ReadableStream<T>();
      const factory = (): Promise<Iterable<D>> => Promise.resolve([]);

      const output = source.pipeThrough(defaultWith(factory));

      assertType<IsExact<typeof output, ReadableStream<T | D>>>(true);
      assertInstanceOf(output, ReadableStream);
    });
    it("Iterable<Promise<D>>", () => {
      type T = { x: number };
      type D = { y: string };
      const source = new ReadableStream<T>();
      const factory = (): Promise<Iterable<Promise<D>>> => Promise.resolve([]);

      const output = source.pipeThrough(defaultWith(factory));

      assertType<IsExact<typeof output, ReadableStream<T | D>>>(true);
      assertInstanceOf(output, ReadableStream);
    });
    it("AsyncIterable<Promise<D>>", () => {
      type T = { x: number };
      type D = { y: string };
      const source = new ReadableStream<T>();
      async function* gen(): AsyncGenerator<D, void, unknown> {}
      const factory = (): Promise<AsyncIterable<D>> => Promise.resolve(gen());

      const output = source.pipeThrough(defaultWith(factory));

      assertType<IsExact<typeof output, ReadableStream<T | D>>>(true);
      assertInstanceOf(output, ReadableStream);
    });
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
  describe("if `defaultFactory` is specified", () => {
    describe("if the writable side emits some chunks", () => {
      it("does not calls `defaultFactory`", async () => {
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
    });
    describe("if the writable side aborts", () => {
      it("does not call `defaultFactory`", async () => {
        await testStream(async ({ readable, assertReadable }) => {
          const source = readable("------#", {}, "error");
          const expected = "       ------#";
          const factory = spy(() => ["X", "Y", "Z"]);

          const actual = source.pipeThrough(defaultWith(factory));

          await assertReadable(actual, expected, {}, "error");
          assertSpyCalls(factory, 0);
        });
      });
    });
    describe("if the readable side cancels before the writable side closes", () => {
      it("does not call `defaultFactory`", async () => {
        await testStream(
          async ({ readable, writable, run, assertReadable }) => {
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
          },
        );
      });
    });
  });
  describe("if `defaultFactory` returns not a Promise", () => {
    describe("if the writable side emits no chunks", () => {
      describe("terminates when the writable side closes if `defaultFactory` returns", () => {
        // deno-lint-ignore no-explicit-any
        const tests: [name: string, inputFactoryReturn: any][] = [
          ["null", null],
          ["undefined", undefined],
          ["number", 42],
          ["function", () => {}],
          ["object", { foo: 42 }],
          ["symbol", Symbol.for("some-symbol")],
          ["ArrayLike", { length: 2, "0": "a", "1": "b" }],
        ];
        for (const [name, inputFactoryReturn] of tests) {
          it(name, async () => {
            await testStream(async ({ readable, assertReadable }) => {
              const source = readable("--|");
              const expected = "       --#";
              const factory = () => inputFactoryReturn;

              const actual = source.pipeThrough(defaultWith(factory));

              await assertReadable(actual, expected, {});
            });
          });
        }
      });
      it("emits values from `defaultFactory` after the writable side closes", async () => {
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
    describe("if the readable side cancels after the writable side closes", () => {
      it("terminates the default stream", async () => {
        await testStream(
          async ({ readable, writable, run, assertReadable }) => {
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
            await assertReadable(
              defaultStream,
              expectedDefaultStream,
              {},
              "break",
            );
          },
        );
      });
    });
  });
  describe("if `defaultFactory` returns a Promise", () => {
    describe("if the writable side emits no chunks", () => {
      describe("terminates when the writable side closes if `defaultFactory` resolves", () => {
        // deno-lint-ignore no-explicit-any
        const tests: [name: string, inputFactoryReturn: any][] = [
          ["null", null],
          ["undefined", undefined],
          ["number", 42],
          ["function", () => {}],
          ["object", { foo: 42 }],
          ["symbol", Symbol.for("some-symbol")],
          ["ArrayLike", { length: 2, "0": "a", "1": "b" }],
        ];
        for (const [name, inputFactoryReturn] of tests) {
          it(name, async () => {
            await testStream(async ({ readable, assertReadable }) => {
              const source = readable("--|");
              const expected = "       ----#";
              const factory = async () => {
                await delay(200);
                return inputFactoryReturn;
              };

              const actual = source.pipeThrough(defaultWith(factory));

              await assertReadable(actual, expected, {});
            });
          });
        }
      });
      it("emits values from `defaultFactory` after the writable side closes", async () => {
        await testStream(async ({ readable, assertReadable }) => {
          const source = readable("------|");
          const expectedSource = " ------|";
          const expected = "       --------(XYZ|)";
          const factory = spy(async () => {
            await delay(200);
            return ["X", "Y", "Z"];
          });

          const actual = source.pipeThrough(defaultWith(factory));

          await assertReadable(actual, expected);
          await assertReadable(source, expectedSource);

          assertSpyCalls(factory, 1);
        });
      });
    });
    it("terminates when `defaultFactory` throws", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("------|", {}, "error");
        const expectedSource = " ------|";
        const expected = "       --------#";
        const factory = async () => {
          await delay(200);
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
        const factory = spy(async () => {
          await delay(200); //              --
          return readable("                   -X-Y#", {}, "error");
        });
        const expectedDefaultStream = "       -X-Y#";
        const expected = "            ---------X-Y#";

        const actual = source.pipeThrough(defaultWith(factory));

        await assertReadable(actual, expected, {}, "error");
        await assertReadable(source, expectedSource, {}, "error");
        assertSpyCalls(factory, 1);
        const defaultStream = await factory.calls[0].returned!;
        await assertReadable(defaultStream, expectedDefaultStream, {}, "error");
      });
    });
    describe("if the readable side cancels after the writable side closes", () => {
      it("terminates the default stream", async () => {
        await testStream(
          async ({ readable, writable, run, assertReadable }) => {
            const source = readable("     ------|");
            const expectedSource = "      ------|";
            const factory = spy(async () => {
              await delay(200); //              --
              return readable("                   -X-Y-Z|");
            });
            const expectedDefaultStream = "       -X-Y!";
            const dest = writable("       ------------#", "break");
            const expected = "            ---------X-Y!";

            const actual = source.pipeThrough(defaultWith(factory));

            await run([actual], (actual) => {
              actual.pipeTo(dest).catch(() => {});
            });

            await assertReadable(actual, expected, {}, "break");
            await assertReadable(source, expectedSource, {}, "break");
            assertSpyCalls(factory, 1);
            const defaultStream = await factory.calls[0].returned!;
            await assertReadable(
              defaultStream,
              expectedDefaultStream,
              {},
              "break",
            );
          },
        );
      });
    });
  });
});
