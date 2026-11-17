"use client";
import { useEffect, useState } from "react";
import type { LessonId } from "@/lib/lessons/schema";
import { readCheckpointHistory } from "@/lib/progress/checkpoint-store";

export type AvailableVersion = {
  lessonId: LessonId;
  courseContentVersion: number;
};
export function useCourseCompletion(availableVersions: AvailableVersion[]) {
  const [completed, setCompleted] = useState<Set<LessonId> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    let sequence = 0;
    function refresh() {
      const current = ++sequence;
      void readCheckpointHistory()
        .then((records) => {
          if (cancelled || current !== sequence) return;
          setCompleted(
            new Set(
              records
                .filter((record) =>
                  availableVersions.some(
                    (version) =>
                      version.lessonId === record.lessonId &&
                      version.courseContentVersion ===
                        record.courseContentVersion,
                  ),
                )
                .map((record) => record.lessonId),
            ),
          );
          setError(null);
        })
        .catch(() => {
          if (cancelled || current !== sequence) return;
          setCompleted(null);
          setError(
            "Не вдалося прочитати локальний прогрес. Збереження не змінено; перелік уроків доступний.",
          );
        });
    }
    function visible() {
      if (document.visibilityState === "visible") refresh();
    }
    refresh();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", visible);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [availableVersions, attempt]);
  return {
    completed,
    error,
    retry: () => {
      setCompleted(null);
      setError(null);
      setAttempt((value) => value + 1);
    },
  };
}
