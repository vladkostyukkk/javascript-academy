"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { Quiz } from "@/lib/lessons/schema";
import type { LearningBackup } from "@/lib/progress/learning-backups";
import type { useLearningSession } from "./use-learning-session";

export function LearningBackups({
  learning,
  quiz,
  blocked,
}: {
  learning: ReturnType<typeof useLearningSession>;
  quiz: Quiz;
  blocked: boolean;
}) {
  const [opened, setOpened] = useState(false);
  const [entries, setEntries] = useState<LearningBackup[]>([]);
  const [before, setBefore] = useState<number | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const mounted = useRef(false);
  const sequence = useRef(0);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  async function load(older = false) {
    const request = ++sequence.current;
    setLoading(true);
    setError(null);
    try {
      const page = await learning.listBackups(older ? before : undefined);
      if (!mounted.current || sequence.current !== request) return;
      setEntries((current) =>
        older
          ? [
              ...current,
              ...page.entries.filter(
                (entry) => !current.some((item) => item.id === entry.id),
              ),
            ]
          : page.entries,
      );
      setBefore(page.before);
    } catch {
      if (mounted.current && sequence.current === request)
        setError("Не вдалося прочитати архів. Спробуй оновити список.");
    } finally {
      if (mounted.current && sequence.current === request) setLoading(false);
    }
  }
  function download(entry: LearningBackup) {
    try {
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(entry, null, 2)], {
          type: "application/json",
        }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = `quiz-backup-${entry.id}.json`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setError("Не вдалося завантажити JSON-копію.");
    }
  }
  return (
    <section className="draft-backups" aria-label="Архів відповідей quiz">
      <h3>Резервні копії відповідей</h3>
      <p>
        Тут зберігаються записи перед відновленням quiz для поточного уроку,
        версії матеріалів і режиму. Файли коду та checkpoint не змінюються.
      </p>
      <Button
        variant="outline"
        aria-expanded={opened}
        aria-controls="quiz-backups"
        disabled={loading || learning.recovering}
        onClick={() => {
          setOpened(!opened);
          if (!opened) void load();
        }}
      >
        {opened ? "Сховати архів відповідей" : "Показати архів відповідей"}
      </Button>
      {notice && <p role="status">{notice}</p>}
      <div id="quiz-backups" hidden={!opened}>
        <Button
          variant="ghost"
          disabled={loading || learning.recovering}
          onClick={() => void load()}
        >
          Оновити архів
        </Button>
        {loading && <p role="status">Читаємо копії…</p>}
        {error && <p role="alert">{error}</p>}
        {!loading && !error && entries.length === 0 && (
          <p>
            Копій ще немає. Вони створюються перед явним відновленням
            навчального стану.
          </p>
        )}
        {learning.pending && <p>Дочекайся збереження поточних відповідей.</p>}
        <ul className="checkpoint-history">
          {entries.map((entry) => {
            const inspected = learning.inspectBackup(entry);
            return (
              <li key={entry.id}>
                <h4>
                  Копія №{entry.id} ·{" "}
                  {new Date(entry.archivedAt).toLocaleString("uk-UA")}
                </h4>
                {inspected.problem && <p>{inspected.problem}</p>}
                {inspected.snapshot && (
                  <details>
                    <summary>Переглянути відповіді</summary>
                    <p>
                      Спроб quiz: {inspected.snapshot.quizAttempts}.{" "}
                      {inspected.snapshot.submitted
                        ? "Відповіді були перевірені."
                        : "Відповіді ще не перевірялися."}
                    </p>
                    <ul>
                      {quiz.map((question) => (
                        <li key={question.id}>
                          {question.prompt}:{" "}
                          {question.options.find(
                            (option) =>
                              option.id ===
                              inspected.snapshot?.answers[question.id],
                          )?.label ?? "Без відповіді"}
                        </li>
                      ))}
                    </ul>
                    <p>
                      {inspected.state?.theoryPassed
                        ? "За поточними запитаннями перевірку розуміння пройдено."
                        : "Для доступу до практики потрібно пройти перевірку розуміння."}
                    </p>
                  </details>
                )}
                <div className="workspace-toolbar">
                  <Button variant="outline" onClick={() => download(entry)}>
                    Завантажити JSON
                  </Button>
                  <Button
                    disabled={
                      blocked ||
                      !learning.canRestore ||
                      Boolean(inspected.problem)
                    }
                    onClick={async () => {
                      if (
                        !window.confirm(
                          "Відновити відповіді з цієї копії? Поточний запис буде архівовано, відповіді оцінено заново. Ти залишишся в теорії; код і checkpoint не зміняться.",
                        )
                      )
                        return;
                      setNotice(null);
                      const restored = await learning.restoreBackup(entry);
                      if (mounted.current && restored) {
                        setNotice(
                          "Відповіді відновлено. Попередній запис збережено в архіві.",
                        );
                        await load();
                      }
                    }}
                  >
                    Відновити відповіді
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
        {before !== undefined && (
          <Button
            variant="outline"
            disabled={loading || learning.recovering}
            onClick={() => void load(true)}
          >
            Старіші копії
          </Button>
        )}
      </div>
    </section>
  );
}
