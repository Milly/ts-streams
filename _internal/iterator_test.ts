import { describe, it } from "#bdd";
import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { assertSpyCalls, spy } from "@std/testing/mock";
import { getIterator, iteratorNext } from "./iterator.ts";

describe("getIterator()", () => {
  it("returns a Iterator", () => {
    const obj = {
      *[Symbol.iterator]() {
        yield 1;
      },
    };

    const actual = getIterator(obj);

    assertEquals(typeof actual, "object");
    assertEquals(typeof actual.next, "function");
  });
  it("returns a Iterator if `obj[@@asyncIterator]` is null", () => {
    const obj = {
      [Symbol.asyncIterator]: null,
      *[Symbol.iterator]() {
        yield 1;
      },
    };

    const actual = getIterator(obj);

    assertEquals(typeof actual, "object");
    assertEquals(typeof actual.next, "function");
  });
  it("returns an AsyncIterator", () => {
    const obj = {
      async *[Symbol.asyncIterator]() {
        yield 1;
      },
    };

    const actual = getIterator(obj);

    assertEquals(typeof actual, "object");
    assertEquals(typeof actual.next, "function");
  });
  it("returns an AsyncIterator if both `obj[@@asyncIterator]` and `obj[@@iterator]` exists", () => {
    const obj = {
      *[Symbol.iterator]() {
        yield 1;
      },
      async *[Symbol.asyncIterator]() {
        yield 1;
      },
    };
    const iterator = spy(obj, Symbol.iterator);
    const asyncIterator = spy(obj, Symbol.asyncIterator);

    const actual = getIterator(obj);

    assertEquals(typeof actual, "object");
    assertEquals(typeof actual.next, "function");
    assertSpyCalls(iterator, 0);
    assertSpyCalls(asyncIterator, 1);
  });
  describe("throws if `obj` is", () => {
    // deno-lint-ignore no-explicit-any
    const tests: [name: string, obj: any][] = [
      ["null", null],
      ["undefined", undefined],
      ["number", 42],
      ["function", () => {}],
      ["object", { foo: 42 }],
      ["symbol", Symbol.for("some-symbol")],
      ["ArrayLike", { length: 2, "0": "a", "1": "b" }],
    ];
    for (const [name, obj] of tests) {
      it(name, () => {
        assertThrows(
          () => getIterator(obj),
          TypeError,
        );
      });
    }
  });
  describe("throws if `obj[@@iterator]` is", () => {
    // deno-lint-ignore no-explicit-any
    const tests: [name: string, value: any][] = [
      ["null", null],
      ["undefined", undefined],
      ["string", "foo"],
      ["number", 42],
      ["object", { foo: 42 }],
      ["symbol", Symbol.for("some-symbol")],
    ];
    for (const [name, value] of tests) {
      it(name, () => {
        const obj = { [Symbol.iterator]: value };
        assertThrows(
          () => getIterator(obj),
          TypeError,
        );
      });
    }
  });
  describe("throws if `obj[@@iterator]()` returns", () => {
    // deno-lint-ignore no-explicit-any
    const tests: [name: string, value: any][] = [
      ["null", null],
      ["undefined", undefined],
      ["string", "foo"],
      ["number", 42],
      ["function without `next` method", () => {}],
      ["object without `next` method", { foo: 42 }],
      ["symbol", Symbol.for("some-symbol")],
    ];
    for (const [name, value] of tests) {
      it(name, () => {
        const obj = { [Symbol.iterator]: () => value };
        assertThrows(
          () => getIterator(obj),
          TypeError,
        );
      });
    }
  });
  describe("throws if `obj[@@asyncIterator]` is", () => {
    // deno-lint-ignore no-explicit-any
    const tests: [name: string, value: any][] = [
      ["null", null],
      ["undefined", undefined],
      ["string", "foo"],
      ["number", 42],
      ["object", { foo: 42 }],
      ["symbol", Symbol.for("some-symbol")],
    ];
    for (const [name, value] of tests) {
      it(name, () => {
        const obj = { [Symbol.asyncIterator]: value };
        assertThrows(
          () => getIterator(obj),
          TypeError,
        );
      });
    }
  });
  describe("throws if `obj[@@asyncIterator]()` returns", () => {
    // deno-lint-ignore no-explicit-any
    const tests: [name: string, value: any][] = [
      ["null", null],
      ["undefined", undefined],
      ["string", "foo"],
      ["number", 42],
      ["function without `next` method", () => {}],
      ["object without `next` method", { foo: 42 }],
      ["symbol", Symbol.for("some-symbol")],
    ];
    for (const [name, value] of tests) {
      it(name, () => {
        const obj = { [Symbol.asyncIterator]: () => value };
        assertThrows(
          () => getIterator(obj),
          TypeError,
        );
      });
    }
  });
});

describe("getIteratorNext()", () => {
  it("calls `iterator.next()` and returns result of it", async () => {
    const iterator: Iterator<number> = {
      next() {
        return { done: false, value: 1 };
      },
    };
    const next = spy(iterator, "next");

    const actual = await iteratorNext(iterator);

    assertSpyCalls(next, 1);
    assertEquals(actual, { done: false, value: 1 });
  });
  describe("rejects if `iterator.next()` returns", () => {
    // deno-lint-ignore no-explicit-any
    const tests: [name: string, value: any][] = [
      ["null", null],
      ["undefined", undefined],
      ["string", "foo"],
      ["number", 42],
      ["symbol", Symbol.for("some-symbol")],
    ];
    for (const [name, value] of tests) {
      it(name, async () => {
        const iterator: Iterator<unknown> = { next: () => value };
        await assertRejects(
          () => iteratorNext(iterator),
          TypeError,
        );
      });
    }
  });
});
