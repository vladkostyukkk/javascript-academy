import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { readLessonBundle } from "../../lib/lessons/content-files";
import { checkpointSchema } from "../../lib/progress/checkpoint-schema";
import { createLessonRunner } from "./helpers/lesson-runner";
import { verifyIndependentProject } from "./helpers/project-zip";
import { openWorkspace, writeCode, checkCode } from "./helpers/workspace";

async function pasteFixture(page: Page, source: string, path = "src/app.js") {
  if (
    !(await page
      .getByRole("textbox", { name: "Код " + path, exact: true })
      .isVisible())
  )
    await page.getByRole("tab", { name: path, exact: true }).click();
  const editor = page.getByRole("textbox", {
    name: "Код " + path,
    exact: true,
  });
  await editor.press("ControlOrMeta+a");
  // Exercise Monaco's paste handling without Chromium's long-text IME path.
  await editor.evaluate((target, text) => {
    const clipboardData = new DataTransfer();
    clipboardData.setData("text/plain", text);
    target.dispatchEvent(
      new ClipboardEvent("paste", {
        bubbles: true,
        cancelable: true,
        clipboardData,
      }),
    );
  }, source);
}

async function pasteLessonFiles(
  page: Page,
  bundle: Awaited<ReturnType<typeof readLessonBundle>>,
) {
  for (const file of bundle.solution) {
    if (
      file.path === "src/app.js" ||
      !bundle.meta.editablePaths.includes(file.path)
    )
      continue;
    const original = bundle.starter.find(({ path }) => path === file.path);
    if (original?.content === file.content) continue;
    await pasteFixture(page, file.content, file.path);
  }
}

