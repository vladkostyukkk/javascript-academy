"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { readCheckpointHistory } from "@/lib/progress/checkpoint-store";
import { createProjectZip } from "@/lib/progress/project-zip";
import {
  checkpointKey,
  type CompletedCheckpoint,
} from "@/lib/progress/checkpoint-schema";

export function CheckpointHistory() {
  const [records, setRecords] = useState<CompletedCheckpoint[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    void readCheckpointHistory()
      .then((result) => {
        if (!cancelled) {
          setRecords(result);
          setError(null);
        }
      })
      .catch(() => {
        if (!cancelled)
          setError(
            "Не вдалося завантажити збережені версії. Перевір доступ до сховища та закрий інші вкладки академії. Дані не змінено.",
          );
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);
  function download(
    record: CompletedCheckpoint,
    format: "json" | "zip" = "json",
  ) {
    try {
      const url = URL.createObjectURL(
        format === "zip"
          ? new Blob([createProjectZip(record.fileMap)], {
              type: "application/zip",
            })
          : new Blob([JSON.stringify(record, null, 2)], {
              type: "application/json",
            }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download =
        format === "zip"
          ? "FocusBoard.zip"
          : `${record.lessonId}-v${record.courseContentVersion}-checkpoint.json`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setError(
        "Не вдалося завантажити копію. Checkpoint залишається у сховищі.",
      );
    }
  }
  return (
    <section
      className="project-empty"
      aria-labelledby="checkpoint-history-title"
    >
      <h2 id="checkpoint-history-title">Збережені версії FocusBoard</h2>
      <p>
        Тут з’являються незмінні копії після підтвердженого завершення уроку.
        Дані зберігаються тільки в цьому браузері. JSON — резервна копія;
        ZIP-експорт та імпорт ще готуються.
      </p>
      {error ? (
        <div role="alert">
          <p>{error}</p>
          <Button
            variant="outline"
            onClick={() => {
              setError(null);
              setAttempt((value) => value + 1);
            }}
          >
            Повторити завантаження
          </Button>
        </div>
      ) : records === null ? (
        <p role="status">Завантажуємо історію…</p>
      ) : records.length === 0 ? (
        <p>
          Збережених версій ще немає. Пройди Check у першому уроці та підтвердь
          завершення.
        </p>
      ) : (
        <ul className="checkpoint-history">
          {records.map((record) => (
            <li
              key={checkpointKey(record.lessonId, record.courseContentVersion)}
            >
              <h3>
                Урок {record.lessonId} · версія матеріалів{" "}
                {record.courseContentVersion}
              </h3>
              <p>
                {new Date(record.completedAt).toLocaleString("uk-UA")} · файлів:{" "}
                {record.fileMap.length}
              </p>
              <div className="workspace-toolbar">
                <Button variant="outline" onClick={() => download(record)}>
                  Завантажити checkpoint JSON
                </Button>
                {record.lessonId === "js-60" && (
                  <Button
                    variant="outline"
                    onClick={() => download(record, "zip")}
                  >
                    Завантажити FocusBoard ZIP
                  </Button>
                )}
                <Button asChild variant="ghost">
                  <Link href={`/learn/javascript/${record.lessonId}`}>
                    Відкрити урок і повторення
                  </Link>
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Button asChild variant="outline">
        <Link href="/learn/javascript/js-01">До першого уроку</Link>
      </Button>
    </section>
  );
}
