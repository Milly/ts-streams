import { describe, it } from "#bdd";
import {
  assertEquals,
  assertInstanceOf,
  assertStrictEquals,
} from "@std/assert";
import { assertType, type IsExact } from "@std/testing/types";
import { assertSpyCallArg, assertSpyCalls, spy, stub } from "@std/testing/mock";
import { delay } from "@std/async/delay";
import { testStream } from "@milly/streamtest";
import { fromEvent } from "./from_event.ts";

class MouseEvent {
  type: string;
  clientX?: number;
  clientY?: number;

  constructor(type: string, options: { clientX?: number; clientY?: number }) {
    this.type = type;
    this.clientX = options?.clientX;
    this.clientY = options?.clientY;
  }
}

describe("fromEvent()", () => {
  describe("returns a ReadableStream<T> type if", () => {
    it("is no `predicate`", async () => {
      const target = new AbortController().signal;

      const actual = fromEvent(target, "abort");
      await actual.cancel();

      assertType<IsExact<typeof actual, ReadableStream<Event>>>(true);
      assertInstanceOf(actual, ReadableStream);
    });
    it("specifies event type", async () => {
      const target = {
        addEventListener() {},
        removeEventListener() {},
      };

      const actual = fromEvent<MouseEvent>(target, "progress");
      await actual.cancel();

      assertType<IsExact<typeof actual, ReadableStream<MouseEvent>>>(true);
      assertInstanceOf(actual, ReadableStream);
    });
    it("is `predicate` return type", async () => {
      type T = { x: number };
      const target = {
        addEventListener() {},
        removeEventListener() {},
      };
      const predicate = (): T => ({ x: 42 });

      const actual = fromEvent(target, "progress", predicate);
      await actual.cancel();

      assertType<IsExact<typeof actual, ReadableStream<T>>>(true);
      assertInstanceOf(actual, ReadableStream);
    });
    it("is `options.predicate` return type", async () => {
      type T = { x: number };
      const target = {
        addEventListener() {},
        removeEventListener() {},
      };
      const predicate = (): T => ({ x: 42 });

      const actual = fromEvent(target, "progress", { predicate });
      await actual.cancel();

      assertType<IsExact<typeof actual, ReadableStream<T>>>(true);
      assertInstanceOf(actual, ReadableStream);
    });
  });
  describe("returns a ReadableStream and", () => {
    it("adds or removes the event listener to the `target`", async () => {
      const target = {
        addEventListener(
          _type: string,
          _listener: (evt: unknown) => void,
          _options: unknown,
        ) {},
        removeEventListener(
          _type: string,
          _listener: (evt: unknown) => void,
          _options: unknown,
        ) {},
      };
      const addEventListenerSpy = stub(target, "addEventListener");
      const removeEventListenerSpy = stub(target, "removeEventListener");

      assertSpyCalls(addEventListenerSpy, 0);
      const actual = fromEvent(target, "click", { capture: false, once: true });
      assertSpyCalls(addEventListenerSpy, 1);

      assertSpyCalls(removeEventListenerSpy, 0);
      await actual.cancel();
      assertSpyCalls(removeEventListenerSpy, 1);

      assertSpyCallArg(addEventListenerSpy, 0, 0, "click");
      assertSpyCallArg(addEventListenerSpy, 0, 2, {
        capture: false,
        once: true,
      });
      assertSpyCallArg(removeEventListenerSpy, 0, 0, "click");
      assertSpyCallArg(removeEventListenerSpy, 0, 2, { capture: false });
      assertEquals(typeof addEventListenerSpy.calls[0].args[1], "function");
      assertStrictEquals(
        addEventListenerSpy.calls[0].args[1],
        removeEventListenerSpy.calls[0].args[1],
      );
    });
    it("emits the event object from the `target`", async () => {
      await testStream(async ({ assertReadable }) => {
        const target = {
          addEventListener(
            _type: "click",
            listener: (evt: MouseEvent) => void,
          ) {
            (async () => {
              await delay(100);
              listener(new MouseEvent("click", { clientX: 100, clientY: 200 }));
              await delay(200);
              listener(new MouseEvent("click", { clientX: 200, clientY: 200 }));
              await delay(300);
              listener(new MouseEvent("click", { clientX: 200, clientY: 300 }));
            })();
          },
          removeEventListener() {},
        };
        const expected = "-a-b--c---";
        const expectedValues = {
          a: new MouseEvent("click", { clientX: 100, clientY: 200 }),
          b: new MouseEvent("click", { clientX: 200, clientY: 200 }),
          c: new MouseEvent("click", { clientX: 200, clientY: 300 }),
        };

        const actual = fromEvent(target, "click");

        await assertReadable(actual, expected, expectedValues);
      });
    });
    it("emits the return value of the `predicate`", async () => {
      await testStream(async ({ assertReadable }) => {
        const target = {
          addEventListener(
            _type: "click",
            listener: (evt: MouseEvent) => void,
          ) {
            (async () => {
              await delay(100);
              listener(new MouseEvent("click", { clientX: 100, clientY: 200 }));
              await delay(200);
              listener(new MouseEvent("click", { clientX: 200, clientY: 200 }));
              await delay(300);
              listener(new MouseEvent("click", { clientX: 200, clientY: 300 }));
            })();
          },
          removeEventListener() {},
        };
        const predicate = spy((evt: Event) => (evt as MouseEvent).clientX);
        const expected = "-a-b--c---";
        const expectedValues = {
          a: 100,
          b: 200,
          c: 200,
        };

        const actual = fromEvent(target, "click", predicate);

        await assertReadable(actual, expected, expectedValues);
        assertSpyCalls(predicate, 3);
      });
    });
    it("closes after the first event is emitted if `options.once` is true", async () => {
      await testStream(async ({ assertReadable }) => {
        const target = {
          addEventListener(_type: string, listener: (evt: MouseEvent) => void) {
            (async () => {
              await delay(300);
              listener(new MouseEvent("click", { clientX: 100, clientY: 200 }));
            })();
          },
          removeEventListener() {},
        };
        const expected = "---(a|)";
        const expectedValues = {
          a: new MouseEvent("click", { clientX: 100, clientY: 200 }),
        };

        const actual = fromEvent(target, "click", { once: true });

        await assertReadable(actual, expected, expectedValues);
      });
    });
    it("aborts when `options.signal` is aborted", async () => {
      await testStream(async ({ abort, assertReadable }) => {
        const target = {
          addEventListener() {},
          removeEventListener() {},
        };
        const signal = abort("---!", "abort");
        const expected = "    ---#";

        const actual = fromEvent(target, "click", { signal });

        await assertReadable(actual, expected, {}, "abort");
      });
    });
    it("aborts if `options.signal` is already aborted", async () => {
      await testStream(async ({ assertReadable }) => {
        const abortController = new AbortController();
        const { signal } = abortController;
        const target = {
          addEventListener() {},
          removeEventListener() {},
        };
        const expected = "#";

        abortController.abort("abort");
        const actual = fromEvent(target, "click", { signal });

        await assertReadable(actual, expected, {}, "abort");
      });
    });
    it("aborts if `predicate` throws an error", async () => {
      await testStream(async ({ assertReadable }) => {
        const target = {
          addEventListener(
            _type: "click",
            listener: (evt: MouseEvent) => void,
          ) {
            (async () => {
              await delay(100);
              listener(new MouseEvent("click", { clientX: 100, clientY: 200 }));
            })();
          },
          removeEventListener() {},
        };
        const predicate = () => {
          throw "error";
        };
        const expected = "-#";

        const actual = fromEvent(target, "click", predicate);

        await assertReadable(actual, expected, {}, "error");
      });
    });
  });
});
