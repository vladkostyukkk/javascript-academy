import { expect, test } from "@playwright/test";
import { readLessonBundle } from "../../lib/lessons/content-files";
import type { LessonCheck } from "../../lib/lessons/schema";
import { createLessonRunner } from "./helpers/lesson-runner";

for (const number of Array.from({ length: 27 }, (_, index) => index + 34)) {
  const id = `js-${number}`;
  test(`interactive ${id} checks reference and edge cases`, async ({
    page,
  }) => {
    const bundle = await readLessonBundle(id);
    const run = await createLessonRunner(page);
    const reference = await run(bundle.solution, bundle.checks);
    expect(reference.at(-1)).toMatchObject({
      kind: "execution",
      operation: "check",
      checks: bundle.checks.map(({ id }) => ({ id, passed: true })),
    });

    for (const scenario of bundle.negativeCases) {
      await test.step(scenario.id, async () => {
        const files = bundle.solution.map((file) =>
          file.path === (scenario.path ?? "src/app.js")
            ? { ...file, content: scenario.source }
            : file,
        );
        const events = await run(files, bundle.checks);
        const terminal = events.at(-1);
        if (scenario.id === "missing-public-exports") {
          expect(terminal?.kind).toBe("error");
          expect(scenario.failedCheckIds).toHaveLength(bundle.checks.length);
          return;
        }
        expect(terminal).toMatchObject({
          kind: "execution",
          operation: "check",
          checks: bundle.checks.map(({ id }) => ({
            id,
            passed: !scenario.failedCheckIds.includes(id),
          })),
        });
      });
    }
  });
}

test("interactive js-50 preserves previous task data and caps Undo", async ({
  page,
}) => {
  const { solution } = await readLessonBundle("js-50");
  const run = await createLessonRunner(page);
  const path = "src/author-check.js";
  const checks: LessonCheck[] = ["preservesPrevious", "capsHistory"].map(
    (binding, index) => ({
      id: `check-${index}`,
      kind: "moduleCallEquals",
      path,
      binding,
      args: [],
      expected: true,
      feedback: "Перевір незмінність записів та обмеження історії.",
    }),
  );
  const events = await run(
    [
      ...solution,
      {
        path,
        content: `
          import { createStore, updateTask } from "./state/store.js";

          export function preservesPrevious() {
            const original = [{ id: 1, title: "План" }, { id: 2, title: "Пауза" }];
            const updated = updateTask(original, 1, { title: "Новий план" });
            return original[0].title === "План" && updated[0].title === "Новий план" &&
              updated !== original && updated[0] !== original[0] && updated[1] === original[1];
          }

          export function capsHistory() {
            const store = createStore({ tasks: [], filter: "all" });
            for (let id = 1; id <= 11; id++) store.setState({ tasks: [{ id }], filter: "all" });
            store.setState({ ...store.getState(), filter: "completed" });
            for (let index = 0; index < 11; index++) store.undoTasks();
            return store.getState().tasks[0]?.id === 1 && store.getState().filter === "completed";
          }
        `,
      },
    ],
    checks,
  );
  expect(events.at(-1)).toMatchObject({
    kind: "execution",
    checks: checks.map(({ id }) => ({ id, passed: true })),
  });
});
