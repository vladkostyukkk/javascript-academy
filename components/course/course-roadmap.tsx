"use client";

import Link from "next/link";
import {
  ChevronDown,
  ArrowUpRight,
  LockKeyhole,
  Search,
  X,
  CheckCircle2,
} from "lucide-react";
import { useState } from "react";
import { courseModules, formatNumber, lessons } from "@/lib/lessons/catalog";
import { Button } from "@/components/ui/button";
import { canReadTheory } from "@/lib/lessons/registry";
import {
  useCourseCompletion,
  type AvailableVersion,
} from "./use-course-completion";

export function CourseRoadmap({
  availableVersions,
}: {
  availableVersions: AvailableVersion[];
}) {
  const progress = useCourseCompletion(availableVersions);
  const accessible = canReadTheory;
  const [query, setQuery] = useState("");
  const normalized = query.trim().toLocaleLowerCase("uk");
  const matchingModules = courseModules
    .map((module) => ({
      ...module,
      lessons: module.lessons.filter((lesson) =>
        `${lesson.title} ${lesson.practiceGoal} ${lesson.id} ${lesson.moduleTitle} ${formatNumber(lesson.number)}`
          .toLocaleLowerCase("uk")
          .includes(normalized),
      ),
    }))
    .filter((module) => module.lessons.length > 0);
  const count = matchingModules.reduce(
    (total, module) => total + module.lessons.length,
    0,
  );

  return (
    <>
      <div className="workspace-status" aria-label="Локальний прогрес курсу">
        <p role="status">
          {progress.error ??
            (progress.completed === null
              ? "Завантажуємо локальний прогрес…"
              : `Завершено уроків поточної версії: ${progress.completed.size} із ${lessons.length}. Прогрес збережено в цьому браузері.`)}
        </p>
        {progress.error && (
          <Button variant="outline" onClick={progress.retry}>
            Повторити завантаження прогресу
          </Button>
        )}
      </div>
      <div className="roadmap-toolbar">
        <div className="module-jumps" aria-label="Перейти до модуля">
          {matchingModules.map((module) => (
            <a
              key={module.number}
              href={`#module-${module.number}`}
              className="module-jump"
              aria-label={`Модуль ${module.number}: ${module.title}`}
            >
              {formatNumber(module.number)}
            </a>
          ))}
        </div>
        <div className="search-field">
          <Search size={17} aria-hidden="true" />
          <label className="sr-only" htmlFor="lesson-search">
            Пошук уроків
          </label>
          <input
            id="lesson-search"
            type="search"
            placeholder="Знайти тему або урок…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {query && (
            <button aria-label="Очистити пошук" onClick={() => setQuery("")}>
              <X size={16} />
            </button>
          )}
        </div>
      </div>
      <p className="search-count" role="status">
        {normalized
          ? `Знайдено уроків: ${count} із ${lessons.length}`
          : `${lessons.length} уроків · розгорни модуль, щоб переглянути теми`}
      </p>
      {count === 0 ? (
        <div className="empty-state">
          <Search size={30} aria-hidden="true" />
          <h2>Такої теми поки не знайшли</h2>
          <p>Спробуй «масиви», «DOM» або номер уроку.</p>
          <Button variant="outline" onClick={() => setQuery("")}>
            Показати всі уроки
          </Button>
        </div>
      ) : (
        <div className="roadmap-modules">
          {matchingModules.map((module) => (
            <details
              key={`${module.number}-${normalized ? "search" : "all"}`}
              id={`module-${module.number}`}
              className="module-details"
              open={normalized ? true : module.number === 1}
            >
              <summary>
                <span className="module-index">
                  {formatNumber(module.number)}
                </span>
                <span className="module-summary">
                  <span className="module-summary-title">{module.title}</span>
                  <span className="module-description">
                    {module.description}
                  </span>
                </span>
                <span className="module-range">
                  {formatNumber(module.lessons[0].number)}—
                  {formatNumber(
                    module.lessons[module.lessons.length - 1].number,
                  )}
                </span>
                <ChevronDown
                  className="disclosure-icon"
                  size={20}
                  aria-hidden="true"
                />
              </summary>
              <ol className="lesson-list">
                {module.lessons.map((lesson) => (
                  <li key={lesson.id} data-lesson-id={lesson.id}>
                    <Link
                      href={`/learn/javascript/${lesson.id}`}
                      aria-label={`${formatNumber(lesson.number)}. ${lesson.title}. ${accessible(lesson) ? (progress.completed?.has(lesson.id) ? "Завершено" : "Теорія доступна") : "Заблоковано"}`}
                      className={`lesson-row ${accessible(lesson) ? "demo-row" : ""}`}
                    >
                      <span className="lesson-number">
                        {formatNumber(lesson.number)}
                      </span>
                      <span className="lesson-row-text">
                        <span className="lesson-title">{lesson.title}</span>
                        <span className="lesson-goal">
                          {lesson.practiceGoal}
                        </span>
                      </span>
                      <span className="lesson-availability">
                        {accessible(lesson) ? (
                          <>
                            <span>
                              {progress.completed?.has(lesson.id)
                                ? "Завершено"
                                : "Теорія доступна"}
                            </span>
                            {progress.completed?.has(lesson.id) ? (
                              <CheckCircle2 size={17} aria-hidden="true" />
                            ) : (
                              <ArrowUpRight size={17} aria-hidden="true" />
                            )}
                          </>
                        ) : (
                          <>
                            <span>Заблоковано</span>
                            <LockKeyhole size={15} />
                          </>
                        )}
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            </details>
          ))}
        </div>
      )}
    </>
  );
}
