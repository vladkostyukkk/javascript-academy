import { expect, test } from "@playwright/test";
import { readLessonBundle } from "../../lib/lessons/content-files";
import { passTheory } from "./helpers/theory";
import { openWorkspace, writeCode, checkCode } from "./helpers/workspace";

test("all authored negative cases fail the intended real workspace checks", async ({
  page,
}) => {
  const bundle = await readLessonBundle("js-01");
  await openWorkspace(page);
  for (const scenario of bundle.negativeCases) {
    await writeCode(page, scenario.source || "// Порожня реалізація");
    await checkCode(page);
    const failures = await page
      .locator('[data-check-id][data-passed="false"]:visible')
      .evaluateAll((nodes) =>
        nodes.map((node) => node.getAttribute("data-check-id")).sort(),
      );
    expect(failures, scenario.id).toEqual([...scenario.failedCheckIds].sort());
  }
});
test("failed editor load offers editing and retry without losing draft", async ({
  page,
}) => {
  await page.route("**/monaco/editor.js", (route) => route.abort());
  await page.goto("/learn/javascript/js-01");
  await passTheory(page);
  await page.getByRole("button", { name: "Перейти до практики" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Monaco" }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Код src/app.js", exact: true })
    .fill('const appName = "FocusBoard"; console.log(appName);');
  await page.unroute("**/monaco/editor.js");
  await page
    .getByRole("button", { name: "Повторити завантаження редактора" })
    .click();
  await expect(page.locator(".monaco-editor")).toBeVisible();
  await checkCode(page);
  await expect(
    page.locator('[data-check-id][data-passed="true"]:visible'),
  ).toHaveCount(2);
});

test("editing during a pending check cancels its result; shortcuts execute current code", async ({
  page,
}) => {
  await openWorkspace(page);
  await writeCode(page, 'const appName = "FocusBoard"; console.log(appName);');
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let requested = false;
  let markHandled: () => void = () => {};
  const handled = new Promise<void>((resolve) => {
    markHandled = resolve;
  });
  await page.route("**/runner/runtime.js", async (route) => {
    requested = true;
    await gate;
    await route.continue();
    markHandled();
  });
  await page.getByRole("button", { name: "Перевірити", exact: true }).click();
  await expect.poll(() => requested).toBe(true);
  await writeCode(page, 'const appName = "wrong"; console.log(appName);');
  release();
  await handled;
  await page.unroute("**/runner/runtime.js");
  await expect(page.getByRole("status")).toContainText("Код змінено");
  await expect(page.locator("[data-check-id]:visible")).toHaveCount(0);
  await page.keyboard.press("ControlOrMeta+Shift+Enter");
  await expect(
    page.locator('[data-check-id][data-passed="false"]:visible'),
  ).toHaveCount(2);
  await page.getByRole("textbox", { name: /Код src\/app.js/ }).focus();
  await page.keyboard.press("ControlOrMeta+Enter");
  await expect(page.getByRole("status")).toContainText("Код виконано");
  await expect(page.locator("[data-check-id]:visible")).toHaveCount(0);
});
test("dirty navigation can be cancelled and next lesson remains locked", async ({
  page,
}) => {
  await openWorkspace(page);
  await writeCode(page, 'const appName = "FocusBoard"; console.log(appName);');
  page.once("dialog", (dialog) => dialog.dismiss());
  await page
    .getByRole("link", { name: "До програми курсу", exact: true })
    .click();
  await expect(page).toHaveURL(/\/js-01$/);
  await checkCode(page);
  await expect(
    page.locator('[data-check-id][data-passed="true"]:visible'),
  ).toHaveCount(2);
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("link", { name: "До програми курсу", exact: true })
    .click();
  await page.locator('[data-lesson-id="js-02"] a').click();
  await expect(
    page.getByRole("heading", { name: "Цей урок ще заблоковано" }),
  ).toBeVisible();
});
