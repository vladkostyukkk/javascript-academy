import { expect, type Page } from "@playwright/test";
import { passTheory } from "./theory";
export async function openWorkspace(page: Page) {
  await page.goto("/learn/javascript/js-01");
  await passTheory(page);
  await page.getByRole("button", { name: "Перейти до практики" }).click();
  await expect(page.locator(".monaco-editor")).toBeVisible({ timeout: 15000 });
}
export async function writeCode(page: Page, source: string) {
  const editor = page.getByRole("textbox", { name: /Код src\/app.js/ });
  await editor.focus();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.insertText(source);
}
export async function checkCode(page: Page) {
  await page.getByRole("button", { name: "Перевірити", exact: true }).click();
  await expect(
    page.locator('.lesson-panel[data-state="active"] [data-check-id]'),
  ).toHaveCount(2);
}
