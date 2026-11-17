import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

for (const [id, failure] of [
  ["pure", "Перевірку не пройдено"],
  ["dom", "Перевірку не пройдено"],
  ["modules", "Помилка виконання"],
  ["async", "Помилка виконання"],
]) {
  test(`runner ${id}: positive and negative behavior`, async ({ page }) => {
    await page.goto("/lab/runner");
    await page.getByLabel("Сценарій", { exact: true }).selectOption(id);
    await page.getByRole("button", { name: "Запустити сценарій" }).click();
    await expect(page.getByRole("status")).toHaveText("Перевірку пройдено");
    await expect(page.locator("iframe")).toHaveAttribute(
      "sandbox",
      "allow-scripts",
    );
    if (id === "dom" || id === "async")
      await expect(page.frameLocator("iframe").locator("#output")).toHaveText(
        "Задач: 2",
      );
    await page.getByLabel("Негативний сценарій").check();
    await expect(page.locator("iframe")).toHaveCount(0);
    await page.getByRole("button", { name: "Запустити сценарій" }).click();
    await expect(page.getByRole("status")).toHaveText(failure);
    await expect(page.locator(".runner-output")).not.toBeEmpty();
  });
}
test("runner remains accessible, responsive and disposes on stop/navigation", async ({
  page,
}, testInfo) => {
  await page.goto("/lab/runner");
  await page.getByLabel("Сценарій", { exact: true }).selectOption("dom");
  await page.getByRole("button", { name: "Запустити сценарій" }).click();
  await expect(page.getByRole("status")).toHaveText("Перевірку пройдено");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const audit = await new AxeBuilder({ page })
    .exclude("iframe")
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(audit.violations).toEqual([]);
  await page.screenshot({
    path: testInfo.outputPath("runner.png"),
    fullPage: true,
    scale: "css",
  });
  await page.getByRole("button", { name: "Зупинити", exact: true }).click();
  await expect(page.locator("iframe")).toHaveCount(0);
  await page.getByRole("button", { name: "Запустити сценарій" }).click();
  await expect(page.getByRole("status")).toHaveText("Перевірку пройдено");
  await page
    .getByRole("link", { name: "JavaScript Academy — головна" })
    .click();
  await expect(page.locator("iframe")).toHaveCount(0);
});
