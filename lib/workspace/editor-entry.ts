// Bundled separately for the browser; imported by neither Next.js nor the runner.
export * from "monaco-editor/editor/editor.api";
import "monaco-editor/editor/browser/coreCommands";
import "monaco-editor/editor/contrib/find/browser/findController";
import "monaco-editor/editor/contrib/hover/browser/hoverContribution";
import "monaco-editor/editor/contrib/suggest/browser/suggestController";
import "monaco-editor/editor/contrib/gotoError/browser/markerSelectionStatus";
import "monaco-editor/editor/contrib/toggleTabFocusMode/browser/toggleTabFocusMode";
import "monaco-editor/languages/definitions/javascript/register";
import "monaco-editor/languages/definitions/html/register";
import "monaco-editor/languages/definitions/css/register";
import {
  javascriptDefaults,
  ScriptTarget,
} from "monaco-editor/languages/features/typescript/register";

const scope = globalThis as typeof globalThis & {
  MonacoEnvironment: {
    getWorkerUrl: (_moduleId: string, label: string) => string;
  };
};
scope.MonacoEnvironment = {
  getWorkerUrl: (_moduleId, label) =>
    label === "javascript" || label === "typescript"
      ? "/monaco/ts-worker.js"
      : "/monaco/editor-worker.js",
};
javascriptDefaults.setCompilerOptions({
  allowJs: true,
  checkJs: false,
  target: ScriptTarget.ES2020,
  noEmit: true,
  allowNonTsExtensions: true,
});
javascriptDefaults.setDiagnosticsOptions({
  noSemanticValidation: true,
  noSyntaxValidation: false,
});
