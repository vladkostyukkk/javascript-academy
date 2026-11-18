"use client";
import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { FileMap, LessonId } from "@/lib/lessons/schema";
import { readCompletion } from "@/lib/progress/checkpoint-store";
import { initializeNextDraft } from "@/lib/progress/next-draft";

export function LessonEntry({
  meta,
  starter,
  children,
}: {
  meta: {
    id: LessonId;
    number: number;
    prerequisites: LessonId[];
    courseContentVersion: number;
  };
  starter: FileMap;
  children: ReactNode;
}) {
  const [phase, setPhase] = useState<"loading" | "locked" | "ready" | "error">(
    "loading",
  );
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [official, setOfficial] = useState(false);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const previous = meta.prerequisites[0];
        if (
          previous &&
          !(await readCompletion(previous, meta.courseContentVersion))
        ) {
          if (!cancelled) setPhase("locked");
          return;
        }
        if (previous)
          await initializeNextDraft(
            meta,
            starter,
            meta.courseContentVersion,
            official,
          );
        if (!cancelled) setPhase("ready");
      } catch (reason) {
        if (!cancelled) {
          setPhase("error");
          setError(
            reason instanceof Error
              ? reason.message
              : "Не вдалося прочитати збережений прогрес.",
          );
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [meta, starter, attempt, official]);
  if (phase === "ready") return children;
  return (
    <section className="workspace-status" aria-label="Доступ до уроку">
      <p role="status">
        {phase === "loading"
          ? "Готуємо проєкт зі збереженого checkpoint…"
          : phase === "locked"
            ? "Спочатку заверши попередній урок, щоб продовжити свій FocusBoard."
            : error}
      </p>
      {meta.prerequisites[0] && (
        <Button asChild variant="outline">
          <Link href={`/learn/javascript/${meta.prerequisites[0]}`}>
            До попереднього уроку
          </Link>
        </Button>
      )}
      {phase !== "loading" && (
        <Button
          variant="outline"
          onClick={() => {
            setPhase("loading");
            setAttempt((value) => value + 1);
          }}
        >
          Повторити перевірку доступу
        </Button>
      )}
      {phase === "error" && (
        <Button
          variant="outline"
          onClick={() => {
            if (
              !window.confirm(
                "Почати нову чернетку з офіційної основи? Попередній checkpoint і наявна чернетка залишаться без змін. Потрібне завершення попереднього уроку.",
              )
            )
              return;
            setOfficial(true);
            setPhase("loading");
            setAttempt((value) => value + 1);
          }}
        >
          Використати офіційну основу
        </Button>
      )}
    </section>
  );
}
