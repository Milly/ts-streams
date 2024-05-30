import { describe, it } from "@std/testing/bdd";
import {
  assertEquals,
  assertInstanceOf,
  assertRejects,
  unimplemented,
} from "@std/assert";
import { assertType, type IsExact } from "@std/testing/types";
import {
  assertSpyCallArgs,
  assertSpyCalls,
  spy,
  stub,
} from "@std/testing/mock";
import { delay } from "@std/async/delay";
import { testStream } from "@milly/streamtest";
import { postMessage, type PostMessageTarget } from "./post_message.ts";

describe("postMessage()", () => {
  describe("returns a WritableStream<T> type if", () => {
    it("is no `transfer`", () => {
      type X = { x: number };
      const target: PostMessageTarget<X> = {
        postMessage: () => unimplemented(),
      };

      const actual = postMessage(target);

      assertType<IsExact<typeof actual, WritableStream<X>>>(true);
      assertInstanceOf(actual, WritableStream);
    });
    it("specifies message type", () => {
      type X = { x: number };
      const target: PostMessageTarget = { postMessage: () => unimplemented() };

      const actual = postMessage<X>(target);

      assertType<IsExact<typeof actual, WritableStream<X>>>(true);
      assertInstanceOf(actual, WritableStream);
    });
  });
  describe("returns a WritableStream and", () => {
    it("posts data as a message to `target`", async () => {
      await testStream(async ({ readable, run }) => {
        const target: PostMessageTarget = {
          postMessage: () => unimplemented(),
        };
        const postMessageSpy = stub(target, "postMessage");
        const source = readable("-a-b--c|");

        await run([source], async (source) => {
          const p = source.pipeTo(postMessage(target));

          await delay(1);
          assertSpyCalls(postMessageSpy, 0);
          await delay(100);
          assertSpyCalls(postMessageSpy, 1);
          assertSpyCallArgs(postMessageSpy, 0, ["a", undefined]);
          await delay(200);
          assertSpyCalls(postMessageSpy, 2);
          assertSpyCallArgs(postMessageSpy, 1, ["b", undefined]);
          await delay(300);
          assertSpyCalls(postMessageSpy, 3);
          assertSpyCallArgs(postMessageSpy, 2, ["c", undefined]);
          await delay(100);

          await p;
        });
      });
    });
    it("posts the return value of the `transfer` as transferable", async () => {
      await testStream(async ({ readable, run }) => {
        const target: PostMessageTarget = {
          postMessage: () => unimplemented(),
        };
        const postMessageSpy = stub(target, "postMessage");
        const source = readable("-a-b--c|", {
          a: new Uint8Array([1]),
          b: new Uint8Array([2]),
          c: new Uint8Array([3]),
        });
        const transfer = spy(
          (chunk: Uint8Array, _index: number): Transferable[] => {
            return [chunk.buffer];
          },
        );

        await run([source], async (source) => {
          const p = source.pipeTo(postMessage(target, transfer));

          await delay(1);
          assertSpyCalls(postMessageSpy, 0);
          await delay(100);
          assertSpyCalls(postMessageSpy, 1);
          assertSpyCallArgs(postMessageSpy, 0, [new Uint8Array([1]), [
            new Uint8Array([1]).buffer,
          ]]);
          await delay(200);
          assertSpyCalls(postMessageSpy, 2);
          assertSpyCallArgs(postMessageSpy, 1, [new Uint8Array([2]), [
            new Uint8Array([2]).buffer,
          ]]);
          await delay(300);
          assertSpyCalls(postMessageSpy, 3);
          assertSpyCallArgs(postMessageSpy, 2, [new Uint8Array([3]), [
            new Uint8Array([3]).buffer,
          ]]);
          await delay(100);

          await p;
        });
      });
    });
    it("aborts if `transfer` throws an error", async () => {
      await testStream(async ({ readable, assertReadable }) => {
        const target: PostMessageTarget = {
          postMessage: () => unimplemented(),
        };
        const postMessageSpy = stub(target, "postMessage");
        const transfer = () => {
          throw "error";
        };
        const source = readable("-a-b--c|");
        const expectedSource = " -(a!)";

        const p = source.pipeTo(postMessage(target, transfer));
        p.catch(() => {});

        await assertReadable(source, expectedSource, {}, "error");
        const reason = await assertRejects(() => p);
        assertEquals(reason, "error");
        assertSpyCalls(postMessageSpy, 0);
      });
    });
  });
});
