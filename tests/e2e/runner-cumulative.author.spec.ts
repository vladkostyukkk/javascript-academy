import { expect, test } from "@playwright/test";
import { readLessonBundle } from "../../lib/lessons/content-files";
import { createLessonRunner } from "./helpers/lesson-runner";

for (const checkpointNumber of [20, 30]) {
  const checkpointId = `js-${checkpointNumber}`;
  test(`${checkpointId} solution passes every earlier FocusBoard check`, async ({
    page,
  }) => {
    const { solution } = await readLessonBundle(checkpointId);
    const run = await createLessonRunner(page);

    for (let number = 1; number < checkpointNumber; number++) {
      const lessonId = `js-${String(number).padStart(2, "0")}`;
      const label = `${checkpointId} solution against ${lessonId}`;
      await test.step(label, async () => {
        const { checks } = await readLessonBundle(lessonId);
        const events = await run(solution, checks);
        expect(events.at(-1), label).toMatchObject({
          kind: "execution",
          operation: "check",
          checks: checks.map(({ id }) => ({ id, passed: true })),
        });
      });
    }
  });
}
