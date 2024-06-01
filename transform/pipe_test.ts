import { describe, it } from "@std/testing/bdd";
import { assertInstanceOf } from "@std/assert";
import { assertType, type IsExact } from "@std/testing/types";
import { testStream } from "@milly/streamtest";
import { filter } from "./filter.ts";
import { map } from "./map.ts";
import { take } from "./take.ts";
import { pipe } from "./pipe.ts";

describe("pipe()", () => {
  it("emits a transform stream with the type of the writable side of the first stream and the readable side of the last stream, if 2 streams are specified", () => {
    const actual = pipe(
      map((numberValue: number) => `${numberValue}`),
      map((stringValue) => stringValue === "1"),
    );

    assertType<IsExact<typeof actual, TransformStream<number, boolean>>>(true);
    assertInstanceOf(actual.readable, ReadableStream);
    assertInstanceOf(actual.writable, WritableStream);
  });
  it("emits a transform stream with the type of the writable side of the first stream and the readable side of the last stream, if 10 streams are specified", () => {
    const actual = pipe(
      map((numberValue: number) => `${numberValue}`),
      map((stringValue) => stringValue === "1"),
      map((booleanValue) => booleanValue ? 1 : 0),
      map((numberValue) => `${numberValue}` as string & { tag: "a" }),
      map((stringValue) => (stringValue === "1") as boolean & { tag: "b" }),
      map((booleanValue) => (booleanValue ? 1 : 0) as number & { tag: "c" }),
      map((numberValue) => `${numberValue}` as string & { tag: "d" }),
      map((stringValue) => (stringValue === "1") as boolean & { tag: "e" }),
      map((booleanValue) => (booleanValue ? 1 : 0) as number & { tag: "f" }),
      map((numberValue) => new Date(numberValue)),
    );

    assertType<IsExact<typeof actual, TransformStream<number, Date>>>(true);
    assertInstanceOf(actual.readable, ReadableStream);
    assertInstanceOf(actual.writable, WritableStream);
  });
  it("emits a transform stream with the specified type", () => {
    const actual = pipe<number>(
      map((numberValue: number) => `${numberValue}`),
      map((value) => value),
      map((value) => value),
      map((value) => value),
      map((value) => value),
      map((value) => value),
      map((value) => value),
      map((value) => value),
      map((value) => value),
      map((value) => value),
      map((stringValue: string) => Number(stringValue)),
    );

    assertType<IsExact<typeof actual, TransformStream<number, number>>>(true);
    assertInstanceOf(actual.readable, ReadableStream);
    assertInstanceOf(actual.writable, WritableStream);
  });
  it("emits a transform stream with the specified input and output type", () => {
    const actual = pipe<number, boolean>(
      map((numberValue: number) => `${numberValue}`),
      map((value) => value),
      map((value) => value),
      map((value) => value),
      map((value) => value),
      map((value) => value),
      map((value) => value),
      map((value) => value),
      map((value) => value),
      map((value) => value),
      map((stringValue: string) => stringValue === "1"),
    );

    assertType<IsExact<typeof actual, TransformStream<number, boolean>>>(true);
    assertInstanceOf(actual.readable, ReadableStream);
    assertInstanceOf(actual.writable, WritableStream);
  });
  it("returns a TransformStream that piped specified transform streams serially", async () => {
    await testStream(async ({ readable, assertReadable }) => {
      const values = { a: 0, b: 1, c: 2, d: 3, e: 4, f: 5, g: 6, h: 7, i: 8 };
      const source = readable("-a-b-c-d-e- f  -g-h-i-", values);
      const expectedSource = " -a-b-c-d-e-(f!)";
      const expected = "       ---B---D---(F|)";

      const actual = source.pipeThrough(pipe(
        filter((value) => value % 2 === 1),
        take(3),
        map((value) => value * value),
      ));

      await assertReadable(actual, expected, { B: 1, D: 9, F: 25 });
      await assertReadable(source, expectedSource, values);
    });
  });
  it("terminates when the writable side aborts", async () => {
    await testStream(async ({ readable, assertReadable }) => {
      const values = { a: 0, b: 1, c: 2 };
      const source = readable("-a-b-c-#", values, "error");
      const expected = "       ---B---#";

      const actual = source.pipeThrough(pipe(
        filter((value) => value % 2 === 1),
        take(3),
        map((value) => value * value),
      ));

      await assertReadable(actual, expected, { B: 1 }, "error");
    });
  });
  it("terminates when the readable side cancels", async () => {
    await testStream(async ({ readable, writable, run, assertReadable }) => {
      const values = { a: 0, b: 1, c: 2, d: 3, e: 4, f: 5, g: 6, h: 7, i: 8 };
      const source = readable("-a-b-c-d-e-f-g-h-i-", values);
      const dest = writable("  --------#", "break");
      const expected = "       ---B---D!";

      const actual = source.pipeThrough(pipe(
        filter((value) => value % 2 === 1),
        take(3),
        map((value) => value * value),
      ));

      await run([actual], (actual) => {
        actual.pipeTo(dest).catch(() => {});
      });

      await assertReadable(actual, expected, { B: 1, D: 9 }, "break");
    });
  });
});
