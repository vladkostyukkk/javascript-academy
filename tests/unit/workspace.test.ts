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
      checks: Array.from({ length: 11 }, () => ({
        id: "a",
        passed: true,
        feedback: "ok",
      })),
    }).success,
  ).toBe(false);
});
