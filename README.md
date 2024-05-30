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
import { switchMap } from "@milly/streams/transformer/switch-map";
import { forEach } from "@milly/streams/writable/for-each";
import { postMessage } from "@milly/streams/writable/post-message";
import { delay } from "@std/async/delay";

async function* gen() {
  yield 1;
  await delay(100);
  yield "foo";
  await delay(100);
  yield true;
}

const { port1, port2 } = new MessageChannel();

from(gen())
  .pipeThrough(switchMap((chunk) => [chunk, typeof chunk]))
  .pipeTo(postMessage(port1))
  .finally(() => {
    port1.close();
  });

fromMessage(port2)
  .pipeTo(forEach((chunk) => {
    console.log(chunk);
  }));
// output: 1
// output: numbr
// output: foo
// output: string
// output: true
// output: boolean
```

## License

This library is licensed under the MIT License. See the [LICENSE](./LICENSE)
file for details.
