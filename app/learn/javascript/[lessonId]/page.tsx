import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, LockKeyhole } from "lucide-react";
import { findLesson, formatNumber, lessons } from "@/lib/lessons/catalog";
import { LessonExperience } from "@/components/course/lesson-experience";
import { TheoryMarkdown } from "@/components/course/theory-markdown";
import { loadLesson } from "@/lib/lessons/loader";
import { canReadTheory } from "@/lib/lessons/registry";
import { Button } from "@/components/ui/button";

type Props = { params: Promise<{ lessonId: string }> };

export function generateStaticParams() {
  return lessons.map(({ id }) => ({ lessonId: id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lesson = findLesson((await params).lessonId);
  return {
    title: lesson
      ? `Урок ${formatNumber(lesson.number)} · ${lesson.title}`
      : "Урок не знайдено",
  };
}

export default async function LessonPage({ params }: Props) {
  const lesson = findLesson((await params).lessonId);
  if (!lesson) notFound();
  const previous = findLesson(lesson.prerequisites[0]);
  const content = canReadTheory(lesson) ? await loadLesson(lesson.id) : null;
  return (
    <div className="page-content lesson-page">
      <Link href="/course/javascript" className="back-link">
        <ArrowLeft size={16} />
        До програми курсу
      </Link>
      <div className="lesson-heading">
        <div>
          <span className="eyebrow">
            МОДУЛЬ {formatNumber(lesson.module)} ·{" "}
            {lesson.moduleTitle.toLocaleUpperCase("uk")}
          </span>
          <h1>
            <span className="heading-number">
              {formatNumber(lesson.number)}.
            </span>{" "}
            {lesson.title}
          </h1>
          <p>{lesson.practiceGoal}</p>
        </div>
        <span className="small-tag">
          {content ? "Теорія та запитання" : "Запланований урок"}
        </span>
      </div>
      {content ? (
        <>
          <div className="demo-banner">
            <span className="demo-dot" />
            <p>
              <strong>Почни з теорії.</strong> Пройди перевірку розуміння, щоб
              відкрити редактор, запустити код і перевірити рішення.
            </p>
          </div>
          <LessonExperience
            key={`${content.meta.id}-${content.meta.courseContentVersion}`}
            lessonId={content.meta.id}
            courseContentVersion={content.meta.courseContentVersion}
            quiz={content.quiz}
            hints={content.hints}
            objectives={content.meta.objectives}
            durationMinutes={content.meta.durationMinutes}
            theory={<TheoryMarkdown source={content.theory} />}
            challenge={<TheoryMarkdown source={content.challenge} />}
            starter={content.starter}
            editablePaths={content.meta.editablePaths}
            checks={content.checks}
          />
        </>
      ) : (
        <div className="empty-state locked-state">
          <LockKeyhole size={32} aria-hidden="true" />
          <h2>Цей урок ще заблоковано</h2>
          <p>
            Навчальні матеріали готуються. У повному курсі цей урок стане
            доступним після завершення попереднього.
          </p>
          {previous && (
            <p className="prerequisite">
              Попередній урок: {formatNumber(previous.number)} ·{" "}
              {previous.title}
            </p>
          )}
          <Button asChild variant="outline">
            <Link href="/course/javascript">
              Повернутися до програми <ArrowLeft />
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
