import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { openWorkspace, writeCode, checkCode } from "./helpers/workspace";

test("starter fails; edited code runs and passes; changes revoke results", async ({
  page,
}, testInfo) => {
  const external: string[] = [];
  page.on("request", (request) => {
    if (
      !request.url().startsWith("http://127.0.0.1:3100") &&
      /^https?:/.test(request.url())
    )
      external.push(request.url());
  });
  await openWorkspace(page);
  await checkCode(page);
  await expect(
    page.locator('[data-check-id][data-passed="false"]:visible'),
  ).toHaveCount(2);
  await writeCode(page, 'const appName = "FocusBoard";\nconsole.log(appName);');
  await page.getByRole("button", { name: "Запустити", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Код виконано");
  await expect(
    page.getByRole("region", { name: "Консоль виконання" }),
  ).toContainText("FocusBoard");
  await expect(page.locator("[data-check-id]:visible")).toHaveCount(0);
  await expect(
    page
      .frameLocator("iframe")
      .getByRole("heading", { name: "FocusBoard", exact: true }),
  ).toBeVisible();
  await checkCode(page);
  await expect(
    page.locator('[data-check-id][data-passed="true"]:visible'),
  ).toHaveCount(2);
  await expect(page.getByRole("status")).toContainText(
    "Результат ще не збережено",
  );
  expect(external).toEqual([]);
  const audit = await new AxeBuilder({ page })
    .exclude("iframe")
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(audit.violations).toEqual([]);
  await page.locator(".workspace-code-grid").scrollIntoViewIfNeeded();
  await page.screenshot({
    path: testInfo.outputPath("workspace.png"),
    fullPage: true,
    scale: "css",
  });
  await writeCode(page, 'const appName = "wrong"; console.log(appName);');
  await expect(page.locator("[data-check-id]:visible")).toHaveCount(0);
  await expect(page.getByRole("status")).toContainText("Код змінено");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("draft survives file/theory/results switches; reset asks and restores focus", async ({
  page,
}) => {
  await openWorkspace(page);
  await writeCode(page, 'const appName = "FocusBoard"; console.log(appName);');
  await page.getByRole("tab", { name: "index.html", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: /Код index.html/ }),
  ).toHaveAccessibleName("Код index.html — лише читання");
  await page.getByRole("textbox", { name: /Код index.html/ }).focus();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.insertText("tampered");
  await page.getByRole("tab", { name: "src/app.js", exact: true }).click();
  await page.getByRole("tab", { name: "Теорія", exact: true }).click();
  await page.getByRole("tab", { name: "Практика", exact: true }).click();
  await checkCode(page);
  await expect(
    page.locator('[data-check-id][data-passed="true"]:visible'),
  ).toHaveCount(2);
  await page.getByRole("tab", { name: "Перевірка", exact: true }).click();
  await expect(
    page.locator('[data-check-id][data-passed="true"]:visible'),
  ).toHaveCount(2);
  await page.getByRole("button", { name: "Повернутися до коду" }).click();
  await page.getByRole("button", { name: "Скинути код" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Скинути код" })).toBeFocused();
  await checkCode(page);
  await expect(
    page.locator('[data-check-id][data-passed="true"]:visible'),
  ).toHaveCount(2);
  await page.getByRole("button", { name: "Скинути код" }).click();
  await page
    .getByRole("button", { name: "Відновити початковий код", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await checkCode(page);
  await expect(
    page.locator('[data-check-id][data-passed="false"]:visible'),
  ).toHaveCount(2);
});

test("syntax errors, infinite loops and restart have real feedback", async ({
  page,
}) => {
  await openWorkspace(page);
  await writeCode(page, "const appName = ;");
  await expect(
    page.getByRole("list", { name: "Підказки синтаксису" }),
  ).toBeVisible({ timeout: 10000 });
  await page.getByRole("tab", { name: "index.html", exact: true }).click();
  await expect(
    page.getByRole("list", { name: "Підказки синтаксису" }),
  ).toHaveCount(0);
  await page.getByRole("tab", { name: "src/app.js", exact: true }).click();
  await expect(
    page.getByRole("list", { name: "Підказки синтаксису" }),
  ).toBeVisible();
  await checkCode(page);
  await expect(page.getByRole("status")).toContainText("Помилка JavaScript");
  await expect(
    page.getByRole("region", { name: "Консоль виконання" }),
  ).toContainText(/Unexpected|Syntax|token/i);
  await writeCode(page, "while (true) {}");
  await page.getByRole("button", { name: "Запустити", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(
    "Час виконання вичерпано",
  );
  await expect(page.locator("iframe")).toHaveCount(0);
  await writeCode(page, 'const appName = "FocusBoard"; console.log(appName);');
  await checkCode(page);
  await expect(
    page.locator('[data-check-id][data-passed="true"]:visible'),
  ).toHaveCount(2);
});
