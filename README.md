# streams

[![license:MIT](https://img.shields.io/github/license/Milly/ts-streams)](LICENSE)
[![jsr](https://jsr.io/badges/@milly/streams)](https://jsr.io/@milly/streams)
[![Test](https://github.com/Milly/ts-streams/actions/workflows/test.yml/badge.svg)](https://github.com/Milly/ts-streams/actions/workflows/test.yml)
[![codecov](https://codecov.io/gh/Milly/ts-streams/branch/master/graph/badge.svg)](https://codecov.io/gh/Milly/ts-streams)

TypeScript modules that provides utilities for
[Streams API](https://developer.mozilla.org/docs/Web/API/Streams_API).

## Example

```typescript
import { from } from "@milly/streams/readable/from";
import { fromMessage } from "@milly/streams/readable/from-message";
import { switchMap } from "@milly/streams/transform/switch-map";
import { take } from "@milly/streams/transform/take";
import { forEach } from "@milly/streams/writable/for-each";
import { postMessage } from "@milly/streams/writable/post-message";

async function* gen() {
  yield 1;
  await Promise.resolve();
  yield "foo";
  await Promise.resolve();
  yield true;
}

const { port1, port2 } = new MessageChannel();

from(gen())
  .pipeThrough(switchMap((chunk) => [chunk, typeof chunk]))
  .pipeTo(postMessage(port1))
  .finally(() => {
    port1.close();
  });

await fromMessage(port2)
  .pipeThrough(take(6))
  .pipeTo(forEach((chunk) => {
    console.log(chunk);
  }))
  .finally(() => {
    port2.close();
  });
// output: 1
// output: number
// output: foo
// output: string
// output: true
// output: boolean
```

## License

This library is licensed under the MIT License. See the [LICENSE](./LICENSE)
file for details.
