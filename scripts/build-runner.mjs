import { build } from "esbuild";

await build({
  entryPoints: ["lib/runner/runtime.ts"],
  outfile: "public/runner/runtime.js",
  bundle: true,
  format: "iife",
  globalName: "AcademyRuntime",
  platform: "browser",
  target: "es2022",
  minify: false,
});
console.log("Ізольований runtime зібрано з TypeScript.");
