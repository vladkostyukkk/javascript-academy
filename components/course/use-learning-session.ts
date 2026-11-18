"use client";
import { useEffect, useRef, useState } from "react";
import {
  initialLearningState,
  reduceLearningState,
  type LearningAction,
  type LearningState,
} from "@/lib/lessons/learning-flow";
import type { LessonId, Quiz } from "@/lib/lessons/schema";
import {
  readLearningBackups,
  inspectLearningBackup,
  restoreLearningBackup,
  type LearningBackup,
} from "@/lib/progress/learning-backups";
import {
  learningSnapshotSchema,
  readLearning,
  restoreLearning,
  writeLearning,
  LearningConflictError,
  type LearningSnapshot,
} from "@/lib/progress/learning-store";

type Session = {
  learning: LearningState;
  revision: number;
  quizAttempts: number;
};
const initialSession: Session = {
  learning: initialLearningState,
  revision: 0,
  quizAttempts: 0,
};
type Phase =
  | "loading"
  | "ready"
  | "load-error"
  | "recovery"
  | "recovery-conflict"
  | "conflict";

export function useLearningSession(
  lessonId: LessonId,
  courseContentVersion: number,
  quiz: Quiz,
  forkId?: string,
) {
  const scope = forkId ? "fork" : "main";
  const [session, setSession] = useState(initialSession);
  const [phase, setPhase] = useState<Phase>("loading");
  const [savedRevision, setSavedRevision] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [recovering, setRecovering] = useState(false);
  const expected = useRef<unknown>(undefined);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const halted = useRef(false);
  const mounted = useRef(false);
  const recoveryActive = useRef(false);
  const saveGeneration = useRef(0);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (phase !== "loading") return;
    let cancelled = false;
    void readLearning({ lessonId, courseContentVersion, scope })
      .then((raw) => {
        if (cancelled) return;
        expected.current = raw;
        if (raw !== undefined) {
          try {
            const saved = learningSnapshotSchema.parse(raw);
            if (
              saved.lessonId !== lessonId ||
              saved.courseContentVersion !== courseContentVersion ||
              saved.scope !== scope
            )
              throw new Error("Несумісний запис.");
            const learning = restoreLearning(saved, quiz);
            setSession({
              learning,
              revision: saved.revision,
              quizAttempts: saved.quizAttempts,
            });
            setSavedRevision(saved.revision);
          } catch {
            setError(
              "Збережений навчальний стан пошкоджений або несумісний. Відповіді не замінено. Можна почати quiz заново зі збереженням резервної копії запису.",
            );
            setPhase("recovery");
            return;
          }
        }
        setPhase("ready");
        setError(null);
      })
      .catch(() => {
        if (!cancelled) {
          setPhase("load-error");
          setError(
            "Не вдалося завантажити навчальний стан. Перевір доступ до сховища або закрий інші вкладки академії.",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [phase, lessonId, courseContentVersion, scope, quiz]);

  useEffect(() => {
    if (phase !== "ready" || session.revision === savedRevision) return;
    const generation = saveGeneration.current;
    const timer = setTimeout(() => {
      queue.current = queue.current.then(async () => {
        if (
          !mounted.current ||
          halted.current ||
          recoveryActive.current ||
          generation !== saveGeneration.current
        )
          return;
        try {
          const next: LearningSnapshot = {
            schemaVersion: 1,
            lessonId,
            courseContentVersion,
            scope,
            answers: session.learning.answers,
            submitted: session.learning.feedback !== null,
            tab: session.learning.tab,
            quizAttempts: session.quizAttempts,
            revision: session.revision,
            token: crypto.randomUUID(),
            updatedAt: new Date().toISOString(),
          };
          expected.current = await writeLearning(next, expected.current);
          if (mounted.current) {
            setSavedRevision(next.revision);
            setError(null);
          }
        } catch (reason) {
          halted.current = true;
          if (mounted.current) {
            if (reason instanceof LearningConflictError) setPhase("conflict");
            setError(
              reason instanceof LearningConflictError
                ? reason.message
                : "Навчальний стан не збережено. Відповіді лишилися на сторінці; повтори збереження перед виходом.",
            );
          }
        }
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [
    phase,
    session,
    savedRevision,
    attempt,
    lessonId,
    courseContentVersion,
    scope,
  ]);

  function dispatch(action: LearningAction) {
    if (recoveryActive.current) return;
    if (phase !== "ready" && phase !== "conflict") return;
    setSession((current) => {
      if (action.type === "tab" && action.tab === current.learning.tab)
        return current;
      const learning = reduceLearningState(current.learning, action, quiz);
      if (learning === current.learning) return current;
      return {
        learning,
        revision: current.revision + 1,
        quizAttempts: current.quizAttempts + (action.type === "submit" ? 1 : 0),
      };
    });
  }
  async function recover() {
    if (phase !== "recovery" || recoveryActive.current) return;
    if (
      !window.confirm(
        "Почати quiz заново? Попередній запис буде збережено в локальному архіві. Файли коду та checkpoint не зміняться.",
      )
    )
      return;
    recoveryActive.current = true;
    setRecovering(true);
    try {
      const next: LearningSnapshot = {
        schemaVersion: 1,
        lessonId,
        courseContentVersion,
        scope,
        answers: {},
        submitted: false,
        tab: "theory",
        quizAttempts: 0,
        revision: 0,
        updatedAt: new Date().toISOString(),
        token: crypto.randomUUID(),
      };
      expected.current = await writeLearning(next, expected.current, true);
      if (mounted.current) {
        setSession(initialSession);
        setSavedRevision(0);
        setError(null);
        setPhase("ready");
      }
    } catch (reason) {
      if (mounted.current) {
        if (reason instanceof LearningConflictError) {
          halted.current = true;
          setPhase("recovery-conflict");
        }
        setError(
          reason instanceof LearningConflictError
            ? `${reason.message} Онови сторінку перед відновленням.`
            : "Не вдалося відновити quiz. Попередні дані не змінено.",
        );
      }
    } finally {
      recoveryActive.current = false;
      if (mounted.current) setRecovering(false);
    }
  }
  const pending = session.revision !== savedRevision;
  const canRestore =
    (phase === "ready" || phase === "recovery") &&
    !pending &&
    !recovering &&
    (phase === "recovery" || !error) &&
    session.learning.tab === "theory";
  async function restoreBackup(backup: LearningBackup) {
    if (!canRestore || recoveryActive.current) return false;
    recoveryActive.current = true;
    saveGeneration.current++;
    setRecovering(true);
    try {
      await queue.current;
      if (halted.current) throw new LearningConflictError();
      const next = await restoreLearningBackup(
        backup,
        { lessonId, courseContentVersion, scope },
        quiz,
        expected.current,
        session.revision,
      );
      expected.current = next;
      if (mounted.current) {
        setSession({
          learning: restoreLearning(next, quiz),
          revision: next.revision,
          quizAttempts: next.quizAttempts,
        });
        setSavedRevision(next.revision);
        setPhase("ready");
        setError(null);
      }
      return true;
    } catch (reason) {
      if (mounted.current) {
        if (reason instanceof LearningConflictError) {
          halted.current = true;
          setPhase(phase === "recovery" ? "recovery-conflict" : "conflict");
        }
        setError(
          reason instanceof LearningConflictError
            ? reason.message
            : "Не вдалося відновити копію quiz. Онови список; попередні дані збережено.",
        );
      }
      return false;
    } finally {
      recoveryActive.current = false;
      if (mounted.current) setRecovering(false);
    }
  }
  return {
    listBackups: (before?: number) =>
      readLearningBackups({ lessonId, courseContentVersion, scope }, before),
    inspectBackup: (backup: LearningBackup) =>
      inspectLearningBackup(
        backup,
        { lessonId, courseContentVersion, scope },
        quiz,
      ),
    restoreBackup,
    canRestore,
    state: session.learning,
    dispatch,
    phase,
    pending,
    error,
    recovering,
    recover,
    ready: !recovering && (phase === "ready" || phase === "conflict"),
    message:
      phase === "loading"
        ? "Завантажуємо відповіді та місце зупинки…"
        : (error ??
          (pending
            ? "Зберігаємо навчальний стан…"
            : "Навчальний стан готовий. Нові відповіді й переходи зберігаються автоматично.")),
    retry: () => {
      if (phase === "load-error") {
        setError(null);
        setPhase("loading");
      } else if (phase === "ready") {
        halted.current = false;
        setError(null);
        setAttempt((value) => value + 1);
      }
    },
    download: () => {
      try {
        const data =
          phase === "recovery" || phase === "recovery-conflict"
            ? expected.current
            : {
                lessonId,
                courseContentVersion,
                scope,
                answers: session.learning.answers,
                tab: session.learning.tab,
                quizAttempts: session.quizAttempts,
              };
        const url = URL.createObjectURL(
          new Blob([JSON.stringify(data, null, 2)], {
            type: "application/json",
          }),
        );
        const link = document.createElement("a");
        link.href = url;
        link.download = `${lessonId}-${scope}-quiz.json`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } catch {
        setError(
          "Не вдалося завантажити копію відповідей. Дані залишилися без змін.",
        );
      }
    },
  };
}
