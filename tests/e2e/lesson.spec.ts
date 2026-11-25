import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { passTheory } from "./helpers/theory";

test("quiz gives feedback, requires explicit transition and revokes access after editing", async ({
  page,
}, testInfo) => {
  await page.goto("/learn/javascript/js-01?tab=practice#practice");
  const practice = page.getByRole("tab", { name: "Практика", exact: true });
  await expect(practice).toBeDisabled();
  await expect(
    page.getByRole("tab", { name: "Теорія", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page.getByRole("button", { name: "Перевірити відповіді" }).click();
  await expect(
    page.getByText("Обери одну відповідь, щоб перевірити розуміння.", {
      exact: false,
    }),
  ).toHaveCount(3);
  await expect(
    page
      .getByRole("tabpanel", { name: "Теорія", exact: true })
      .getByRole("status"),
  ).toContainText("Поки не всі відповіді правильні");
  await expect(practice).toBeDisabled();
  await page
    .getByRole("radio", { name: "У заголовку сторінки", exact: true })
    .check();
  await page.getByRole("button", { name: "Перевірити відповіді" }).click();
  await expect(page.locator("#console-output-feedback")).toContainText(
    "console.log не змінює HTML",
  );
  await passTheory(page);
  await expect(
    page
      .getByRole("tabpanel", { name: "Теорія", exact: true })
      .getByRole("status"),
  ).toContainText("Це ще не завершення уроку");
  await expect(
    page.getByRole("tab", { name: "Теорія", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page.getByRole("button", { name: "Перейти до практики" }).click();
  await expect(
    page.locator('.lesson-panel[data-state="active"]'),
  ).toBeFocused();
  await expect(
    page.getByRole("heading", { name: "Дай проєкту ім’я" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Файли FocusBoard" }),
  ).toBeVisible();
  for (let number = 1; number <= 3; number++)
    await page
      .getByRole("button", { name: `Показати підказку ${number} з 3` })
      .click();
  await expect(page.getByText("Усі три підказки відкрито.")).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Показати підказку/ }),
  ).toHaveCount(0);
  await expect(page.locator("iframe")).toHaveCount(0);
  await expect(page.locator(".monaco-editor")).toBeVisible();
  const audit = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(audit.violations).toEqual([]);
  await page.screenshot({
    path: testInfo.outputPath("practice.png"),
    fullPage: true,
  });
  await page.getByRole("tab", { name: "Теорія", exact: true }).click();
  await expect(
    page.getByRole("radio", { name: "У консолі браузера", exact: true }),
  ).toBeChecked();
  await page
    .getByRole("radio", { name: "У заголовку сторінки", exact: true })
    .check();
  await expect(practice).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Перейти до практики" }),
  ).toHaveCount(0);
});

test("reload preserves saved quiz; direct links retain the new lesson quiz gate", async ({
  page,
}) => {
  await page.goto("/learn/javascript/js-01");
  await passTheory(page);
  await expect(
    page.getByText(
      "Навчальний стан готовий. Нові відповіді й переходи зберігаються автоматично.",
      { exact: true },
    ),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("tab", { name: "Практика", exact: true }),
  ).toBeEnabled();
  await expect(page.locator('input[type="radio"]:checked')).toHaveCount(3);
  await page.getByRole("button", { name: "Перейти до практики" }).click();
  await page.goto("/learn/javascript/js-02?completed=js-01");
  await expect(
    page.getByRole("tab", { name: "Теорія", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("tab", { name: "Практика", exact: true }),
  ).toBeDisabled();
});

test("quiz is keyboard reachable and reference source is not shipped in the page", async ({
  page,
}) => {
  await page.goto("/learn/javascript/js-01");
  const theory = page.getByRole("tab", { name: "Теорія", exact: true });
  await expect(theory).toBeEnabled();
  await theory.focus();
  await page.keyboard.press("ArrowRight");
  await expect(theory).toBeFocused();
  const radio = page.getByRole("radio", {
    name: "У консолі браузера",
    exact: true,
  });
  await expect(radio).toBeEnabled();
  await radio.focus();
  await expect(radio).toBeFocused();
  await page.keyboard.press("Space");
  await expect(radio).toBeChecked();
  await expect(radio).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(
    page.getByRole("radio", { name: "У заголовку сторінки", exact: true }),
  ).toBeChecked();
  const html = await page.content();
  expect(html).not.toContain("fileHashes");
  // Public check metadata is inspectable; the reference files remain server-only.
  expect(html).not.toContain("negative-cases.json");
  expect(await page.locator("body").textContent()).not.toContain(
    'const appName = "FocusBoard";',
  );
});
