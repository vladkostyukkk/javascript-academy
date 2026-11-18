import { z } from "zod";

type NonzeroDigit = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export type LessonId =
  | `js-0${NonzeroDigit}`
  | `js-${1 | 2 | 3 | 4 | 5}${0 | NonzeroDigit}`
  | "js-60";

export function isLessonId(value: unknown): value is LessonId {
  return typeof value === "string" && /^js-(0[1-9]|[1-5][0-9]|60)$/.test(value);
}

export const lessonIdSchema = z.custom<LessonId>(
  isLessonId,
  "Очікується ID js-01…js-60.",
);
const text = z.string().trim().min(1).max(2000);
const identifier = z.string().regex(/^[a-z][a-z0-9-]{0,49}$/);

// Canonical relative paths only: no URL, percent encoding, Windows separators or dot segments.
export const virtualPathSchema = z
  .string()
  .max(160)
  .refine(
    (path) =>
      path === "index.html" ||
      path === "styles.css" ||
      /^(src\/(?:[a-z][a-z0-9-]*\/)*[a-z][a-z0-9-]*\.js|mock\/[a-z][a-z0-9-]*\.json)$/.test(
        path,
      ),
    "Невідомий або небезпечний шлях у проєкті.",
  );

const manifestLessonSchema = z.strictObject({
  id: lessonIdSchema,
  number: z.number().int().min(1).max(60),
  module: z.number().int().min(1).max(6),
  moduleTitle: text,
  title: text,
  practiceGoal: text,
  primaryFile: z.union([virtualPathSchema, z.literal("project-export")]),
  prerequisites: z.array(lessonIdSchema).max(1),
  status: z.enum(["planned", "published"]),
});

export const manifestSchema = z
  .strictObject({
    courseId: z.literal("javascript-zero-to-app"),
    language: z.literal("uk"),
    project: z.literal("FocusBoard"),
    version: z.number().int().positive(),
    lessons: z.array(manifestLessonSchema).length(60),
  })
  .superRefine((manifest, ctx) => {
    const seen = new Set<string>();
    manifest.lessons.forEach((lesson, index) => {
      const fail = (message: string) =>
        ctx.addIssue({ code: "custom", path: ["lessons", index], message });
      if (seen.has(lesson.id)) fail("Повторений ID уроку.");
      seen.add(lesson.id);
      if (
        lesson.id !== `js-${String(index + 1).padStart(2, "0")}` ||
        lesson.number !== index + 1
      )
        fail("Пропущено ID або порушено порядок уроків.");
      if (lesson.module !== Math.floor(index / 10) + 1)
        fail("Урок належить іншому модулю.");
      if (
        lesson.moduleTitle !==
        manifest.lessons[Math.floor(index / 10) * 10].moduleTitle
      )
        fail("Назви одного модуля не узгоджені.");
      const prerequisites = index === 0 ? [] : [manifest.lessons[index - 1].id];
      if (
        JSON.stringify(lesson.prerequisites) !== JSON.stringify(prerequisites)
      )
        fail("Передумовою має бути лише попередній урок.");
      if ((lesson.primaryFile === "project-export") !== (lesson.id === "js-60"))
        fail("project-export — спеціальна дія лише уроку js-60.");
    });
  });

export const contentIndexSchema = z
  .array(lessonIdSchema)
  .min(1)
  .refine(
    (ids) => new Set(ids).size === ids.length,
    "Повторений ID в індексі матеріалів.",
  );
export type ManifestLesson = z.infer<typeof manifestLessonSchema>;

export const lessonMetaSchema = z.strictObject({
  id: lessonIdSchema,
  number: z.number().int().min(1).max(60),
  title: text,
  module: z.number().int().min(1).max(6),
  prerequisites: z.array(lessonIdSchema).max(1),
  durationMinutes: z.number().int().min(5).max(180),
  objectives: z.array(text).min(2).max(4),
  editablePaths: z.array(virtualPathSchema).min(1),
  courseContentVersion: z.number().int().positive(),
});

