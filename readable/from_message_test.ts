import { describe, it } from "#bdd";
import {
  assertEquals,
  assertInstanceOf,
  assertThrows,
  unimplemented,
} from "@std/assert";
import { assertType, type IsExact } from "@std/testing/types";
import { assertSpyCalls, spy } from "@std/testing/mock";
import { delay } from "@std/async/delay";
import { testStream } from "@milly/streamtest";
import { fromMessage, type FromMessageTarget } from "./from_message.ts";

describe("fromMessage()", () => {
  describe("returns a ReadableStream<T> type if", () => {
    it("is no `predicate`", () => {
      type X = { x: number };
      const target: FromMessageTarget<X> = { onmessage: null };

      const actual = fromMessage(target);

      assertType<IsExact<typeof actual, ReadableStream<X>>>(true);
      assertInstanceOf(actual, ReadableStream);
    });
    it("specifies message type", () => {
      type X = { x: number };
      const target: FromMessageTarget = { onmessage: null };

      const actual = fromMessage<X>(target);

      assertType<IsExact<typeof actual, ReadableStream<X>>>(true);
      assertInstanceOf(actual, ReadableStream);
    });
    it("is `predicate` return type", () => {
      type R = { x: number };
      const target: FromMessageTarget = { onmessage: null };
      const predicate = (): R => ({ x: 42 });

      const actual = fromMessage(target, predicate);

      assertType<IsExact<typeof actual, ReadableStream<R>>>(true);
      assertInstanceOf(actual, ReadableStream);
    });
    it("is `options.predicate` return type", () => {
      type R = { x: number };
      const target: FromMessageTarget = { onmessage: null };
      const predicate = (): R => ({ x: 42 });

      const actual = fromMessage(target, { predicate });

      assertType<IsExact<typeof actual, ReadableStream<R>>>(true);
      assertInstanceOf(actual, ReadableStream);
    });
  });
  describe("if `target.onmessage` is not empty", () => {
    const target: FromMessageTarget<string> = {
      onmessage: () => unimplemented(),
    };

    it("throws if `force` is not specified", () => {
      assertThrows(
        () => fromMessage(target),
        TypeError,
        "target.onmessage is not empty",
      );
    });
    it("throws if `force` is false", () => {
      assertThrows(
        () => fromMessage(target, { force: false }),
        TypeError,
        "target.onmessage is not empty",
      );
    });
    it("does not throws if `force` is true", () => {
      fromMessage(target, { force: true });
    });
  });
  describe("throws if `options.predicate` is", () => {
    // deno-lint-ignore no-explicit-any
    const tests: [name: string, predicate: any][] = [
      ["null", null],
      ["string", "foo"],
      ["number", 42],
      ["object", { foo: 42 }],
      ["symbol", Symbol.for("some-symbol")],
      ["Promise", Promise.resolve(() => true)],
    ];
    for (const [name, predicate] of tests) {
      it(name, () => {
        const target: FromMessageTarget<string> = {
          onmessage: null,
        };

        assertThrows(
          () => fromMessage(target, { predicate }),
          TypeError,
          "'predicate' is not a function",
        );
      });
    }
  });
  describe("returns a ReadableStream and", () => {
    it("set or delete the message handler to the `target`", async () => {
      const target = { onmessage: null };

      const actual = fromMessage(target);

      assertInstanceOf(target.onmessage, Function);

      await actual.cancel();

      assertEquals(target.onmessage, null);
    });
    it("emits the message data from the `target`", async () => {
      await testStream(async ({ assertReadable }) => {
        const target: FromMessageTarget<string> = { onmessage: null };
        (async () => {
          await delay(100);
          target.onmessage?.(new MessageEvent("message", { data: "a" }));
          await delay(200);
          target.onmessage?.(new MessageEvent("message", { data: "b" }));
          await delay(300);
          target.onmessage?.(new MessageEvent("message", { data: "c" }));
        })();
        const expected = "-a-b--c---";

        const actual = fromMessage(target);

        await assertReadable(actual, expected);
      });
    });
    it("emits the return value of the `predicate`", async () => {
      await testStream(async ({ assertReadable }) => {
        const target: FromMessageTarget<string> = { onmessage: null };
        (async () => {
          await delay(100);
          target.onmessage?.(new MessageEvent("message", { data: "a" }));
          await delay(200);
          target.onmessage?.(new MessageEvent("message", { data: "b" }));
          await delay(300);
          target.onmessage?.(new MessageEvent("message", { data: "c" }));
        })();
        const predicate = spy((evt: MessageEvent<string>) =>
          evt.data.toUpperCase()
        );
        const expected = "-A-B--C---";

        const actual = fromMessage(target, predicate);

        await assertReadable(actual, expected);
        assertSpyCalls(predicate, 3);
      });
    });
    it("aborts if `predicate` throws an error", async () => {
      await testStream(async ({ assertReadable }) => {
        const target: FromMessageTarget<string> = { onmessage: null };
        (async () => {
          await delay(100);
          target.onmessage?.(new MessageEvent("message", { data: "a" }));
        })();
        const predicate = () => {
          throw "error";
        };
        const expected = "-#";

        const actual = fromMessage(target, predicate);

        await assertReadable(actual, expected, {}, "error");
      });
    });
  });
});