async function read(page: Page, store: string, key: string) {
  return page.evaluate(
    async ({ store, key }) => {
      const db = await new Promise<IDBDatabase>((resolve) => {
        const r = indexedDB.open("javascript-academy");
        r.onsuccess = () => resolve(r.result);
      });
      try {
        return await new Promise<unknown>((resolve) => {
          const r = db.transaction(store).objectStore(store).get(key);
          r.onsuccess = () => resolve(r.result);
        });
      } finally {
        db.close();
      }
    },
    { store, key },
  );
}
async function completeFirst(page: Page) {
  await openWorkspace(page);
  await writeCode(
    page,
    'const appName = "FocusBoard"; console.log(appName); // learner note',
  );
  await checkCode(page);
  await page
    .getByRole("button", { name: "Завершити урок і зберегти checkpoint" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Урок завершено", exact: true }),
  ).toBeVisible();
}
async function openLessonPractice(page: Page, lessonId = "js-02") {
  const bundle = await readLessonBundle(lessonId);
  for (const question of bundle.quiz) {
    const answer = question.options.find(
      (option) => option.id === question.correctOptionId,
    )!;
    await page
      .getByRole("group", { name: question.prompt })
      .getByRole("radio", { name: answer.label, exact: true })
      .check();
  }
  await page
    .getByRole("button", { name: "Перевірити відповіді", exact: true })
    .click();
  await page.getByRole("button", { name: "Перейти до практики" }).click();
  await expect(page.locator(".monaco-editor")).toBeVisible();
  return bundle;
}
async function secondCheck(page: Page) {
  await page.getByRole("button", { name: "Перевірити", exact: true }).click();
  await expect(page.locator("[data-check-id]:visible")).toHaveCount(5);
}
test("js-02 requires completed js-01 even through direct navigation", async ({
  page,
}) => {
  await page.goto("/learn/javascript/js-02");
  await expect(
    page.getByText(
      "Спочатку заверши попередній урок, щоб продовжити свій FocusBoard.",
    ),
  ).toBeVisible();
  await expect(page.locator(".monaco-editor")).toHaveCount(0);
  expect(await read(page, "drafts", "js-02")).toBeUndefined();
});
test("js-02 inherits learner files; reference and edge cases execute in isolated runner", async ({
  page,
}) => {
  await completeFirst(page);
  const source = await read(page, "checkpoints", "js-01@1");
  await page.getByRole("link", { name: "Наступний урок: let і const" }).click();
  const bundle = await openLessonPractice(page);
  expect(JSON.stringify(await read(page, "drafts", "js-02"))).toContain(
    "learner note",
  );
  await secondCheck(page);
  await expect(
    page.locator('[data-check-id][data-passed="false"]:visible'),
  ).toHaveCount(3);
  for (const scenario of bundle.negativeCases) {
    await writeCode(page, scenario.source || "// empty");
    await secondCheck(page);
    const failures = await page
      .locator('[data-check-id][data-passed="false"]:visible')
      .evaluateAll((nodes) =>
        nodes.map((node) => node.getAttribute("data-check-id")).sort(),
      );
    expect(failures, scenario.id).toEqual([...scenario.failedCheckIds].sort());
  }
  const solution = bundle.solution.find(
    (file) => file.path === "src/app.js",
  )!.content;
  await writeCode(page, solution + "\n// keep my second lesson");
  await secondCheck(page);
  await expect(
    page.locator('[data-check-id][data-passed="true"]:visible'),
  ).toHaveCount(5);
  await expect
    .poll(async () => JSON.stringify(await read(page, "drafts", "js-02")))
    .toContain("keep my second lesson");
  await page.reload();
  await expect(page.locator(".monaco-editor")).toBeVisible();
  expect(JSON.stringify(await read(page, "drafts", "js-02"))).toContain(
    "keep my second lesson",
  );
  await secondCheck(page);
  await page
    .getByRole("button", { name: "Завершити урок і зберегти checkpoint" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Урок завершено", exact: true }),
  ).toBeVisible();
  expect(await read(page, "checkpoints", "js-01@1")).toEqual(source);
  await page.goto("/course/javascript");
  await expect(
    page.getByRole("link", { name: /02\. let і const\. Завершено/ }),
  ).toBeVisible();
});
test("incompatible source requires explicit official starter and preserves source", async ({
  page,
}) => {
  await completeFirst(page);
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve) => {
      const r = indexedDB.open("javascript-academy");
      r.onsuccess = () => resolve(r.result);
    });
    await new Promise<void>((resolve) => {
      const tx = db.transaction("checkpoints", "readwrite");
      const store = tx.objectStore("checkpoints");
      const r = store.get("js-01@1");
      r.onsuccess = () => {
        const cp = r.result;
        cp.fileMap.find(
          (file: { path: string; content: string }) =>
            file.path === "styles.css",
        ).content = "/* incompatible */";
        store.put(cp, "js-01@1");
      };
      tx.oncomplete = () => resolve();
    });
    db.close();
  });
  const source = await read(page, "checkpoints", "js-01@1");
  await page.goto("/learn/javascript/js-02");
  await expect(
    page.getByRole("button", { name: "Використати офіційну основу" }),
  ).toBeVisible();
  expect(await read(page, "drafts", "js-02")).toBeUndefined();
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Використати офіційну основу" })
    .click();
  await openLessonPractice(page);
  expect(await read(page, "checkpoints", "js-01@1")).toEqual(source);
  expect(JSON.stringify(await read(page, "drafts", "js-02"))).not.toContain(
    "incompatible",
  );
});

