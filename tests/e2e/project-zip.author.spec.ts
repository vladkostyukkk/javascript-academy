import { writeFile } from "node:fs/promises";
import { test } from "@playwright/test";
import { readLessonBundle } from "../../lib/lessons/content-files";
import { createProjectZip } from "../../lib/progress/project-zip";
import { verifyIndependentProject } from "./helpers/project-zip";

test("final ZIP runs independently from Academy", async ({ page }, info) => {
  const { solution } = await readLessonBundle("js-60");
  const archive = info.outputPath("FocusBoard.zip");
  await writeFile(archive, createProjectZip(solution));
  await verifyIndependentProject(page, archive);
});
