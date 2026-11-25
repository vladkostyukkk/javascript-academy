import { expect, test } from "@playwright/test";
import { passTheory } from "./helpers/theory";

test("hosted lessons and laboratory keep execution unavailable", async ({
  page,
  baseURL,
}) => {
  const origin = "https://academy.test";
  const runtimeRequests: string[] = [];
  await page.route(`${origin}/**`, async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/runner/runtime.js")
      runtimeRequests.push(url.pathname);
    await route.fulfill({
      response: await route.fetch({
        url: new URL(url.pathname + url.search, baseURL).href,
      }),
    });
  });
  await page.goto(origin + "/learn/javascript/js-01");
  await passTheory(page);
  await page.getByRole("button", { name: "Перейти до практики" }).click();
  await expect(
    page.getByRole("button", { name: "Запустити", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Перевірити", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByText(
      "Запуск і перевірка коду доступні в локальній копії Академії.",
      { exact: true },
    ),
  ).toBeVisible();
  await page.goto(origin + "/lab/runner");
  await expect(
    page.getByRole("button", { name: "Запустити сценарій" }),
  ).toBeDisabled();
  await expect(page.locator("iframe")).toHaveCount(0);
  expect(runtimeRequests).toEqual([]);
});