for (const lesson of [
  {
    id: "js-03",
    previous: "js-02",
    title: "Рядки",
    count: 7,
    missing: 2,
    prerequisites: ["js-02"],
  },
  {
    id: "js-04",
    previous: "js-03",
    title: "Числа",
    count: 9,
    missing: 2,
    prerequisites: ["js-02", "js-03"],
  },
  {
    id: "js-05",
    previous: "js-04",
    title: "Булеві значення",
    count: 12,
    missing: 3,
    prerequisites: ["js-02", "js-03", "js-04"],
  },
  {
    id: "js-06",
    previous: "js-05",
    title: "Порівняння",
    count: 16,
    missing: 4,
    prerequisites: ["js-02", "js-03", "js-04", "js-05"],
  },
  {
    id: "js-07",
    previous: "js-06",
    title: "Арифметика",
    count: 20,
    missing: 4,
    prerequisites: ["js-02", "js-03", "js-04", "js-05", "js-06"],
  },
  {
    id: "js-08",
    previous: "js-07",
    title: "Шаблонні рядки",
    count: 22,
    missing: 2,
    prerequisites: ["js-02", "js-03", "js-04", "js-05", "js-06", "js-07"],
  },
  {
    id: "js-09",
    previous: "js-08",
    title: "Перетворення типів",
    count: 26,
    missing: 4,
    prerequisites: [
      "js-02",
      "js-03",
      "js-04",
      "js-05",
      "js-06",
      "js-07",
      "js-08",
    ],
  },
  {
    id: "js-10",
    previous: "js-09",
    title: "Підсумкова мініпрактика",
    count: 29,
    missing: 3,
    prerequisites: [
      "js-02",
      "js-03",
      "js-04",
      "js-05",
      "js-06",
      "js-07",
      "js-08",
      "js-09",
    ],
  },
  {
    id: "js-11",
    previous: "js-10",
    title: "if / else",
    count: 32,
    missing: 3,
    prerequisites: [
      "js-02",
      "js-03",
      "js-04",
      "js-05",
      "js-06",
      "js-07",
      "js-08",
      "js-09",
      "js-10",
    ],
  },
  ...[
    { number: 12, title: "else if", count: 20, missing: 3 },
    { number: 13, title: "Логічні оператори", count: 24, missing: 4 },
    { number: 14, title: "Тернарний оператор", count: 27, missing: 3 },
    { number: 15, title: "switch", count: 32, missing: 5 },
    { number: 16, title: "Оголошення функцій", count: 32, missing: 5 },
    {
      number: 17,
      title: "Параметри й значення за замовчуванням",
      count: 32,
      missing: 5,
    },
    { number: 18, title: "return та ранній вихід", count: 32, missing: 7 },
    { number: 19, title: "Стрілкові функції", count: 32, missing: 3 },
    {
      number: 20,
      title: "Область видимості та замикання",
      count: 32,
      missing: 3,
    },
    { number: 21, title: "Масиви", count: 32, missing: 10 },
    {
      number: 22,
      title: "Методи додавання й видалення",
      count: 32,
      missing: 15,
    },
    { number: 23, title: "Цикли for і for...of", count: 32, missing: 13 },
    { number: 24, title: "Об’єкти", count: 32, missing: 2 },
    { number: 25, title: "Властивості об’єктів", count: 32, missing: 9 },
    { number: 26, title: "Деструктуризація і spread", count: 32, missing: 7 },
    { number: 27, title: "map", count: 32, missing: 4 },
    { number: 28, title: "filter і find", count: 32, missing: 8 },
    { number: 29, title: "sort", count: 32, missing: 4 },
    { number: 30, title: "reduce", count: 32, missing: 5 },
    { number: 31, title: "Пошук DOM-елементів", count: 2, missing: 1 },
    { number: 32, title: "Створення елементів", count: 4, missing: 2 },
    { number: 33, title: "Рендеринг списку", count: 6, missing: 3 },
    { number: 34, title: "Події та форми", count: 4, missing: 2 },
    { number: 35, title: "Делегування подій", count: 4, missing: 2 },
    { number: 36, title: "Валідація інтерфейсу", count: 6, missing: 4 },
    { number: 37, title: "Редагування й видалення", count: 5, missing: 3 },
    { number: 38, title: "Фільтри", count: 6, missing: 3 },
    { number: 39, title: "Пошук", count: 6, missing: 4 },
    { number: 40, title: "Kanban-подання", count: 8, missing: 6 },
    { number: 41, title: "ES-модулі", count: 7, missing: 3 },
    { number: 50, title: "Історія змін", count: 7, missing: 2 },
    { number: 60, title: "Фінальне складання", count: 4, missing: 2 },
  ].map(({ number, title, count, missing }) => ({
    id: `js-${number}`,
    previous: `js-${number - 1}`,
    title,
    count,
    missing,
    prerequisites: Array.from(
      { length: number - 2 },
      (_, index) => `js-${String(index + 2).padStart(2, "0")}`,
    ),
  })),
]) {
  test(
    lesson.id + " inherits files, validates fixtures and preserves source",
    async ({ page }) => {
      test.setTimeout(300_000);
      await completeFirst(page);
      await page.goto("/learn/javascript/" + lesson.id);
      await expect(
        page.getByText(
          "Спочатку заверши попередній урок, щоб продовжити свій FocusBoard.",
        ),
      ).toBeVisible();
      expect(await read(page, "drafts", lesson.id)).toBeUndefined();
      for (const id of lesson.prerequisites) {
        await page.goto("/learn/javascript/" + id);
        const bundle = await openLessonPractice(page, id);
        await pasteLessonFiles(page, bundle);
        await pasteFixture(
          page,
          bundle.solution.find((file) => file.path === "src/app.js")!.content +
            "\n// learner source " +
            id,
        );
        await page
          .getByRole("button", { name: "Перевірити", exact: true })
          .click();
        await expect(
          page.locator('[data-check-id][data-passed="true"]:visible'),
        ).toHaveCount(bundle.checks.length);
        await page
          .getByRole("button", { name: "Завершити урок і зберегти checkpoint" })
          .click();
        await expect(
          page.getByRole("heading", { name: "Урок завершено", exact: true }),
        ).toBeVisible();
      }
      const source = await read(page, "checkpoints", lesson.previous + "@1");
      await page
        .getByRole("link", { name: "Наступний урок: " + lesson.title })
        .click();
      const bundle = await openLessonPractice(page, lesson.id);
      expect(JSON.stringify(await read(page, "drafts", lesson.id))).toContain(
        "learner source " + lesson.previous,
      );
      const check = async () => {
        await page
          .getByRole("button", { name: "Перевірити", exact: true })
          .click();
        await expect(page.locator("[data-check-id]:visible")).toHaveCount(
          lesson.count,
        );
      };
      await check();
      await expect(
        page.locator('[data-check-id][data-passed="false"]:visible'),
      ).toHaveCount(lesson.missing);
      const entryOnlyScenarios = bundle.negativeCases.filter(
        ({ path }) => path === undefined,
      );
      for (const scenario of entryOnlyScenarios) {
        await pasteFixture(page, scenario.source || "// empty");
        await check();
        const failures = await page
          .locator('[data-check-id][data-passed="false"]:visible')
          .evaluateAll((nodes) =>
            nodes.map((node) => node.getAttribute("data-check-id")).sort(),
          );
        expect(failures, scenario.id).toEqual(
          [...scenario.failedCheckIds].sort(),
        );
      }
      const solution = bundle.solution.find(
        (file) => file.path === "src/app.js",
      )!.content;
      if (lesson.id === "js-32" || lesson.id === "js-33") {
        const preview = page.frameLocator(
          'iframe[title="Ізольований перегляд FocusBoard"]',
        );
        const run = () =>
          page.getByRole("button", { name: "Запустити", exact: true }).click();
        if (lesson.id === "js-32") {
          const literalTitle = "Порівняти <b> і <i>";
          await pasteFixture(
            page,
            solution.replace(
              '"Вивчити JavaScript"',
              JSON.stringify(literalTitle),
            ),
          );
          await run();
          const heading = preview.locator("#tasks article h2");
          await expect(heading).toHaveText(literalTitle);
          await expect(heading.locator("*")).toHaveCount(0);
        } else {
          await pasteFixture(
            page,
            solution + '\nrenderTasks([]);\nconsole.log("Список очищено");',
          );
          await run();
          await expect(preview.locator("#tasks")).toBeAttached();
          await expect(
            page.getByText("Список очищено", { exact: true }),
          ).toBeVisible();
          await expect(preview.locator("#tasks article")).toHaveCount(0);

          await pasteFixture(page, solution + "\nrenderTasks(tasks);");
          await run();
          await expect(preview.locator("#tasks article h2")).toHaveText([
            "Вивчити JavaScript",
            "Перевірити план",
            "Зробити перерву",
          ]);
        }
      }
      if (lesson.id === "js-41") {
        expect(JSON.stringify(await read(page, "drafts", lesson.id))).toContain(
          "src/domain/tasks.js",
        );
      }
      await pasteLessonFiles(page, bundle);
      await pasteFixture(page, solution + "\n// learner target " + lesson.id);
      if (lesson.id === "js-50") {
        await expect
          .poll(async () => {
            const snapshot = (await read(page, "drafts", lesson.id)) as
              { fileMap: { path: string; content: string }[] } | undefined;
            return snapshot?.fileMap.map((file) => ({
              ...file,
              content: file.content.replace(/\r\n/g, "\n"),
            }));
          })
          .toEqual(
            expect.arrayContaining(
              bundle.solution.map((file) =>
                file.path === "src/app.js"
                  ? {
                      ...file,
                      content: solution + "\n// learner target " + lesson.id,
                    }
                  : file,
              ),
            ),
          );
        const preview = page.frameLocator(
          'iframe[title="Ізольований перегляд FocusBoard"]',
        );
        const run = () =>
          page.getByRole("button", { name: "Запустити", exact: true }).click();
        await page.evaluate(() => {
          sessionStorage.setItem(
            "academy-preview:js-50:1:main",
            JSON.stringify([
              {
                id: 17,
                title: "Стара задача",
                status: "Заплановано",
                priority: 1,
                minutes: 0,
              },
            ]),
          );
        });
        await run();
        await expect(preview.locator("#todo article h2")).toHaveText(
          "Стара задача",
        );
        const title = preview.getByRole("textbox", {
          name: "Назва задачі",
          exact: true,
        });
        await title.fill("Перевірка збереження");
        await title.press("Enter");
        await preview
          .getByRole("button", { name: "Найновіші", exact: true })
          .click();
        await expect(
          preview.locator("#todo article:first-child h2"),
        ).toHaveText("Перевірка збереження");
        await expect
          .poll(() =>
            page.evaluate(() =>
              sessionStorage.getItem("academy-preview:js-50:1:main"),
            ),
          )
          .toContain('"order":"newest"');
        await page.reload();
        await run();
        await expect(
          preview.locator("#todo article:first-child h2"),
        ).toHaveText("Перевірка збереження");
        await page.evaluate(() =>
          sessionStorage.setItem("academy-preview:js-50:1:main", "{broken"),
        );
        await run();
        await expect(preview.locator("#todo article h2")).toHaveText(
          "Зробити перерву",
        );
      }
      if (lesson.id === "js-40") {
        await page
          .getByRole("button", { name: "Запустити", exact: true })
          .click();
        const board = page.frameLocator(
          'iframe[title="Ізольований перегляд FocusBoard"]',
        );
        const title = board.getByRole("textbox", {
          name: "Назва задачі",
          exact: true,
        });
        await title.fill("Перевірити дошку");
        await title.press("Enter");
        await expect(board.locator("#todo article h2")).toHaveText([
          "Зробити перерву",
          "Перевірити дошку",
        ]);
        await title.fill("Друга задача");
        await board
          .getByRole("button", { name: "Додати задачу", exact: true })
          .click();
        const added = board
          .locator("#todo article")
          .filter({ hasText: "Друга задача" });
        await expect(added).toHaveCount(1);
        await added
          .getByRole("button", { name: "Позначити виконаною" })
          .click();
        const done = board
          .locator("#done article")
          .filter({ hasText: "Друга задача" });
        await expect(done).toHaveCount(1);
        await board
          .getByRole("button", { name: "Завершені", exact: true })
          .click();
        await board
          .getByRole("searchbox", { name: "Пошук задач" })
          .fill("друга");
        await expect(board.locator("#done article h2")).toHaveText([
          "Друга задача",
        ]);
        await done.getByRole("textbox").fill("Друга перевірка");
        await done.getByRole("button", { name: "Зберегти назву" }).click();
        await expect(board.locator("#done article h2")).toHaveText([
          "Друга перевірка",
        ]);
        await board
          .locator("#done article")
          .getByRole("button", { name: "Видалити" })
          .click();
        await expect(board.locator("#tasks article")).toHaveCount(0);
      }
      if (lesson.id === "js-31") {
        await page
          .getByRole("button", { name: "Запустити", exact: true })
          .click();
        const preview = page.frameLocator(
          'iframe[title="Ізольований перегляд FocusBoard"]',
        );
        await expect(
          preview.getByRole("heading", {
            name: "FocusBoard — дошка задач",
            exact: true,
          }),
        ).toBeVisible();
        await expect(page.locator("[data-check-id]:visible")).toHaveCount(0);
      }
      await check();
      await expect(
        page.locator('[data-check-id][data-passed="true"]:visible'),
      ).toHaveCount(lesson.count);
      await page
        .getByRole("button", { name: "Завершити урок і зберегти checkpoint" })
        .click();
      await expect(
        page.getByRole("heading", { name: "Урок завершено", exact: true }),
      ).toBeVisible();
      await page.reload();
      await expect(
        page.getByRole("heading", { name: "Урок завершено", exact: true }),
      ).toBeVisible();
      expect(
        JSON.stringify(await read(page, "checkpoints", lesson.id + "@1")),
      ).toContain("learner target " + lesson.id);
      expect(await read(page, "checkpoints", lesson.previous + "@1")).toEqual(
        source,
      );
      if (lesson.id === "js-41") {
        const checkpoint = checkpointSchema.parse(
          await read(page, "checkpoints", lesson.id + "@1"),
        );
        const savedFiles = checkpoint.fileMap.map((file) => ({
          ...file,
          content: file.content.replace(/\r\n/g, "\n"),
        }));
        expect(savedFiles).toEqual(
          expect.arrayContaining(
            bundle.solution.filter(({ path }) => path !== "src/app.js"),
          ),
        );
      }
      await page.goto("/course/javascript");
      await page
        .getByRole("searchbox", { name: "Пошук уроків" })
        .fill(lesson.id);
      await expect(
        page.getByRole("link", {
          name: lesson.id.slice(3) + ". " + lesson.title + ". Завершено",
          exact: true,
        }),
      ).toBeVisible();
      if (lesson.id === "js-50") {
        await page.goto("/project");
        const download = page.waitForEvent("download");
        await page
          .locator(".checkpoint-history li")
          .filter({ hasText: "js-50" })
          .getByRole("button", { name: "Завантажити checkpoint JSON" })
          .click();
        const exported = checkpointSchema.parse(
          JSON.parse(await readFile(await (await download).path(), "utf8")),
        );
        expect(exported.lessonId).toBe("js-50");
        const replay = await createLessonRunner(page);
        expect(
          (await replay(exported.fileMap, bundle.checks)).at(-1),
        ).toMatchObject({
          kind: "execution",
          checks: bundle.checks.map(({ id }) => ({ id, passed: true })),
        });
      }
      if (lesson.id === "js-60") {
        await page.goto("/project");
        const download = page.waitForEvent("download");
        await page
          .getByRole("button", { name: "Завантажити FocusBoard ZIP" })
          .click();
        const archive = await download;
        expect(archive.suggestedFilename()).toBe("FocusBoard.zip");
        await verifyIndependentProject(page, await archive.path());
      }
    },
  );
}
