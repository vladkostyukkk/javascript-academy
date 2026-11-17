import { readValidatedCourseContent } from "../lib/lessons/content-files";
import { lessonRegistry } from "../lib/lessons/registry";

try {
  const bundles = await readValidatedCourseContent();
  console.log(
    `Перевірено ${lessonRegistry.lessons.length} ID; повних пакетів матеріалів: ${bundles.length}.`,
  );
  console.log(
    "Структура, Markdown, quiz, файли та SHA-256 checkpoint: коректні. Виконання еталона перевіряється окремо в Playwright sandbox.",
  );
} catch (error) {
  console.error(
    "Валідація матеріалів не пройшла:",
    error instanceof Error ? error.message : String(error),
  );
  process.exitCode = 1;
}
