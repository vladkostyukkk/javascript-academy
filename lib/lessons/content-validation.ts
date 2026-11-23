import { createHash } from "node:crypto";
import { validateMarkdown } from "./markdown";
import {
  checkpointSchema,
  checksSchema,
  fileMapSchema,
  hintsSchema,
  lessonMetaSchema,
  negativeCasesSchema,
  quizSchema,
  type FileMap,
  type ManifestLesson,
} from "./schema";

export type LessonBundleInput = {
  meta: unknown;
  theory: string;
  challenge: string;
  quiz: unknown;
  hints: unknown;
  starter: unknown;
  solution: unknown;
  checks: unknown;
  negativeCases: unknown;
  checkpoint: unknown;
};

export function hashFileMap(files: FileMap) {
  return Object.fromEntries(
    files.map(({ path, content }) => [
      path,
      createHash("sha256").update(content.replace(/\r\n/g, "\n")).digest("hex"),
    ]),
  );
}

export function validateLessonBundle(
  input: LessonBundleInput,
  summary: ManifestLesson,
  courseVersion: number,
) {
  const meta = lessonMetaSchema.parse(input.meta);
  const starter = fileMapSchema.parse(input.starter);
  const solution = fileMapSchema.parse(input.solution);
  const checks = checksSchema.parse(input.checks);
  const negativeCases = negativeCasesSchema.parse(input.negativeCases);
  const checkpoint = checkpointSchema.parse(input.checkpoint);
  for (const field of [
    "id",
    "number",
    "title",
    "module",
    "prerequisites",
  ] as const) {
    if (JSON.stringify(meta[field]) !== JSON.stringify(summary[field]))
      throw new Error(
        `${summary.id}: поле ${field} не збігається з маніфестом.`,
      );
  }
  if (
    meta.courseContentVersion !== courseVersion ||
    checkpoint.courseContentVersion !== courseVersion ||
    checkpoint.lessonId !== meta.id
  )
    throw new Error(
      `${summary.id}: неузгоджена версія матеріалів або checkpoint.`,
    );
  const starterPaths = starter.map(({ path }) => path).sort();
  const solutionPaths = solution.map(({ path }) => path).sort();
  if (JSON.stringify(starterPaths) !== JSON.stringify(solutionPaths))
    throw new Error(
      `${summary.id}: starter і solution мають містити той самий набір файлів.`,
    );
  if (
    new Set(meta.editablePaths).size !== meta.editablePaths.length ||
    meta.editablePaths.some((path) => !starterPaths.includes(path))
  )
    throw new Error(
      `${summary.id}: editablePaths містить повторений або невідомий файл.`,
    );
  if (
    summary.primaryFile !== "project-export" &&
    !meta.editablePaths.includes(summary.primaryFile)
  )
    throw new Error(
      `${summary.id}: основний файл має бути доступним для редагування.`,
    );
  for (const scenario of negativeCases) {
    if (
      scenario.path !== undefined &&
      !meta.editablePaths.includes(scenario.path)
    )
      throw new Error(
        `${summary.id}: негативний сценарій має редагувати доступний файл.`,
      );
    if (
      scenario.failedCheckIds.some(
        (id) => !checks.some((check) => check.id === id),
      )
    )
      throw new Error(
        `${summary.id}: негативний сценарій посилається на невідому перевірку.`,
      );
  }
  const hashes = hashFileMap(solution);
  if (
    JSON.stringify(Object.keys(checkpoint.fileHashes).sort()) !==
      JSON.stringify(solutionPaths) ||
    solutionPaths.some((path) => checkpoint.fileHashes[path] !== hashes[path])
  )
    throw new Error(
      `${summary.id}: контрольні суми checkpoint не відповідають еталону.`,
    );
  return {
    meta,
    starter,
    solution,
    checks,
    negativeCases,
    checkpoint,
    theory: validateMarkdown(input.theory),
    challenge: validateMarkdown(input.challenge),
    quiz: quizSchema.parse(input.quiz),
    hints: hintsSchema.parse(input.hints),
  };
}

export type LessonBundle = ReturnType<typeof validateLessonBundle>;
