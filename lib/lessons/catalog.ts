import { lessonRegistry } from "./registry";

// Keep the P01 presentation API; the data now comes from the validated registry.
export const lessons = lessonRegistry.lessons;
export type LessonSummary = (typeof lessons)[number];

const descriptions = [
  "Перші рядки коду, змінні та дані. Закладаємо основу FocusBoard.",
  "Навчіть програму ухвалювати рішення та перевикористовувати логіку.",
  "Перетворіть окремі задачі на колекцію, з якою зручно працювати.",
  "Оживіть інтерфейс: картки, форми, пошук і власна Kanban-дошка.",
  "Організуйте код, зберігайте задачі та додайте історію змін.",
  "Завантаження даних, зручна взаємодія та ваш перший готовий застосунок.",
];

export const courseModules = Array.from({ length: 6 }, (_, index) => {
  const moduleLessons = lessons.filter((lesson) => lesson.module === index + 1);
  return {
    number: index + 1,
    title: moduleLessons[0].moduleTitle,
    description: descriptions[index],
    lessons: moduleLessons,
  };
});

export function findLesson(id: string) {
  return lessons.find((lesson) => lesson.id === id);
}

export function formatNumber(number: number) {
  return String(number).padStart(2, "0");
}
