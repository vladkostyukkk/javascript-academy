import manifestInput from "@/curriculum/manifest.json" with { type: "json" };
import contentIndexInput from "@/content/lessons/index.json" with { type: "json" };
import {
  contentIndexSchema,
  manifestSchema,
  type ManifestLesson,
} from "./schema";

export function createLessonRegistry(
  manifestData: unknown,
  contentIndexData: unknown,
) {
  const manifest = manifestSchema.parse(manifestData);
  const contentIds = contentIndexSchema.parse(contentIndexData);
  for (const lesson of manifest.lessons) {
    if (lesson.status === "published" && !contentIds.includes(lesson.id))
      throw new Error(`${lesson.id}: опублікований урок не має матеріалів.`);
  }
  return {
    version: manifest.version,
    lessons: manifest.lessons.map((lesson) => ({
      ...lesson,
      contentAvailable: contentIds.includes(lesson.id),
    })),
  };
}

export const lessonRegistry = createLessonRegistry(
  manifestInput,
  contentIndexInput,
);
export type RegisteredLesson = ManifestLesson & { contentAvailable: boolean };

// Content readiness is not learner completion. No later lesson unlocks before P05.
export function canReadTheory(lesson: RegisteredLesson) {
  return lesson.number === 1 && lesson.contentAvailable;
}
