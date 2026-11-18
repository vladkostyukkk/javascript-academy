import type { Metadata } from "next";
import { Route } from "lucide-react";
import { CourseRoadmap } from "@/components/course/course-roadmap";
import { lessons } from "@/lib/lessons/catalog";
import { canReadTheory } from "@/lib/lessons/registry";
import { loadLesson } from "@/lib/lessons/loader";

export const metadata: Metadata = { title: "Програма курсу" };

export default async function CoursePage() {
  const availableVersions = await Promise.all(
    lessons.filter(canReadTheory).map(async (lesson) => {
      const content = await loadLesson(lesson.id);
      return {
        lessonId: content.meta.id,
        courseContentVersion: content.meta.courseContentVersion,
      };
    }),
  );
  return (
    <div className="page-content">
      <div className="page-heading">
        <span className="eyebrow">ВІД ОСНОВ ДО РЕЛІЗУ</span>
        <h1>
          Твій маршрут у JavaScript<span className="text-accent">.</span>
        </h1>
        <p>60 невеликих кроків, які складаються в один великий результат.</p>
      </div>
      <div className="info-banner">
        <Route size={21} aria-hidden="true" />
        <p>
          <strong>Один курс — один FocusBoard.</strong> Кожен урок продовжує
          попередній. Готові уроки відкриваються послідовно після збереження
          завершення. Збережені версії дивись у розділі «Мій FocusBoard»;
          матеріали наступних уроків ще готуються.
        </p>
      </div>
      <CourseRoadmap availableVersions={availableVersions} />
    </div>
  );
}
