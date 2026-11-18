import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { passTheory } from "./helpers/theory";

test("home → roadmap → theory → project; no fabricated progress", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "До власного застосунку",
  );
  await page
    .getByRole("main")
    .getByRole("link", { name: "Програма курсу", exact: true })
    .click();
  await expect(page).toHaveURL(/\/course\/javascript$/);
  await expect(page.locator("[data-lesson-id]")).toHaveCount(60);
  await expect(page.locator(".module-details")).toHaveCount(6);
  await page.locator("[data-lesson-id='js-01'] a").click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Перша команда JS",
  );
  await expect(
    page.getByText("Теорія та запитання", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("tab", { name: "Практика", exact: true }),
  ).toBeDisabled();
  await passTheory(page);
  await page.getByRole("button", { name: "Перейти до практики" }).click();
  await expect(
    page.getByRole("heading", { name: "Дай проєкту ім’я" }),
  ).toBeVisible();
  await expect(page.locator("iframe")).toHaveCount(0);
  await page.getByRole("tab", { name: "Перевірка", exact: true }).click();
  await expect(
    page
      .getByRole("tabpanel", { name: "Перевірка", exact: true })
      .getByText(
        "Перевірки ще не виконані для поточного коду. У практиці натисни «Перевірити».",
        { exact: true },
      ),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Завершити|Запустити|Перевірити/ }),
  ).toHaveCount(0);
  await page.goto("/project");
  await expect(
    page.getByText("Збережених версій ще немає.", { exact: false }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /Експорт/ })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("roadmap search, empty state and locked lesson survive reload", async ({
  page,
}) => {
  await page.goto("/course/javascript");
  const search = page.getByRole("searchbox", { name: "Пошук уроків" });
  await search.fill("  PROMISE  ");
  await expect(page.locator("[data-lesson-id]")).toHaveCount(1);
  await expect(page.locator(".module-jump")).toHaveCount(1);
  await expect(page.locator(".module-jump")).toHaveAttribute(
    "href",
    "#module-6",
  );
  await expect(page.locator(".search-count")).toHaveText(
    "Знайдено уроків: 1 із 60",
  );
  await page.locator("[data-lesson-id='js-51'] a").click();
  await expect(
    page.getByRole("heading", { name: "Цей урок ще заблоковано" }),
  ).toBeVisible();
  await expect(page.getByRole("tab")).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Цей урок ще заблоковано" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Повернутися до програми" }).click();
  await search.fill("<script>несуществующаятема</script>");
  await expect(page.locator(".module-jump")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Такої теми поки не знайшли" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Показати всі уроки" }).click();
  await expect(page.locator("[data-lesson-id]")).toHaveCount(60);
  const lastModule = page.locator("#module-6");
  await lastModule.locator("summary").click();
  await expect(page.locator("[data-lesson-id='js-60']")).toBeVisible();
});

test("keyboard skip link and lesson tabs have working focus", async ({
  page,
}) => {
  await page.goto("/learn/javascript/js-01");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Перейти до вмісту" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("main")).toBeFocused();
  await passTheory(page);
  const theory = page.getByRole("tab", { name: "Теорія", exact: true });
  await theory.focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("tab", { name: "Практика", exact: true }),
  ).toBeFocused();
  await expect(
    page.locator('.lesson-panel[data-state="active"]'),
  ).toContainText("Дай проєкту ім’я");
  await page.keyboard.press("End");
  await expect(
    page.getByRole("tab", { name: "Перевірка", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Home");
  await expect(theory).toBeFocused();
});

test("navigation reflects route; mobile disclosure closes on navigation and Escape", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  const menu = page.getByRole("button", { name: "Відкрити меню" });
  if (testInfo.project.name === "mobile") {
    await expect(
      page.getByRole("navigation", { name: "Основна навігація" }),
    ).not.toBeVisible();
    await menu.click();
    await expect(
      page.getByRole("button", { name: "Закрити меню" }),
    ).toHaveAttribute("aria-expanded", "true");
  }
  await page
    .getByRole("navigation", { name: "Основна навігація" })
    .getByRole("link", { name: "Мій FocusBoard" })
    .click();
  await expect(page).toHaveURL(/\/project$/);
  if (testInfo.project.name === "mobile") {
    await expect(menu).toHaveAttribute("aria-expanded", "false");
    await menu.click();
    await page
      .getByRole("navigation", { name: "Основна навігація" })
      .getByRole("link", { name: "Мій FocusBoard" })
      .focus();
    await page.keyboard.press("Escape");
    await expect(menu).toBeFocused();
    await expect(menu).toHaveAttribute("aria-expanded", "false");
  } else {
    await expect(
      page
        .getByRole("navigation", { name: "Основна навігація" })
        .getByRole("link", { name: "Мій FocusBoard" }),
    ).toHaveAttribute("aria-current", "page");
  }
});

test("unknown lesson has a Ukrainian recovery route", async ({ page }) => {
  await page.goto("/learn/javascript/js-99");
  await expect(
    page.getByRole("heading", { name: "Цієї сторінки немає" }),
  ).toBeVisible();
  await page
    .getByRole("main")
    .getByRole("link", { name: "До програми курсу" })
    .click();
  await expect(page).toHaveURL(/\/course\/javascript$/);
});

test("key pages fit viewport and pass automated accessibility checks", async ({
  page,
}, testInfo) => {
  for (const [name, route] of [
    ["home", "/"],
    ["course", "/course/javascript"],
    ["lesson", "/learn/javascript/js-01"],
    ["project", "/project"],
  ]) {
    await page.goto(route);
    await page.evaluate(() => document.fonts.ready);
    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(hasOverflow, `${name} has horizontal page overflow`).toBe(false);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(results.violations, `${name} accessibility`).toEqual([]);
    await page.screenshot({
      path: testInfo.outputPath(`${name}.png`),
      fullPage: true,
    });
  }
});

test("narrow phone remains usable", async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name !== "mobile",
    "Narrow viewport is covered in the mobile project.",
  );
  await page.setViewportSize({ width: 320, height: 740 });
  for (const route of [
    "/",
    "/course/javascript",
    "/learn/javascript/js-01",
    "/project",
  ]) {
    await page.goto(route);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
});
