"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { FileMap, LessonCheck, LessonId } from "@/lib/lessons/schema";
import { useDraftStorage } from "./use-draft-storage";
import { startRunner, type RunnerEvent } from "@/lib/runner/controller";
import { prepareRun } from "@/lib/runner/prepare";
import { editDraft, isDirty, lessonRun } from "@/lib/workspace/state";
import type {
  DraftBackup,
  DraftRestoreSource,
} from "@/lib/progress/draft-backups";
import type { DraftSnapshot } from "@/lib/progress/draft-store";

export type CheckResult = { id: string; passed: boolean; feedback: string };
export function useWorkspace(
  starter: FileMap,
  editablePaths: string[],
  checks: LessonCheck[],
  lessonId: LessonId,
  courseContentVersion: number,
  forkId?: string,
  learningPending = false,
) {
  const [draft, setDraft] = useState({
    files: structuredClone(starter),
    revision: 0,
  });
  const [activeFile, setActiveFile] = useState(editablePaths[0]);
  const storage = useDraftStorage({
    lessonId,
    courseContentVersion,
    starter,
    editablePaths,
    draft,
    setDraft,
    forkId,
  });
  const [events, setEvents] = useState<RunnerEvent[]>([]);
  const [results, setResults] = useState<CheckResult[] | null>(null);
  const [status, setStatus] = useState("Код ще не запускався.");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(false);
  const [passedRevision, setPassedRevision] = useState<number | null>(null);
  const verified = useRef<{ revision: number; results: CheckResult[] } | null>(
    null,
  );
  const completionLock = useRef(false);
  const container = useRef<HTMLDivElement>(null);
  const attachPreview = useCallback((element: HTMLDivElement | null) => {
    container.current = element;
  }, []);
  const active = useRef<ReturnType<typeof startRunner> | null>(null);
  const generation = useRef(0);
  const dirty = isDirty(draft.files, starter);
  const cancel = useCallback(() => {
    generation.current++;
    active.current?.dispose();
    active.current = null;
  }, []);
  useEffect(() => () => cancel(), [cancel]);
  useEffect(() => {
    if (!storage.pending && !learningPending) return;
    const unload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    const navigation = (event: MouseEvent) => {
      if (event.defaultPrevented || !(event.target instanceof Element)) return;
      const link = event.target.closest("a[href]") as HTMLAnchorElement | null;
      if (
        !link ||
        link.hasAttribute("download") ||
        link.target === "_blank" ||
        event.ctrlKey ||
        event.metaKey
      )
        return;
      const url = new URL(link.href);
      if (url.pathname === location.pathname && url.search === location.search)
        return;
      if (
        !window.confirm(
          "Зміни ще не збережені. Вийти зі сторінки та втратити їх?",
        )
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", navigation, true);
    return () => {
      window.removeEventListener("beforeunload", unload);
      document.removeEventListener("click", navigation, true);
    };
  }, [storage.pending, learningPending]);
  function stop() {
    cancel();
    setBusy(false);
    setPreview(false);
    setStatus("Запуск зупинено. Код залишився в редакторі.");
  }
  function suspend() {
    cancel();
    setBusy(false);
    setPreview(false);
    if (busy)
      setStatus("Запуск зупинено під час переходу. Код залишився в редакторі.");
  }
  function edit(path: string, content: string) {
    if (!storage.canEdit || completionLock.current) return;
    const next = editDraft(draft, path, content, editablePaths);
    if (next === draft) return;
    verified.current = null;
    setPassedRevision(null);
    cancel();
    setBusy(false);
    setPreview(false);
    setDraft(next);
    setResults(null);
    setEvents([]);
    setStatus("Код змінено. Запусти або перевір нову версію.");
  }
  function reset() {
    if (!storage.canEdit || completionLock.current) return;
    verified.current = null;
    setPassedRevision(null);
    cancel();
    setBusy(false);
    setPreview(false);
    setDraft((previous) => ({
      files: structuredClone(starter),
      revision: previous.revision + 1,
    }));
    setResults(null);
    setEvents([]);
    setStatus("Початковий код відновлено.");
  }
  async function execute(operation: "run" | "check") {
    if (!storage.canEdit || completionLock.current) return;
    verified.current = null;
    setPassedRevision(null);
    cancel();
    const version = generation.current;
    setBusy(true);
    setPreview(false);
    setResults(null);
    setEvents([]);
    setStatus(operation === "run" ? "Запускаємо код…" : "Перевіряємо рішення…");
    try {
      const plan = await prepareRun(
        lessonRun(draft.files, starter, editablePaths, checks, operation),
      );
      const response = await fetch("/runner/runtime.js");
      if (!response.ok)
        throw new Error(
          "Не вдалося завантажити середовище запуску. Спробуй ще раз.",
        );
      const runtime = await response.text();
      if (version !== generation.current || !container.current) return;
      setPreview(true);
      active.current = startRunner(
        container.current,
        runtime,
        plan,
        (event) => {
          if (version !== generation.current) return;
          if (event.kind === "disposed") {
            setPreview(false);
            return;
          }
          setEvents((previous) => [...previous, event]);
          if (event.kind === "execution") {
            setBusy(false);
            if (operation === "check") {
              const valid =
                event.operation === "check" &&
                event.checks.length === checks.length &&
                checks.every(
                  (check) =>
                    event.checks.filter((result) => result.id === check.id)
                      .length === 1,
                );
              if (!valid) {
                setStatus("Некоректна відповідь перевірки. Спробуй ще раз.");
                return;
              }
              setResults(event.checks);
              if (event.checks.every((check) => check.passed)) {
                verified.current = {
                  revision: draft.revision,
                  results: event.checks,
                };
                setPassedRevision(draft.revision);
              }
              setStatus(
                event.checks.every((check) => check.passed)
                  ? storage.isFork
                    ? "Повторення пройдено. Основний checkpoint не змінюється."
                    : "Усі перевірки пройдено. Тепер можна зберегти завершення уроку."
                  : "Поки не всі перевірки пройдено. Переглянь пояснення.",
              );
            } else
              setStatus(
                "Код виконано. Для перевірки завдання натисни «Перевірити».",
              );
          }
          if (event.kind === "error" || event.kind === "timeout") {
            verified.current = null;
            setPassedRevision(null);
            setBusy(false);
            setStatus(
              event.kind === "timeout"
                ? "Час виконання вичерпано. Перевір цикли та спробуй ще раз."
                : "Помилка JavaScript. Перевір код і спробуй ще раз.",
            );
            if (operation === "check")
              setResults(
                checks.map((check) => ({
                  id: check.id,
                  passed: false,
                  feedback:
                    "Перевірку не завершено через помилку виконання. Спочатку виправ код.",
                })),
              );
          }
        },
      );
    } catch (error) {
      if (version !== generation.current) return;
      setBusy(false);
      setStatus("Не вдалося підготувати запуск.");
      setEvents([
        {
          kind: "error",
          text:
            error instanceof Error
              ? error.message
              : "Невідома помилка запуску.",
          stack: "",
        },
      ]);
    }
  }
  const canComplete =
    !busy &&
    storage.phase === "ready" &&
    !storage.pending &&
    !storage.error &&
    !storage.completed &&
    !storage.isFork &&
    !storage.operationBusy &&
    passedRevision === draft.revision;
  async function complete() {
    const proof = verified.current;
    if (
      !canComplete ||
      !proof ||
      proof.revision !== draft.revision ||
      completionLock.current
    )
      return;
    completionLock.current = true;
    try {
      lessonRun(draft.files, starter, editablePaths, checks, "check");
      await storage.complete(
        proof.results,
        checks.map((check) => check.id),
      );
    } catch {
      setStatus(
        "Не вдалося зберегти завершення. Перевір цілісність файлів і повтори Check.",
      );
    } finally {
      completionLock.current = false;
    }
  }
  async function restoreFiles(source: DraftRestoreSource) {
    if (busy || !storage.canRestoreBackup || completionLock.current)
      return false;
    completionLock.current = true;
    cancel();
    verified.current = null;
    setPassedRevision(null);
    setResults(null);
    setEvents([]);
    setPreview(false);
    try {
      const restored = await storage.restoreFiles(source);
      setStatus(
        restored
          ? "Чернетку відновлено з резервної копії. Запусти нову перевірку коду."
          : "Відновлення не виконано. Переглянь повідомлення сховища.",
      );
      return restored;
    } finally {
      completionLock.current = false;
    }
  }
  return {
    draft,
    activeFile,
    setActiveFile,
    events,
    results,
    status,
    busy,
    preview,
    attachPreview,
    dirty,
    storage,
    edit,
    reset,
    stop,
    suspend,
    execute,
    canComplete,
    complete,
    restoreBackup: (backup: DraftBackup) =>
      restoreFiles({ kind: "local", backup }),
    importDraft: (snapshot: DraftSnapshot) =>
      restoreFiles({ kind: "import", snapshot }),
  };
}
export type WorkspaceController = ReturnType<typeof useWorkspace>;
