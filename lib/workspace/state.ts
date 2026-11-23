import {
  fileMapSchema,
  type FileMap,
  type LessonCheck,
} from "@/lib/lessons/schema";
import type { RunInput } from "@/lib/runner/protocol";

export interface WorkspaceDraft {
  files: FileMap;
  revision: number;
}
export function editDraft(
  draft: WorkspaceDraft,
  path: string,
  content: string,
  editablePaths: string[],
): WorkspaceDraft {
  if (
    !editablePaths.includes(path) ||
    !draft.files.some((file) => file.path === path && file.content !== content)
  )
    return draft;
  return {
    files: draft.files.map((file) =>
      file.path === path ? { ...file, content } : file,
    ),
    revision: draft.revision + 1,
  };
}
export function isDirty(files: FileMap, starter: FileMap): boolean {
  return files.some(
    (file) =>
      starter.find((original) => original.path === file.path)?.content !==
      file.content,
  );
}
export function lessonRun(
  files: FileMap,
  starter: FileMap,
  editablePaths: string[],
  checks: LessonCheck[],
  operation: "run" | "check",
): RunInput {
  const parsed = fileMapSchema.parse(files);
  if (
    parsed.length !== starter.length ||
    parsed.some(
      (file) =>
        !starter.some(
          (original) =>
            original.path === file.path &&
            (editablePaths.includes(file.path) ||
              original.content === file.content),
        ),
    )
  )
    throw new Error(
      "Файли основи проєкту змінені. Віднови їх перед перевіркою.",
    );
  return {
    mode: checks.some(({ kind }) => kind === "moduleCallEquals")
      ? "lesson-module"
      : checks.some(({ kind }) => kind === "domTextEquals")
        ? "lesson-dom"
        : "lesson",
    files: parsed,
    entry: "src/app.js",
    assertion: { kind: "lesson", checks, operation },
    mock: { status: 200, delayMs: 0 },
  };
}
