import { MAX_LESSON_CHECKS, checksSchema } from "@/lib/lessons/schema";
import { checkpointSchema } from "@/lib/progress/checkpoint-schema";
import { expect, it } from "vitest";
import { readLessonBundle } from "@/lib/lessons/content-files";
import { editDraft, isDirty, lessonRun } from "@/lib/workspace/state";
import { prepareRun } from "@/lib/runner/prepare";
import { payloadSchema, runInputSchema } from "@/lib/runner/protocol";

it("edits only authorized files, tracks revisions and preserves the starter", async () => {
  const bundle = await readLessonBundle("js-01");
  const draft = { files: structuredClone(bundle.starter), revision: 0 };
  expect(isDirty(draft.files, bundle.starter)).toBe(false);
  expect(
    editDraft(draft, "index.html", "oops", bundle.meta.editablePaths),
  ).toBe(draft);
  expect(
    editDraft(draft, "src/missing.js", "oops", bundle.meta.editablePaths),
  ).toBe(draft);
  const changed = editDraft(
    draft,
    "src/app.js",
    "console.log(1);",
    bundle.meta.editablePaths,
  );
  expect(changed.revision).toBe(1);
  expect(isDirty(changed.files, bundle.starter)).toBe(true);
  expect(
    editDraft(
      changed,
      "src/app.js",
      "console.log(1);",
      bundle.meta.editablePaths,
    ),
  ).toBe(changed);
  expect(
    bundle.starter.find((file) => file.path === "src/app.js")?.content,
  ).not.toBe("console.log(1);");
});
it("prepares run/check without reference files and rejects modified scaffolding", async () => {
  const bundle = await readLessonBundle("js-01");
  for (const operation of ["run", "check"] as const) {
    const plan = await prepareRun(
      lessonRun(
        bundle.starter,
        bundle.starter,
        bundle.meta.editablePaths,
        bundle.checks,
        operation,
      ),
    );
    expect(plan.mode).toBe("lesson");
    expect(plan.assertion.kind).toBe("lesson");
    expect(plan.files).toEqual(bundle.starter);
  }
  const broken = bundle.starter.map((file) =>
    file.path === "styles.css" ? { ...file, content: "tampered" } : file,
  );
  expect(() =>
    lessonRun(
      broken,
      bundle.starter,
      bundle.meta.editablePaths,
      bundle.checks,
      "check",
    ),
  ).toThrow("основи");
});
it("rejects mismatched execution mode, unsafe bindings and oversized result sets", async () => {
  const bundle = await readLessonBundle("js-01");
  const plan = lessonRun(
    bundle.starter,
    bundle.starter,
    bundle.meta.editablePaths,
    bundle.checks,
    "check",
  );
  expect(runInputSchema.safeParse({ ...plan, mode: "classic" }).success).toBe(
    false,
  );
  expect(
    runInputSchema.safeParse({
      ...plan,
      assertion: {
        kind: "lesson",
        operation: "check",
        checks: [
          { ...bundle.checks[0], binding: "x);attack();//" },
          bundle.checks[1],
        ],
      },
    }).success,
  ).toBe(false);
  expect(
    payloadSchema.safeParse({
      kind: "execution",
      operation: "check",
      checks: Array.from({ length: MAX_LESSON_CHECKS + 1 }, () => ({
        id: "a",
        passed: true,
        feedback: "ok",
      })),
    }).success,
  ).toBe(false);
});

it("shares bounded check capacity across content, runner and persisted checkpoints", async () => {
  const bundle = await readLessonBundle("js-05");
  for (const count of [2, 12, MAX_LESSON_CHECKS, MAX_LESSON_CHECKS + 1]) {
    const checks = Array.from({ length: count }, (_, index) => ({
      id: "check-" + index,
      kind: "bindingEquals" as const,
      binding: "completed",
      expected: false,
      feedback: "Потрібне булеве false.",
    }));
    const accepted = count <= MAX_LESSON_CHECKS;
    expect(checksSchema.safeParse(checks).success).toBe(accepted);
    expect(
      runInputSchema.safeParse({
        mode: "lesson",
        files: bundle.starter,
        entry: "src/app.js",
        mock: { status: 200, delayMs: 0 },
        assertion: { kind: "lesson", operation: "check", checks },
      }).success,
    ).toBe(accepted);
    expect(
      payloadSchema.safeParse({
        kind: "execution",
        operation: "check",
        checks: checks.map(({ id, feedback }) => ({
          id,
          feedback,
          passed: true,
        })),
      }).success,
    ).toBe(accepted);
    expect(
      checkpointSchema.safeParse({
        schemaVersion: 1,
        lessonId: "js-05",
        courseContentVersion: 1,
        sourceRevision: 0,
        sourceToken: "550e8400-e29b-41d4-a716-446655440000",
        fileMap: bundle.solution,
        completedAt: "2026-11-17T12:00:00.000Z",
        passedCheckIds: checks.map(({ id }) => id),
      }).success,
    ).toBe(accepted);
  }
});
