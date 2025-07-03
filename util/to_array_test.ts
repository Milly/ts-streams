import { describe, it } from "#bdd";
import { assert, assertEquals, assertFalse, assertRejects } from "@std/assert";
import {
  assertSpyCallArgs,
  assertSpyCalls,
  returnsNext,
  spy,
} from "@std/testing/mock";
import { from } from "../readable/from.ts";
import { toArray } from "./to_array.ts";

describe("toArray()", () => {
  describe("if `stream` is ReadableStream", () => {
    it("returns the all chunk in the stream", async () => {
      const stream = from([1, 2, 3]);

      const actual = await toArray(stream);

      assertEquals(actual, [1, 2, 3]);
      assertFalse(stream.locked, "should stream unlocked");
    });
    it("returns [] if the stream is empty", async () => {
      const stream = from([]);

      const actual = await toArray(stream);

      assertEquals(actual, []);
      assertFalse(stream.locked, "should stream unlocked");
    });
    it("throws if the stream is rejected", async () => {
      const stream = from([1, 2, Promise.reject("error")]);

      const actual = await assertRejects(() => toArray(stream));

      assertEquals(actual, "error");
      assertFalse(stream.locked, "should stream unlocked");
    });
    describe("if `project` is specified", () => {
      it("returns all awaited mapped values in the stream", async () => {
        const stream = from([1, 2, 3]);
        const project = spy(returnsNext([10, Promise.resolve(11), 12]));

        const actual = await toArray(stream, project);

        assertEquals(actual, [10, 11, 12]);
        assertSpyCalls(project, 3);
        assertSpyCallArgs(project, 0, [1, 0]);
        assertSpyCallArgs(project, 1, [2, 1]);
        assertSpyCallArgs(project, 2, [3, 2]);
        assertFalse(stream.locked, "should stream unlocked");
      });
      it("rejects if `project` throws", async () => {
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
        const project = spy(returnsNext([10, 11, error]));

        const actual = await assertRejects(() => toArray(stream, project));

        assertEquals(actual, error);
        assertFalse(stream.locked, "should stream unlocked");
        assertEquals(cancelReason, undefined);
      });
      it("rejects if `project` rejects", async () => {
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
        const project = spy(returnsNext([10, 11, Promise.reject("error")]));

        const actual = await assertRejects(() => toArray(stream, project));

        assertEquals(actual, "error");
        assertFalse(stream.locked, "should stream unlocked");
        assertEquals(cancelReason, undefined);
      });
    });
  });
  describe("if `stream` is AsyncIterable", () => {
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

      const actual = await toArray(stream);

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

      const actual = await toArray(stream);

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

      const actual = await assertRejects(() => toArray(stream));

      assertEquals(actual, "error");
      assert(streamClosed, "should closes async iterator");
    });
    describe("if `project` is specified", () => {
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
        const project = spy(returnsNext([10, Promise.resolve(11), 12]));

        const actual = await toArray(stream, project);

        assertEquals(actual, [10, 11, 12]);
        assertSpyCalls(project, 3);
        assertSpyCallArgs(project, 0, [1, 0]);
        assertSpyCallArgs(project, 1, [2, 1]);
        assertSpyCallArgs(project, 2, [3, 2]);
        assert(streamClosed, "should closes sync iterator");
      });
      it("rejects if `project` throws", async () => {
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
        const project = spy(returnsNext([10, 11, error]));

        const actual = await assertRejects(() => toArray(stream, project));

        assertEquals(actual, error);
        assert(streamClosed, "should closes async iterator");
      });
      it("rejects if `project` rejects", async () => {
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
        const project = spy(returnsNext([10, 11, Promise.reject("error")]));

        const actual = await assertRejects(() => toArray(stream, project));

        assertEquals(actual, "error");
        assert(streamClosed, "should closes async iterator");
      });
    });
  });
  describe("if `stream` is Iterable", () => {
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

      const actual = await toArray(stream);

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

      const actual = await toArray(stream);

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

      const actual = await assertRejects(() => toArray(stream));

      assertEquals(actual, "error");
      // Ref: https://github.com/tc39/ecma262/pull/2600
      assert(streamClosed, "should closes sync iterator");
    });
    describe("if `project` is specified", () => {
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
        const project = spy(returnsNext([10, Promise.resolve(11), 12]));

        const actual = await toArray(stream, project);

        assertEquals(actual, [10, 11, 12]);
        assertSpyCalls(project, 3);
        assertSpyCallArgs(project, 0, [1, 0]);
        assertSpyCallArgs(project, 1, [2, 1]);
        assertSpyCallArgs(project, 2, [3, 2]);
        assert(streamClosed, "should closes sync iterator");
      });
      it("rejects if `project` throws", async () => {
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
        const project = spy(returnsNext([10, 11, error]));

        const actual = await assertRejects(() => toArray(stream, project));

        assertEquals(actual, error);
        assert(streamClosed, "should closes sync iterator");
      });
      it("rejects if `project` rejects", async () => {
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
        const project = spy(returnsNext([10, 11, Promise.reject("error")]));

        const actual = await assertRejects(() => toArray(stream, project));

        assertEquals(actual, "error");
        assert(streamClosed, "should closes sync iterator");
      });
    });
  });
  describe("if `stream` is ArrayLike", () => {
    it("returns all awaited chunk values in the stream", async () => {
      const stream = {
        length: 3,
        0: 1,
        1: Promise.resolve(2),
        2: Promise.resolve(3),
      };

      const actual = await toArray(stream);

      assertEquals(actual, [1, 2, 3]);
    });
    it("returns [] if the stream is empty", async () => {
      const stream = {
        length: 0,
      };

      const actual = await toArray(stream);

      assertEquals(actual, []);
    });
    it("rejects if the chunk value in the stream is rejected", async () => {
      const stream = {
        length: 3,
        0: 1,
        1: Promise.resolve(2),
        2: Promise.reject("error"),
      };

      const actual = await assertRejects(() => toArray(stream));

      assertEquals(actual, "error");
    });
    describe("if `project` is specified", () => {
      it("returns all awaited mapped values in the stream", async () => {
        const stream = {
          length: 3,
          0: 1,
          1: Promise.resolve(2),
          2: Promise.resolve(3),
        };
        const project = spy(returnsNext([10, Promise.resolve(11), 12]));

        const actual = await toArray(stream, project);

        assertEquals(actual, [10, 11, 12]);
        assertSpyCalls(project, 3);
        assertSpyCallArgs(project, 0, [1, 0]);
        assertSpyCallArgs(project, 1, [2, 1]);
        assertSpyCallArgs(project, 2, [3, 2]);
      });
      it("rejects if `project` throws", async () => {
        const stream = {
          length: 3,
          0: 1,
          1: Promise.resolve(2),
          2: Promise.resolve(3),
        };
        const error = new Error("error");
        const project = spy(returnsNext([10, 11, error]));

        const actual = await assertRejects(() => toArray(stream, project));

        assertEquals(actual, error);
      });
      it("rejects if `project` rejects", async () => {
        const stream = {
          length: 3,
          0: 1,
          1: Promise.resolve(2),
          2: Promise.resolve(3),
        };
        const project = spy(returnsNext([10, 11, Promise.reject("error")]));

        const actual = await assertRejects(() => toArray(stream, project));

        assertEquals(actual, "error");
      });
    });
  });
});
