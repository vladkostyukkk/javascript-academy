import { expect, type Page } from "@playwright/test";
import quiz from "../../../content/lessons/js-01/quiz.json" with { type: "json" };

export async function passTheory(page: Page) {
  for (const question of quiz) {
    const option = question.options.find(
      ({ id }) => id === question.correctOptionId,
    );
    if (!option) throw new Error("Invalid test quiz fixture.");
    await page
      .getByRole("group", { name: question.prompt })
      .getByRole("radio", { name: option.label, exact: true })
      .check();
  }
  await page
    .getByRole("button", { name: "Перевірити відповіді", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Перейти до практики" }),
  ).toBeVisible();
}
