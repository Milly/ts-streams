import { describe, it } from "@std/testing/bdd";
import { assertEquals, assertGreater } from "@std/assert";
import { assertType, type IsExact } from "@std/testing/types";
import { assertSpyCall, assertSpyCalls, spy } from "@std/testing/mock";
import { delay } from "@std/async/delay";
import { testStream } from "@milly/streamtest";
import { tap, type TapCallbacks, type TapController } from "./tap.ts";

describe("tap()", () => {
  describe("with `callbackWriteFn`", () => {
    describe("returns a TransformStream<T, T> and", () => {
      it("emits the source chunk type", () => {
        const source = new ReadableStream<number>();

        const output = source.pipeThrough(tap((value) => console.log(value)));

        assertType<IsExact<typeof output, ReadableStream<number>>>(true);
      });
      it("emits source chunk as-is", async () => {
        await testStream(async ({ readable, assertReadable }) => {
          const source = readable("a--b-cd---e|");
          const expected = "       a--b-cd---e|";

          const actual = source.pipeThrough(tap(() => "X"));

          await assertReadable(actual, expected);
        });
      });
    });
    it("called with each chunk value and index", async () => {
      await testStream(async ({ readable, run }) => {
        const indices: (number | null)[] = [];
        const source = readable("abcd|");
        const callback = spy(
          (
            (_value, controller) => {
              indices.push(controller.index);
            }
          ) as Required<TapCallbacks<string>>["write"],
        );

        const actual = source.pipeThrough(tap(callback));

        await run([], async () => {
          await actual.pipeTo(new WritableStream());
        });

        const tapController = callback.calls[0].args[1];
        assertEquals(callback.calls, [
          { args: ["a", tapController], returned: undefined },
          { args: ["b", tapController], returned: undefined },
          { args: ["c", tapController], returned: undefined },
          { args: ["d", tapController], returned: undefined },
        ]);
        assertEquals(indices, [0, 1, 2, 3]);
        assertEquals(tapController.index, 3);
      });
    });
    it("terminates the stream if the callback throws", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("-a--b--- c  ---d|");
        const expectedSource = " -a--b---(c!)";
        const expected = "       -a--b--- #";

        const actual = source.pipeThrough(tap((value: string) => {
          if (value === "c") throw "error";
        }));

        await assertReadable(actual, expected, {}, "error");
        await assertReadable(source, expectedSource, {}, "error");
      });
    });
  });
  describe("with `TapCallbacks`", () => {
    describe("returns a TransformStream<T, T> and", () => {
      it("emits the source chunk type", () => {
        const source = new ReadableStream<number>();

        const output = source.pipeThrough(tap({}));

        assertType<IsExact<typeof output, ReadableStream<number>>>(true);
      });
      it("emits source chunk as-is", async () => {
        await testStream(async ({ readable, assertReadable }) => {
          const source = readable("a--b-cd---e|");
          const expected = "       a--b-cd---e|";

          const actual = source.pipeThrough(tap({}));

          await assertReadable(actual, expected);
        });
      });
    });
    describe(".abortWritable()", () => {
      it("called when the writable side aborts", async () => {
        await testStream(async ({ readable, run }) => {
          const source = readable("-----#", {}, "error");
          const callbacks = {
            abortWritable: spy((_reason: unknown) => {}),
          } satisfies TapCallbacks<string>;

          const actual = source.pipeThrough(tap(callbacks));

          await run([], async () => {
            actual.pipeTo(new WritableStream()).catch(() => {});

            await delay(500 - 1);
            assertSpyCalls(callbacks.abortWritable, 0);

            await delay(2);
            assertSpyCalls(callbacks.abortWritable, 1);
            assertSpyCall(callbacks.abortWritable, 0, { args: ["error"] });
          });
        });
      });
      it("does nothing if the callback throws", async () => {
        await testStream(async ({ readable, assertReadable }) => {
          const source = readable("----#", {}, "error");
          const expectedSource = " ----#";
          const expected = "       ----#";

          const actual = source.pipeThrough(tap({
            abortWritable: () => {
              throw "aborted";
            },
          }));

          await assertReadable(actual, expected, {}, "error");
          await assertReadable(source, expectedSource, {}, "error");
        });
      });
    });
    describe(".cancelReadable()", () => {
      it("called when the readable side cancels", async () => {
        await testStream(async ({ readable, writable, run }) => {
          const source = readable("---------|");
          const dest = writable("  -----#", "break");
          const callbacks = {
            cancelReadable: spy((_reason: unknown) => {}),
          } satisfies TapCallbacks<string>;

          const actual = source.pipeThrough(tap(callbacks));

          await run([], async () => {
            actual.pipeTo(dest).catch(() => {});

            await delay(500 - 1);
            assertSpyCalls(callbacks.cancelReadable, 0);

            await delay(2);
            assertSpyCalls(callbacks.cancelReadable, 1);
            assertSpyCall(callbacks.cancelReadable, 0, { args: ["break"] });
          });
        });
      });
      it("does nothing if the callback throws", async () => {
        await testStream(
          async ({ readable, writable, run, assertReadable }) => {
            const source = readable("--------|");
            const expectedSource = " ----!";
            const dest = writable("  ----#", "break");
            const expected = "       ----!";

            const actual = source.pipeThrough(tap({
              cancelReadable: () => {
                throw "cancelled";
              },
            }));

            await run([actual], async (actual) => {
              await actual.pipeTo(dest).catch(() => {});
            });

            await assertReadable(actual, expected, {}, "break");
            await assertReadable(source, expectedSource, {}, "break");
          },
        );
      });
    });
    describe(".closeWritable()", () => {
      it("called when the writable side closes", async () => {
        await testStream(async ({ readable, run }) => {
          const source = readable("-----|");
          const callbacks = {
            closeWritable: spy(() => {}),
          } satisfies TapCallbacks<string>;

          source.pipeThrough(tap(callbacks));

          await run([], async () => {
            await delay(500 - 1);
            assertSpyCalls(callbacks.closeWritable, 0);

            await delay(2);
            assertSpyCalls(callbacks.closeWritable, 1);
          });
        });
      });
      it("does nothing if the callback throws", async () => {
        await testStream(async ({ readable, assertReadable }) => {
          const source = readable("----|");
          const expectedSource = " ----|";
          const expected = "       ----|";

          const actual = source.pipeThrough(tap({
            closeWritable: () => {
              throw "closed";
            },
          }));

          await assertReadable(actual, expected);
          await assertReadable(source, expectedSource);
        });
      });
    });
    describe(".error()", () => {
      it("called after `abortWritable` when the writable side aborts", async () => {
        await testStream(async ({ readable, run }) => {
          const source = readable("-----#", {}, "error");
          const calledMethods: string[] = [];
          const callbacks = {
            abortWritable: spy((_reason: unknown) => {
              calledMethods.push("abortWritable");
            }),
            error: spy((_reason: unknown) => {
              calledMethods.push("error");
            }),
          } satisfies TapCallbacks<string>;

          source.pipeThrough(tap(callbacks));

          await run([], async () => {
            await delay(500 - 1);
            assertSpyCalls(callbacks.abortWritable, 0);
            assertSpyCalls(callbacks.error, 0);

            await delay(2);
            assertSpyCalls(callbacks.abortWritable, 1);
            assertSpyCall(callbacks.abortWritable, 0, { args: ["error"] });
            assertSpyCalls(callbacks.error, 1);
            assertSpyCall(callbacks.error, 0, { args: ["error"] });
          });

          assertEquals(calledMethods, [
            "abortWritable",
            "error",
          ]);
        });
      });
      it("called after `cancelReadable` when the readable side cancels", async () => {
        await testStream(async ({ readable, writable, run }) => {
          const source = readable("---------|");
          const dest = writable("  -----#", "break");
          const calledMethods: string[] = [];
          const callbacks = {
            cancelReadable: spy((_reason: unknown) => {
              calledMethods.push("cancelReadable");
            }),
            error: spy((_reason: unknown) => {
              calledMethods.push("error");
            }),
          } satisfies TapCallbacks<string>;

          const actual = source.pipeThrough(tap(callbacks));

          await run([actual], async (actual) => {
            actual.pipeTo(dest).catch(() => {});

            await delay(500 - 1);
            assertSpyCalls(callbacks.cancelReadable, 0);
            assertSpyCalls(callbacks.error, 0);

            await delay(2);
            assertSpyCalls(callbacks.cancelReadable, 1);
            assertSpyCall(callbacks.cancelReadable, 0, { args: ["break"] });
            assertSpyCalls(callbacks.error, 1);
            assertSpyCall(callbacks.error, 0, { args: ["break"] });
          });

          assertEquals(calledMethods, [
            "cancelReadable",
            "error",
          ]);
        });
      });
      it("does nothing if the writable side aborts and the callback throws", async () => {
        await testStream(async ({ readable, assertReadable }) => {
          const source = readable("----#", {}, "error");
          const expectedSource = " ----#";
          const expected = "       ----#";

          const actual = source.pipeThrough(tap({
            error: () => {
              throw "errored";
            },
          }));

          await assertReadable(actual, expected, {}, "error");
          await assertReadable(source, expectedSource, {}, "error");
        });
      });
      it("does nothing if the readable side cancels and the callback throws", async () => {
        await testStream(
          async ({ readable, writable, run, assertReadable }) => {
            const source = readable("--------|");
            const expectedSource = " ----!";
            const dest = writable("  ----#", "break");
            const expected = "       ----!";

            const actual = source.pipeThrough(tap({
              error: () => {
                throw "errored";
              },
            }));

            await run([actual], async (actual) => {
              await actual.pipeTo(dest).catch(() => {});
            });

            await assertReadable(actual, expected, {}, "break");
            await assertReadable(source, expectedSource, {}, "break");
          },
        );
      });
    });
    describe(".finalize()", () => {
      it("called after `abortWritable` and `error` when the writable side aborts", async () => {
        await testStream(async ({ readable, run }) => {
          const source = readable("-----#", {}, "error");
          const calledMethods: string[] = [];
          const callbacks = {
            abortWritable: spy((_reason: unknown) => {
              calledMethods.push("abortWritable");
            }),
            error: spy((_reason: unknown) => {
              calledMethods.push("error");
            }),
            finalize: spy(() => {
              calledMethods.push("finalize");
            }),
          } satisfies TapCallbacks<string>;

          source.pipeThrough(tap(callbacks));

          await run([], async () => {
            await delay(500 - 1);
            assertSpyCalls(callbacks.abortWritable, 0);
            assertSpyCalls(callbacks.error, 0);
            assertSpyCalls(callbacks.finalize, 0);

            await delay(2);
            assertSpyCalls(callbacks.abortWritable, 1);
            assertSpyCall(callbacks.abortWritable, 0, { args: ["error"] });
            assertSpyCalls(callbacks.error, 1);
            assertSpyCall(callbacks.error, 0, { args: ["error"] });
            assertSpyCalls(callbacks.finalize, 1);
          });

          assertEquals(calledMethods, [
            "abortWritable",
            "error",
            "finalize",
          ]);
        });
      });
      it("called after `cancelReadable` and `error` when the readable side cancels", async () => {
        await testStream(async ({ readable, writable, run }) => {
          const source = readable("---------|");
          const dest = writable("  -----#", "break");
          const calledMethods: string[] = [];
          const callbacks = {
            cancelReadable: spy((_reason: unknown) => {
              calledMethods.push("cancelReadable");
            }),
            error: spy((_reason: unknown) => {
              calledMethods.push("error");
            }),
            finalize: spy(() => {
              calledMethods.push("finalize");
            }),
          } satisfies TapCallbacks<string>;

          const actual = source.pipeThrough(tap(callbacks));

          await run([actual], async (actual) => {
            actual.pipeTo(dest).catch(() => {});

            await delay(500 - 1);
            assertSpyCalls(callbacks.cancelReadable, 0);
            assertSpyCalls(callbacks.error, 0);
            assertSpyCalls(callbacks.finalize, 0);

            await delay(2);
            assertSpyCalls(callbacks.cancelReadable, 1);
            assertSpyCall(callbacks.cancelReadable, 0, { args: ["break"] });
            assertSpyCalls(callbacks.error, 1);
            assertSpyCall(callbacks.error, 0, { args: ["break"] });
            assertSpyCalls(callbacks.finalize, 1);
          });

          assertEquals(calledMethods, [
            "cancelReadable",
            "error",
            "finalize",
          ]);
        });
      });
      it("called after `closeWritable` when the writable side closes", async () => {
        await testStream(async ({ readable, run }) => {
          const source = readable("-----|");
          const calledMethods: string[] = [];
          const callbacks = {
            closeWritable: spy(() => {
              calledMethods.push("closeWritable");
            }),
            finalize: spy(() => {
              calledMethods.push("finalize");
            }),
          } satisfies TapCallbacks<string>;

          source.pipeThrough(tap(callbacks));

          await run([], async () => {
            await delay(500 - 1);
            assertSpyCalls(callbacks.closeWritable, 0);
            assertSpyCalls(callbacks.finalize, 0);

            await delay(2);
            assertSpyCalls(callbacks.closeWritable, 1);
            assertSpyCalls(callbacks.finalize, 1);
          });

          assertEquals(calledMethods, [
            "closeWritable",
            "finalize",
          ]);
        });
      });
      it("does nothing if `finalize` throws", async () => {
        await testStream(async ({ readable, assertReadable }) => {
          const source = readable("----|");
          const expectedSource = " ----|";
          const expected = "       ----|";

          const actual = source.pipeThrough(tap({
            finalize: () => {
              throw "finalized";
            },
          }));

          await assertReadable(actual, expected);
          await assertReadable(source, expectedSource);
        });
      });
    });
    describe(".pull()", () => {
      it("called when the readable side requests chunk", async () => {
        await testStream(async ({ writable, run }) => {
          const dest = writable("-#");
          const callbacks = {
            pull: spy((_controller: TapController) => {}),
          } satisfies TapCallbacks<string>;

          const actual = tap(callbacks).readable;

          await run([], async () => {
            assertSpyCalls(callbacks.pull, 0);
            await actual.pipeTo(dest).catch(() => {});
            assertGreater(callbacks.pull.calls.length, 0);
          });
        });
      });
      it("terminates the stream if the callback throws", async () => {
        await testStream(async ({ readable, assertReadable }) => {
          const source = readable("-----|");
          const expectedSource = " !";
          const expected = "       #";

          const actual = source.pipeThrough(tap({
            pull: () => {
              throw "error";
            },
          }));

          await assertReadable(actual, expected, {}, "error");
          await assertReadable(source, expectedSource, {}, "error");
        });
      });
    });
    describe(".write()", () => {
      it("called when a chunk is emitted from the writable side", async () => {
        await testStream(async ({ readable, run }) => {
          const source = readable("-a-b--|");
          const callbacks = {
            write: spy((_chunk: unknown, _controller: TapController) => {}),
          } satisfies TapCallbacks<string>;

          const actual = source.pipeThrough(tap(callbacks));

          await run([actual], async (actual) => {
            actual.pipeTo(new WritableStream());

            await delay(100 - 1);
            assertSpyCalls(callbacks.write, 0);

            await delay(2);
            assertSpyCalls(callbacks.write, 1);
            const tapController = callbacks.write.calls[0].args[1];
            assertSpyCall(callbacks.write, 0, {
              args: ["a", tapController],
              returned: undefined,
            });

            await delay(200 - 2);
            assertSpyCalls(callbacks.write, 1);

            await delay(2);
            assertSpyCalls(callbacks.write, 2);
            assertSpyCall(callbacks.write, 1, {
              args: ["b", tapController],
              returned: undefined,
            });
          });
        });
      });
      it("terminates the stream if the callback throws", async () => {
        await testStream(async ({ readable, assertReadable }) => {
          const source = readable("-a--b--- c  ---d|");
          const expectedSource = " -a--b---(c!)";
          const expected = "       -a--b--- #";

          const actual = source.pipeThrough(tap({
            write: (value: string) => {
              if (value === "c") throw "error";
            },
          }));

          await assertReadable(actual, expected, {}, "error");
          await assertReadable(source, expectedSource, {}, "error");
        });
      });
    });
  });
  describe("TapController", () => {
    describe(".desiredSize", () => {
      it("is number if the stream is not errored", async () => {
        await testStream(async ({ run }) => {
          const callbacks = {
            pull: spy((_controller: TapController) => {}),
          } satisfies TapCallbacks<string>;

          const actual = tap(callbacks).readable;

          await run([actual], async (actual) => {
            actual.pipeTo(new WritableStream());

            await delay(0);
            assertSpyCalls(callbacks.pull, 1);
            const tapController = callbacks.pull.calls[0].args[0];
            assertEquals(typeof tapController.desiredSize, "number");
          });
        });
      });
      it("is null if the readable side cancels", async () => {
        await testStream(async ({ writable, run }) => {
          const dest = writable("-#");
          const callbacks = {
            pull: spy((_controller: TapController) => {}),
          } satisfies TapCallbacks<string>;

          const actual = tap(callbacks).readable;

          await run([actual], async (actual) => {
            const closed = actual.pipeTo(dest).catch(() => {});

            await delay(0);
            assertSpyCalls(callbacks.pull, 1);
            const tapController = callbacks.pull.calls[0].args[0];

            await closed;
            assertEquals(tapController.desiredSize, null);
          });
        });
      });
      it("is null if the writable side aborts", async () => {
        await testStream(async ({ readable, run }) => {
          const source = readable("-#");
          const callbacks = {
            pull: spy((_controller: TapController) => {}),
          } satisfies TapCallbacks<string>;

          const actual = source.pipeThrough(tap(callbacks));

          await run([actual], async (actual) => {
            const closed = actual.pipeTo(new WritableStream()).catch(() => {});
            actual.pipeTo(new WritableStream()).catch(() => {});

            await delay(0);
            assertSpyCalls(callbacks.pull, 1);
            const tapController = callbacks.pull.calls[0].args[0];

            await closed;
            assertEquals(tapController.desiredSize, null);
          });
        });
      });
    });
    describe(".index", () => {
      it("is the last chunk index number", async () => {
        await testStream(async ({ readable, run }) => {
          const source = readable("-a-b--|");
          const callbacks = {
            pull: spy((_controller: TapController) => {}),
          } satisfies TapCallbacks<string>;

          const actual = source.pipeThrough(tap(callbacks));

          await run([actual], async (actual) => {
            const closed = actual.pipeTo(new WritableStream());

            await delay(0);
            assertSpyCalls(callbacks.pull, 1);
            const tapController = callbacks.pull.calls[0].args[0];
            assertEquals(tapController.index, -1);

            await delay(100 - 1);
            assertEquals(tapController.index, -1);
            await delay(1);
            assertEquals(tapController.index, 0);

            await delay(200 - 1);
            assertEquals(tapController.index, 0);
            await delay(1);
            assertEquals(tapController.index, 1);

            await closed;
            assertEquals(tapController.index, 1);
          });
        });
      });
    });
  });
  describe("returns a TransformStream<T, T> and", () => {
    it("terminates when the writable side aborts", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const source = readable("a--b-c---d-#", {}, "error");
        const expected = "       a--b-c---d-#";

        const actual = source.pipeThrough(tap(() => void 0));

        await assertReadable(actual, expected, {}, "error");
      });
    });
    it("terminates when the readable side cancels", async () => {
      await testStream(async ({ readable, writable, run, assertReadable }) => {
        const source = readable("-a-b-c-d-e-f-g|");
        const expectedSource = " -a-b-c-d!";
        const dest = writable("  --------#", "break");
        const expected = "       -a-b-c-d!";

        const actual = source.pipeThrough(tap(() => void 0));

        await run([actual], async (actual) => {
          await actual.pipeTo(dest).catch(() => {});
        });

        await assertReadable(actual, expected, {}, "break");
        await assertReadable(source, expectedSource, {}, "break");
      });
    });
    it("pass through backpressure to the writable side", async () => {
      await testStream(async ({ readable, writable, run, assertReadable }) => {
        const source = readable("-a---b---c---d- -  -e---f---|");
        const dest = writable("  ---<----------- >  -------------");
        const expected = "       -a---b---------(cd)-e---f---|";

        const actual = source.pipeThrough(new TransformStream());

        await run([actual], async (actual) => {
          await actual
            .pipeThrough(tap({}))
            .pipeTo(dest).catch(() => {});
        });

        await assertReadable(actual, expected);
      });
    });
  });
});
