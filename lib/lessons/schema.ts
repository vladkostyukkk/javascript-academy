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
const bindingValue = z.union([
  z.string().max(1000),
  z.number().finite(),
  z.boolean(),
]);
const probeValue = bindingValue.nullable();

const structureAtom = z.union([
  z.string().max(128),
  z.number().finite(),
  z.boolean(),
  z.null(),
]);
const structureKey = z
  .string()
  .regex(/^[a-z][A-Za-z0-9]{0,31}$/)
  .refine((key) => key !== "constructor" && key !== "prototype");
const structureRecord = z
  .custom<Record<string, unknown>>((value) => {
    if (value === null || typeof value !== "object") return false;
    const prototype: unknown = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return false;
    const keys = Reflect.ownKeys(value);
    return (
      keys.length <= 8 &&
      keys.every((key) => {
        if (!structureKey.safeParse(key).success) return false;
        const field = Object.getOwnPropertyDescriptor(value, key);
        return field?.enumerable && Object.hasOwn(field, "value");
      })
    );
  }, "Очікується запис із власними полями даних.")
  .pipe(z.record(structureKey, structureAtom));

function denseArrayUpTo(max: number) {
  return z.custom<unknown[]>((value) => {
    if (!Array.isArray(value) || value.length > max) return false;
    if (Reflect.ownKeys(value).length !== value.length + 1) return false;
    for (let index = 0; index < value.length; index++) {
      const entry = Object.getOwnPropertyDescriptor(value, index);
      if (!entry?.enumerable || !Object.hasOwn(entry, "value")) return false;
    }
    return true;
  }, "Очікується масив даних без пропусків.");
}

const structure = z.union([
  structureRecord,
  denseArrayUpTo(12).pipe(z.array(z.union([structureAtom, structureRecord]))),
]);
const structureValue = z.union([structureAtom, structure]);
export type StructureCheckValue = z.infer<typeof structureValue>;

const undefinedResult = z
  .custom<{ $undefined: true }>((value) => {
    if (value === null || typeof value !== "object") return false;
    const prototype: unknown = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return false;
    if (Reflect.ownKeys(value).length !== 1) return false;
    const field = Object.getOwnPropertyDescriptor(value, "$undefined");
    return (
      field?.enumerable && Object.hasOwn(field, "value") && field.value === true
    );
  }, "Очікується маркер { $undefined: true }.")
  .pipe(z.strictObject({ $undefined: z.literal(true) }));

function fitsStructureBudget(data: unknown) {
  return new TextEncoder().encode(JSON.stringify(data)).length <= 4096;
}

const bindingStructure = z
  .strictObject({
    ...checkBase,
    kind: z.literal("bindingStructure"),
    binding: z.enum([
      "taskTitles",
      "updatedTaskTitles",
      "completionFlags",
      "task",
      "tasks",
      "firstTask",
      "secondTask",
      "thirdTask",
      "taskDraft",
      "updatedTask",
      "taskLabels",
      "completedTasks",
      "sortedTasks",
      "taskStats",
    ]),
    expected: structure,
  })
  .refine(
    ({ expected }) => fitsStructureBudget(expected),
    "Очікувані дані перевищують 4 KiB.",
  );

const callStructure = z
  .strictObject({
    ...checkBase,
    kind: z.literal("callStructure"),
    binding: z.enum([
      "getTaskTitleAt",
      "addTaskTitleAt",
      "removeTaskTitleAt",
      "countCompleted",
      "getFirstCompletedIndex",
      "setTaskStatus",
      "hasTaskField",
      "updateTask",
      "getTaskCardText",
      "getTaskLabels",
      "findTaskById",
      "filterCompletedTasks",
      "sortTasksByPriority",
      "getTaskStats",
    ]),
    args: denseArrayUpTo(3).pipe(z.array(structureValue)),
    expected: z.union([structureValue, undefinedResult]),
    firstArgAfter: structure.optional(),
    returnsCopy: z.literal(true).optional(),
  })
  .superRefine(({ args, expected, firstArgAfter, returnsCopy }, ctx) => {
    if (!fitsStructureBudget({ args, expected, firstArgAfter }))
      ctx.addIssue({
        code: "custom",
        message: "Дані перевірки перевищують 4 KiB.",
      });
    if (firstArgAfter === undefined && !returnsCopy) return;

    const first = args[0];
    const firstIsStructure = first !== null && typeof first === "object";
    if (!firstIsStructure)
      ctx.addIssue({
        code: "custom",
        path: ["args", 0],
        message: "Перший аргумент має бути масивом або записом.",
      });
    if (firstArgAfter !== undefined && returnsCopy)
      ctx.addIssue({
        code: "custom",
        path: ["returnsCopy"],
        message: "Обери перевірку зміненого аргументу або копії.",
      });
    if (
      returnsCopy &&
      (expected === null ||
        typeof expected !== "object" ||
        Object.hasOwn(expected, "$undefined") ||
        Array.isArray(expected) !== Array.isArray(first))
    )
      ctx.addIssue({
        code: "custom",
        path: ["expected"],
        message: "Копія має бути структурою того самого типу, що й аргумент.",
      });
  });

export const checksSchema = z
  .array(
    z.discriminatedUnion("kind", [
      z.strictObject({
        ...checkBase,
        kind: z.literal("bindingEquals"),
        binding: z.string().regex(/^[a-zA-Z_$][a-zA-Z0-9_$]*$/),
        expected: bindingValue,
      }),
      z.strictObject({
        ...checkBase,
        kind: z.literal("consoleEquals"),
        expected: z.array(z.array(z.string().max(1000)).max(10)).max(10),
      }),
      z.strictObject({
        ...checkBase,
        kind: z.literal("callEquals"),
        binding: z.enum([
          "getPriorityLabel",
          "formatTaskText",
          "validateTitle",
          "formatMinutes",
        ]),
        args: z.array(probeValue).max(2),
        expected: probeValue,
      }),
      z.strictObject({ ...checkBase, kind: z.literal("generatorSequence") }),
      z.strictObject({
        ...checkBase,
        kind: z.literal("moduleCallEquals"),
        path: virtualPathSchema.refine((path) => path.endsWith(".js")),
        binding: z
          .string()
          .regex(/^[a-zA-Z_$][a-zA-Z0-9_$]*$/)
          .max(100),
        args: z.array(probeValue).max(2),
        expected: probeValue,
      }),
      z.strictObject({
        ...checkBase,
        kind: z.literal("domTextEquals"),
        selector: z.string().min(1).max(100),
        expected: z.string().max(500).nullable(),
        steps: z
          .array(
            z.discriminatedUnion("kind", [
              z.strictObject({
                kind: z.literal("input"),
                selector: z.string().min(1).max(100),
                value: z.string().max(500),
              }),
              z.strictObject({
                kind: z.enum(["click", "submit"]),
                selector: z.string().min(1).max(100),
              }),
            ]),
          )
          .max(8)
          .optional(),
      }),
      bindingStructure,
      callStructure,
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
      path: virtualPathSchema.optional(),
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
