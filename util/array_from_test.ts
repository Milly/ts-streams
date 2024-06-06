import { describe, it } from "#bdd";
import { assert, assertEquals, assertFalse, assertRejects } from "@std/assert";
import {
  assertSpyCallArgs,
  assertSpyCalls,
  returnsNext,
  spy,
} from "@std/testing/mock";
import { from } from "../readable/from.ts";
import { arrayFrom } from "./array_from.ts";

describe("arrayFrom()", () => {
  describe("ReadableStream as `stream`", () => {
    it("returns the all chunk in the stream", async () => {
      const stream = from([1, 2, 3]);

      const actual = await arrayFrom(stream);

      assertEquals(actual, [1, 2, 3]);
      assertFalse(stream.locked, "should stream unlocked");
    });
    it("returns [] if the stream is empty", async () => {
      const stream = from([]);

      const actual = await arrayFrom(stream);

      assertEquals(actual, []);
      assertFalse(stream.locked, "should stream unlocked");
    });
    it("throws if the stream is rejected", async () => {
      const stream = from([1, 2, Promise.reject("error")]);

      const actual = await assertRejects(() => arrayFrom(stream));

      assertEquals(actual, "error");
      assertFalse(stream.locked, "should stream unlocked");
    });
    describe("with `mapFn`", () => {
      it("returns all awaited mapped values in the stream", async () => {
        const stream = from([1, 2, 3]);
        const mapFn = spy(returnsNext([10, Promise.resolve(11), 12]));

        const actual = await arrayFrom(stream, mapFn);

        assertEquals(actual, [10, 11, 12]);
        assertSpyCalls(mapFn, 3);
        assertSpyCallArgs(mapFn, 0, [1, 0]);
        assertSpyCallArgs(mapFn, 1, [2, 1]);
        assertSpyCallArgs(mapFn, 2, [3, 2]);
        assertFalse(stream.locked, "should stream unlocked");
      });
      it("rejects if `mapFn` throws", async () => {
        let cancelReason: unknown;
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(1);
            controller.enqueue(2);
            controller.enqueue(3);
          },
          cancel(reason) {
            cancelReason = reason;
          },
        });
        const error = new Error("error");
        const mapFn = spy(returnsNext([10, 11, error]));

        const actual = await assertRejects(() => arrayFrom(stream, mapFn));

        assertEquals(actual, error);
        assertFalse(stream.locked, "should stream unlocked");
        assertEquals(cancelReason, undefined);
      });
      it("rejects if `mapFn` rejects", async () => {
        let cancelReason: unknown;
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(1);
            controller.enqueue(2);
            controller.enqueue(3);
          },
          cancel(reason) {
            cancelReason = reason;
          },
        });
        const mapFn = spy(returnsNext([10, 11, Promise.reject("error")]));

        const actual = await assertRejects(() => arrayFrom(stream, mapFn));

        assertEquals(actual, "error");
        assertFalse(stream.locked, "should stream unlocked");
        assertEquals(cancelReason, undefined);
      });
    });
  });
  describe("AsyncIterable as `stream`", () => {
    it("returns all chunk values in the stream", async () => {
      let streamClosed = false;
      const stream = {
        async *[Symbol.asyncIterator]() {
          try {
            yield 1;
            yield 2;
            yield 3;
          } finally {
            streamClosed = true;
          }
        },
      };

      const actual = await arrayFrom(stream);

      assertEquals(actual, [1, 2, 3]);
      assert(streamClosed, "should closes async iterator");
    });
    it("returns [] if the stream is empty", async () => {
      let streamClosed = false;
      const stream = {
        // deno-lint-ignore require-yield
        async *[Symbol.asyncIterator]() {
          streamClosed = true;
        },
      };

      const actual = await arrayFrom(stream);

      assertEquals(actual, []);
      assert(streamClosed, "should closes async iterator");
    });
    it("rejects if the stream is rejected", async () => {
      let streamClosed = false;
      const stream = {
        async *[Symbol.asyncIterator]() {
          try {
            yield 1;
            yield 2;
            throw "error";
          } finally {
            streamClosed = true;
          }
        },
      };

      const actual = await assertRejects(() => arrayFrom(stream));

      assertEquals(actual, "error");
      assert(streamClosed, "should closes async iterator");
    });
    describe("with `mapFn`", () => {
      it("returns all awaited mapped values in the stream", async () => {
        let streamClosed = false;
        const stream = {
          async *[Symbol.asyncIterator]() {
            try {
              yield 1;
              yield 2;
              yield 3;
            } finally {
              streamClosed = true;
            }
          },
        };
        const mapFn = spy(returnsNext([10, Promise.resolve(11), 12]));

        const actual = await arrayFrom(stream, mapFn);

        assertEquals(actual, [10, 11, 12]);
        assertSpyCalls(mapFn, 3);
        assertSpyCallArgs(mapFn, 0, [1, 0]);
        assertSpyCallArgs(mapFn, 1, [2, 1]);
        assertSpyCallArgs(mapFn, 2, [3, 2]);
        assert(streamClosed, "should closes sync iterator");
      });
      it("rejects if `mapFn` throws", async () => {
        let streamClosed = false;
        const stream = {
          async *[Symbol.asyncIterator]() {
            try {
              yield 1;
              yield 2;
              yield 3;
            } finally {
              streamClosed = true;
            }
          },
        };
        const error = new Error("error");
        const mapFn = spy(returnsNext([10, 11, error]));

        const actual = await assertRejects(() => arrayFrom(stream, mapFn));

        assertEquals(actual, error);
        assert(streamClosed, "should closes async iterator");
      });
      it("rejects if `mapFn` rejects", async () => {
        let streamClosed = false;
        const stream = {
          async *[Symbol.asyncIterator]() {
            try {
              yield 1;
              yield 2;
              yield 3;
            } finally {
              streamClosed = true;
            }
          },
        };
        const mapFn = spy(returnsNext([10, 11, Promise.reject("error")]));

        const actual = await assertRejects(() => arrayFrom(stream, mapFn));

        assertEquals(actual, "error");
        assert(streamClosed, "should closes async iterator");
      });
    });
  });
  describe("Iterable as `stream`", () => {
    it("returns all awaited chunk values in the stream", async () => {
      let streamClosed = false;
      const stream = {
        *[Symbol.iterator]() {
          try {
            yield 1;
            yield Promise.resolve(2);
            yield Promise.resolve(3);
          } finally {
            streamClosed = true;
          }
        },
      };

      const actual = await arrayFrom(stream);

      assertEquals(actual, [1, 2, 3]);
      assert(streamClosed, "should closes sync iterator");
    });
    it("returns [] if the stream is empty", async () => {
      let streamClosed = false;
      const stream = {
        // deno-lint-ignore require-yield
        *[Symbol.iterator]() {
          streamClosed = true;
        },
      };

      const actual = await arrayFrom(stream);

      assertEquals(actual, []);
      assert(streamClosed, "should closes sync iterator");
    });
    it("rejects if the chunk value in the stream is rejected", async () => {
      let streamClosed = false;
      const stream = {
        *[Symbol.iterator]() {
          try {
            yield 1;
            yield Promise.resolve(2);
            yield Promise.reject("error");
          } finally {
            streamClosed = true;
          }
        },
      };

      const actual = await assertRejects(() => arrayFrom(stream));

      assertEquals(actual, "error");
      // Ref: https://github.com/tc39/ecma262/pull/2600
      assert(streamClosed, "should closes sync iterator");
    });
    describe("with `mapFn`", () => {
      it("returns all awaited mapped values in the stream", async () => {
        let streamClosed = false;
        const stream = {
          *[Symbol.iterator]() {
            try {
              yield 1;
              yield Promise.resolve(2);
              yield Promise.resolve(3);
            } finally {
              streamClosed = true;
            }
          },
        };
        const mapFn = spy(returnsNext([10, Promise.resolve(11), 12]));

        const actual = await arrayFrom(stream, mapFn);

        assertEquals(actual, [10, 11, 12]);
        assertSpyCalls(mapFn, 3);
        assertSpyCallArgs(mapFn, 0, [1, 0]);
        assertSpyCallArgs(mapFn, 1, [2, 1]);
        assertSpyCallArgs(mapFn, 2, [3, 2]);
        assert(streamClosed, "should closes sync iterator");
      });
      it("rejects if `mapFn` throws", async () => {
        let streamClosed = false;
        const stream = {
          *[Symbol.iterator]() {
            try {
              yield 1;
              yield Promise.resolve(2);
              yield Promise.resolve(3);
            } finally {
              streamClosed = true;
            }
          },
        };
        const error = new Error("error");
        const mapFn = spy(returnsNext([10, 11, error]));

        const actual = await assertRejects(() => arrayFrom(stream, mapFn));

        assertEquals(actual, error);
        assert(streamClosed, "should closes sync iterator");
      });
      it("rejects if `mapFn` rejects", async () => {
        let streamClosed = false;
        const stream = {
          *[Symbol.iterator]() {
            try {
              yield 1;
              yield Promise.resolve(2);
              yield Promise.resolve(3);
            } finally {
              streamClosed = true;
            }
          },
        };
        const mapFn = spy(returnsNext([10, 11, Promise.reject("error")]));

        const actual = await assertRejects(() => arrayFrom(stream, mapFn));

        assertEquals(actual, "error");
        assert(streamClosed, "should closes sync iterator");
      });
    });
  });
  describe("ArrayLike as `stream`", () => {
    it("returns all awaited chunk values in the stream", async () => {
      const stream = {
        length: 3,
        0: 1,
        1: Promise.resolve(2),
        2: Promise.resolve(3),
      };

      const actual = await arrayFrom(stream);

      assertEquals(actual, [1, 2, 3]);
    });
    it("returns [] if the stream is empty", async () => {
      const stream = {
        length: 0,
      };

      const actual = await arrayFrom(stream);

      assertEquals(actual, []);
    });
    it("rejects if the chunk value in the stream is rejected", async () => {
      const stream = {
        length: 3,
        0: 1,
        1: Promise.resolve(2),
        2: Promise.reject("error"),
      };

      const actual = await assertRejects(() => arrayFrom(stream));

      assertEquals(actual, "error");
    });
    describe("with `mapFn`", () => {
      it("returns all awaited mapped values in the stream", async () => {
        const stream = {
          length: 3,
          0: 1,
          1: Promise.resolve(2),
          2: Promise.resolve(3),
        };
        const mapFn = spy(returnsNext([10, Promise.resolve(11), 12]));

        const actual = await arrayFrom(stream, mapFn);

        assertEquals(actual, [10, 11, 12]);
        assertSpyCalls(mapFn, 3);
        assertSpyCallArgs(mapFn, 0, [1, 0]);
        assertSpyCallArgs(mapFn, 1, [2, 1]);
        assertSpyCallArgs(mapFn, 2, [3, 2]);
      });
      it("rejects if `mapFn` throws", async () => {
        const stream = {
          length: 3,
          0: 1,
          1: Promise.resolve(2),
          2: Promise.resolve(3),
        };
        const error = new Error("error");
        const mapFn = spy(returnsNext([10, 11, error]));

        const actual = await assertRejects(() => arrayFrom(stream, mapFn));

        assertEquals(actual, error);
      });
      it("rejects if `mapFn` rejects", async () => {
        const stream = {
          length: 3,
          0: 1,
          1: Promise.resolve(2),
          2: Promise.resolve(3),
        };
        const mapFn = spy(returnsNext([10, 11, Promise.reject("error")]));

        const actual = await assertRejects(() => arrayFrom(stream, mapFn));

        assertEquals(actual, "error");
      });
    });
  });
});
