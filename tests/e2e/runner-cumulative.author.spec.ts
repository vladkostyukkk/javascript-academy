import { expect, test } from "@playwright/test";
import { readLessonBundle } from "../../lib/lessons/content-files";
import { createLessonRunner } from "./helpers/lesson-runner";

test("js-20 solution passes every earlier FocusBoard check", async ({
  page,
}) => {
  const { solution } = await readLessonBundle("js-20");
  const run = await createLessonRunner(page);

  for (let number = 1; number < 20; number++) {
    const lessonId = `js-${String(number).padStart(2, "0")}`;
    await test.step(`js-20 solution against ${lessonId}`, async () => {
      const { checks } = await readLessonBundle(lessonId);
      const events = await run(solution, checks);
      expect(events.at(-1), `js-20 solution against ${lessonId}`).toMatchObject(
        {
          kind: "execution",
          operation: "check",
          checks: checks.map(({ id }) => ({ id, passed: true })),
        },
      );
    });
  }
});
