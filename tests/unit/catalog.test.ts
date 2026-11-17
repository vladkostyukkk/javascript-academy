import { describe, expect, it } from "vitest";
import { courseModules, findLesson, lessons } from "@/lib/lessons/catalog";

describe("P01 manifest presentation", () => {
  it("preserves all 60 ordered IDs and their prerequisite chain", () => {
    expect(lessons).toHaveLength(60);
    expect(new Set(lessons.map(({ id }) => id)).size).toBe(60);
    lessons.forEach((lesson, index) => {
      expect(lesson.id).toBe(`js-${String(index + 1).padStart(2, "0")}`);
      expect(lesson.number).toBe(index + 1);
      expect(lesson.prerequisites).toEqual(
        index === 0 ? [] : [lessons[index - 1].id],
      );
      expect(lesson.status).toBe("planned");
    });
  });

  it("groups six modules without losing or duplicating lessons", () => {
    expect(courseModules).toHaveLength(6);
    expect(courseModules.flatMap((module) => module.lessons)).toEqual(lessons);
    courseModules.forEach((module) => {
      expect(module.lessons).toHaveLength(10);
      expect(
        module.lessons.every((lesson) => lesson.module === module.number),
      ).toBe(true);
    });
  });

  it("finds boundary lessons and rejects unknown or malformed IDs", () => {
    expect(findLesson("js-01")?.number).toBe(1);
    expect(findLesson("js-60")?.number).toBe(60);
    for (const id of ["", "js-00", "js-61", "js-1", "JS-01", "../js-01"]) {
      expect(findLesson(id)).toBeUndefined();
    }
  });
});
