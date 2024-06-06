import { describe, it } from "#bdd";
import { assertEquals, assertFalse, assertRejects } from "@std/assert";
import { write } from "./write.ts";

describe("write()", () => {
  it("writes a value to the WritableStream", async () => {
    const results: number[] = [];
    const stream = new WritableStream<number>({
      write(chunk) {
        results.push(chunk);
      },
    });
    await write(stream, 1);
    await write(stream, 2);
    await write(stream, 3);
    assertEquals(results, [1, 2, 3]);
    assertFalse(stream.locked);
  });
  it("writes values to the WritableStream", async () => {
    const results: number[] = [];
    const writable = new WritableStream<number>({
      write(chunk) {
        results.push(chunk);
      },
    });
    await write(writable, 1, 2, 3);
    assertEquals(results, [1, 2, 3]);
    assertFalse(writable.locked);
  });
  it("does nothing if no values specified", async () => {
    const results: number[] = [];
    const writable = new WritableStream<number>({
      write(chunk) {
        results.push(chunk);
      },
    });
    await write(writable);
    assertEquals(results, []);
    assertFalse(writable.locked);
  });
  it("writes awaited value of promises to the WritableStream", async () => {
    const results: number[] = [];
    const writable = new WritableStream<number>({
      write(chunk) {
        results.push(chunk);
      },
    });
    await write(writable, Promise.resolve(1), Promise.resolve(2));
    await write(writable, Promise.resolve(3));
    assertEquals(results, [1, 2, 3]);
    assertFalse(writable.locked);
  });
  it("throws if a rejected promise is specified", async () => {
    const results: number[] = [];
    const writable = new WritableStream<number>({
      write(chunk) {
        results.push(chunk);
      },
    });
    await write(writable, Promise.resolve(1), Promise.resolve(2));
    const appendRejectedPromise = await assertRejects(() =>
      write(writable, Promise.reject("error"))
    );
    assertEquals(appendRejectedPromise, "error");
    // Can append after rejected.
    await write(writable, 3);
    assertEquals(results, [1, 2, 3]);
    assertFalse(writable.locked);
  });
});
