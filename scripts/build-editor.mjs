import { build } from "esbuild";
import { copyFile } from "node:fs/promises";

const shared = {
  bundle: true,
  platform: "browser",
  target: "es2022",
  minify: true,
  loader: { ".ttf": "file" },
  logLevel: "warning",
};
await build({
  ...shared,
  entryPoints: ["lib/workspace/editor-entry.ts"],
  outfile: "public/monaco/editor.js",
  format: "iife",
  globalName: "AcademyMonaco",
});
await build({
  ...shared,
  entryPoints: {
    "editor-worker":
      "node_modules/monaco-editor/esm/vs/editor/editor.worker.js",
    "ts-worker":
      "node_modules/monaco-editor/esm/vs/languages/features/typescript/ts.worker.js",
  },
  outdir: "public/monaco",
  format: "iife",
});
await copyFile(
  "node_modules/monaco-editor/LICENSE",
  "public/monaco/LICENSE.txt",
);
await copyFile(
  "node_modules/monaco-editor/ThirdPartyNotices.txt",
  "public/monaco/ThirdPartyNotices.txt",
);
console.log("Monaco та language workers зібрано локально, без CDN.");
