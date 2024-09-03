const FILES = Deno.args.map((f) => f.replaceAll("\\", "/"));
const EXCLUDES = [
  /^tests\//,
  /_test\.ts$/,
];

for (const file of FILES) {
  if (EXCLUDES.some((exclude) => exclude.test(file))) continue;
  Deno.test(file, async (t) => {
    for await (const { code, start, end } of findCodeBlocks(file)) {
      await t.step(`$${start}-${end}`, async () => {
        await evalCode(code);
      });
    }
  });
}

async function* findCodeBlocks(file: string) {
  const decoder = new TextDecoder("utf-8");
  const markdown = decoder.decode(await Deno.readFile(file));
  const codeReg = /^(?: *\* )?```(?:typescript|ts)\n(?<code>.*?)```/dgms;
  for (const { groups, indices } of markdown.matchAll(codeReg)) {
    const code = groups!.code.replaceAll(/^ *\* ?/dgm, "");
    const [start, end] = indices![0];
    yield {
      code,
      start: getLine(markdown, start),
      end: getLine(markdown, end),
    };
  }
}

function getLine(doc: string, pos: number): number {
  return doc.slice(0, pos).split("\n").length;
}

async function evalCode(code: string): Promise<unknown> {
  const blob = new Blob([code], { type: "text/typescript" });
  const url = URL.createObjectURL(blob);
  try {
    return await import(url);
  } finally {
    URL.revokeObjectURL(url);
  }
}
