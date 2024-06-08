import esbuild from "esbuild";
import { glob } from "glob";

// NOTE: Script cwd should be project root.
const files = await glob("**/*_test.ts", {
  ignore: ["node_modules/**"],
  posix: true,
});
const contents = files.map((file) => `import("./${file}");`).join("\n");
const ctx = await esbuild.context({
  bundle: true,
  sourcemap: true,
  allowOverwrite: true,
  write: false,
  entryPoints: ["./tests/browser/setup.ts"],
  stdin: {
    contents,
    loader: "ts",
    resolveDir: "./",
  },
  outdir: "./tests/browser/",
  target: "es2022",
  format: "esm",
  platform: "node",
  conditions: ["browser"],
  external: ["./stdin.js"],
});
await ctx.serve({
  servedir: "./",
  host: "127.0.0.1",
  port: 8000,
});
