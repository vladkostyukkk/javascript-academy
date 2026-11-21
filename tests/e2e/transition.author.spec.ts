import { expect, test, type Page } from "@playwright/test";
import { readLessonBundle } from "../../lib/lessons/content-files";
import { openWorkspace, writeCode, checkCode } from "./helpers/workspace";

async function pasteFixture(page: Page, source: string) {
  const editor = page.getByRole("textbox", { name: /Код src\/app.js/ });
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
      test.setTimeout(240_000);
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
      for (const scenario of bundle.negativeCases) {
        if (scenario.category === "edge")
          await pasteFixture(page, scenario.source);
        else await writeCode(page, scenario.source || "// empty");
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
      await pasteFixture(
        page,
        bundle.solution.find((file) => file.path === "src/app.js")!.content +
          "\n// learner target " +
          lesson.id,
      );
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
    },
  );
}
