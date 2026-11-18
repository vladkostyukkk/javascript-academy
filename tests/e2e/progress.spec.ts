import { expect, test, type Page } from "@playwright/test";
import { openWorkspace, writeCode, checkCode } from "./helpers/workspace";

const solution = 'const appName = "FocusBoard"; console.log(appName);';
test("stale tab cannot overwrite newer saved code", async ({
  page,
  context,
}) => {
  await openWorkspace(page);
  await writeCode(page, solution);
  await saved(page, solution);
  const second = await context.newPage();
  await second.goto("/learn/javascript/js-01");
  await expect(second.locator(".monaco-editor")).toBeVisible();
  const newer = solution + " // newer tab";
  await writeCode(second, newer);
  await saved(second, newer);
  await writeCode(page, solution + " // stale tab");
  await expect(
    page
      .getByText(
        "Чернетку вже змінила інша вкладка. Поточний код не перезаписано.",
      )
      .first(),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Завершити урок і зберегти checkpoint" }),
  ).toHaveCount(0);
  expect(JSON.stringify(await record(second, "drafts", "js-01"))).toContain(
    JSON.stringify(newer),
  );
});
async function record(page: Page, store: string, key: string) {
  return page.evaluate(
    async ({ store, key }) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open("javascript-academy");
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      try {
        return await new Promise<unknown>((resolve, reject) => {
          const request = db.transaction(store).objectStore(store).get(key);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
      } finally {
        db.close();
      }
    },
    { store, key },
  );
}
async function saved(page: Page, code: string) {
  await expect
    .poll(async () => JSON.stringify(await record(page, "drafts", "js-01")))
    .toContain(JSON.stringify(code));
}

test("autosave and quiz survive reload; completion and fork preserve checkpoint", async ({
  page,
}) => {
  await openWorkspace(page);
  await checkCode(page);
  await expect(
    page.locator('[data-check-id][data-passed="false"]:visible'),
  ).toHaveCount(2);
  await writeCode(page, solution);
  await saved(page, solution);
  await expect(
    page.getByRole("button", { name: "Завершити урок і зберегти checkpoint" }),
  ).toHaveCount(0);
  await page.reload();
  await expect(page.locator(".monaco-editor")).toBeVisible();
  await checkCode(page);
  const complete = page.getByRole("button", {
    name: "Завершити урок і зберегти checkpoint",
  });
  await expect(complete).toBeEnabled();
  await writeCode(page, 'const appName = "wrong";');
  await expect(complete).toHaveCount(0);
  await writeCode(page, solution);
  await checkCode(page);
  await expect(complete).toBeEnabled();
  await complete.click();
  await expect(
    page.getByRole("heading", { name: "Урок завершено", exact: true }),
  ).toBeVisible();
  const checkpoint = await record(page, "checkpoints", "js-01@1");
  expect(JSON.stringify(checkpoint)).toContain(JSON.stringify(solution));
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Урок завершено", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Відкрити повторення в копії" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Повторна практика — окрема копія" }),
  ).toBeVisible();
  const { passTheory } = await import("./helpers/theory");
  await passTheory(page);
  await page.getByRole("button", { name: "Перейти до практики" }).click();
  await expect(page.locator(".monaco-editor")).toBeVisible();
  await writeCode(page, 'const appName = "fork";');
  await expect
    .poll(async () => JSON.stringify(await record(page, "forks", "js-01@1")))
    .toContain("fork");
  expect(await record(page, "checkpoints", "js-01@1")).toEqual(checkpoint);
});

test("incompatible draft requires explicit recovery and archives original", async ({
  page,
}) => {
  await openWorkspace(page);
  await writeCode(page, solution);
  await saved(page, solution);
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve) => {
      const request = indexedDB.open("javascript-academy");
      request.onsuccess = () => resolve(request.result);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("drafts", "readwrite");
      const store = tx.objectStore("drafts");
      const request = store.get("js-01");
      request.onsuccess = () =>
        store.put({ ...request.result, courseContentVersion: 99 }, "js-01");
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error);
    });
    db.close();
  });
  await page.reload();
  await expect(page.locator(".monaco-editor")).toHaveCount(0);
  expect(JSON.stringify(await record(page, "drafts", "js-01"))).toContain(
    '"courseContentVersion":99',
  );
  await page
    .getByRole("button", { name: "Відновити з початкових файлів" })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  expect(JSON.stringify(await record(page, "drafts", "js-01"))).toContain(
    '"courseContentVersion":99',
  );
  await page
    .getByRole("button", { name: "Відновити з початкових файлів" })
    .click();
  await page
    .getByRole("button", { name: "Зберегти копію та відновити" })
    .click();
  await expect(page.locator(".monaco-editor")).toBeVisible();
  await page.getByRole("button", { name: "Показати резервні копії" }).click();
  await expect(
    page.getByText(
      "Інша версія матеріалів: автоматичне перенесення файлів недоступне.",
    ),
  ).toBeVisible();
  expect(JSON.stringify(await record(page, "drafts", "js-01"))).toContain(
    '"courseContentVersion":1',
  );
});