const questionSchema = z
  .strictObject({
    id: identifier,
    prompt: text,
    options: z
      .array(z.strictObject({ id: identifier, label: text, explanation: text }))
      .min(2)
      .max(5),
    correctOptionId: identifier,
  })
  .superRefine((question, ctx) => {
    if (
      new Set(question.options.map(({ id }) => id)).size !==
      question.options.length
    )
      ctx.addIssue({
        code: "custom",
        message: "Варіанти відповіді мають унікальні ID.",
      });
    if (!question.options.some(({ id }) => id === question.correctOptionId))
      ctx.addIssue({
        code: "custom",
        message: "Правильна відповідь відсутня серед варіантів.",
      });
  });

export const quizSchema = z
  .array(questionSchema)
  .min(2)
  .max(5)
  .refine(
    (questions) =>
      new Set(questions.map(({ id }) => id)).size === questions.length,
    "Повторений ID запитання.",
  );
export type Quiz = z.infer<typeof quizSchema>;
export const hintsSchema = z.array(text).length(3);

export const fileMapSchema = z
  .array(
    z.strictObject({
      path: virtualPathSchema,
      content: z
        .string()
        .max(65_536)
        .refine(
          (value) => new TextEncoder().encode(value).length <= 65_536,
          "Файл перевищує 64 KiB.",
        ),
    }),
  )
  .min(3)
  .max(50)
  .superRefine((files, ctx) => {
    const paths = files.map(({ path }) => path);
    if (new Set(paths).size !== paths.length)
      ctx.addIssue({ code: "custom", message: "Повторений шлях файла." });
    for (const required of ["index.html", "styles.css", "src/app.js"]) {
      if (!paths.includes(required))
        ctx.addIssue({
          code: "custom",
          message: `Немає обов’язкового файла ${required}.`,
        });
    }
    if (
      files.reduce(
        (total, file) => total + new TextEncoder().encode(file.content).length,
        0,
      ) > 262_144
    )
      ctx.addIssue({ code: "custom", message: "Проєкт перевищує 256 KiB." });
  });
export type FileMap = z.infer<typeof fileMapSchema>;

export const MAX_LESSON_CHECKS = 32;

const checkBase = { id: identifier, feedback: text };
export const checksSchema = z
  .array(
    z.discriminatedUnion("kind", [
      z.strictObject({
        ...checkBase,
        kind: z.literal("bindingEquals"),
        binding: z.string().regex(/^[a-zA-Z_$][a-zA-Z0-9_$]*$/),
        expected: z.union([
          z.string().max(1000),
          z.number().finite(),
          z.boolean(),
        ]),
      }),
      z.strictObject({
        ...checkBase,
        kind: z.literal("consoleEquals"),
        expected: z.array(z.array(z.string().max(1000)).max(10)).max(10),
      }),
    ]),
  )
  .min(2)
  .max(MAX_LESSON_CHECKS)
  .refine(
    (checks) => new Set(checks.map(({ id }) => id)).size === checks.length,
    "Повторений ID перевірки.",
  );
export type LessonCheck = z.infer<typeof checksSchema>[number];

export const negativeCasesSchema = z
  .array(
    z.strictObject({
      id: identifier,
      category: z.enum(["empty", "invalid", "edge"]),
      source: z.string().max(65_536),
      failedCheckIds: z.array(identifier).min(1),
    }),
  )
  .min(4)
  .superRefine((cases, ctx) => {
    if (new Set(cases.map(({ id }) => id)).size !== cases.length)
      ctx.addIssue({
        code: "custom",
        message: "Повторений негативний сценарій.",
      });
    if (
      !cases.some(({ category }) => category === "empty") ||
      !cases.some(({ category }) => category === "invalid") ||
      cases.filter(({ category }) => category === "edge").length < 2
    )
      ctx.addIssue({
        code: "custom",
        message:
          "Потрібні порожній, некоректний і щонайменше 2 крайові сценарії.",
      });
  });

export const checkpointSchema = z.strictObject({
  lessonId: lessonIdSchema,
  courseContentVersion: z.number().int().positive(),
  fileHashes: z.record(virtualPathSchema, z.string().regex(/^[a-f0-9]{64}$/)),
});
