"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { ZodError } from "zod";
import type { FileMap, LessonId } from "@/lib/lessons/schema";
import type { WorkspaceDraft } from "@/lib/workspace/state";
import {
  createDraftBackup,
  inspectBackup,
  inspectDraftSnapshot,
  readDraftBackups,
  restoreDraftFiles,
  type DraftBackup,
  type DraftRestoreSource,
} from "@/lib/progress/draft-backups";
import {
  completeDraft,
  ensureFork,
  readCompletion,
  type PassedResult,
} from "@/lib/progress/checkpoint-store";
import type { CompletedCheckpoint } from "@/lib/progress/checkpoint-schema";
import {
  DraftConflictError,
  draftSnapshotSchema,
  readDraft,
  writeDraft,
  type DraftSnapshot,
} from "@/lib/progress/draft-store";

type Options = {
  lessonId: LessonId;
  courseContentVersion: number;
  starter: FileMap;
  editablePaths: string[];
  draft: WorkspaceDraft;
  setDraft: Dispatch<SetStateAction<WorkspaceDraft>>;
  forkId?: string;
};
type Phase = "loading" | "ready" | "recovery" | "load-error" | "conflict";

function downloadJson(value: unknown, filename: string) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function useDraftStorage({
  lessonId,
  courseContentVersion,
  starter,
  editablePaths,
  draft,
  setDraft,
  forkId,
}: Options) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [savedRevision, setSavedRevision] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [recovering, setRecovering] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [completed, setCompleted] = useState<CompletedCheckpoint | null>(null);
  const [operationBusy, setOperationBusy] = useState(false);
  const operation = useRef(false);
  const expected = useRef<unknown>(undefined);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const saveGeneration = useRef(0);
  const halted = useRef(false);
  const mounted = useRef(false);
  const recoveryActive = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Editing is unavailable until hydration completes. A late read cannot replace edits.
  useEffect(() => {
    if (phase !== "loading") return;
    let cancelled = false;
    void Promise.all([
      readDraft(lessonId, forkId),
      readCompletion(lessonId, courseContentVersion),
    ])
      .then(([raw, checkpoint]) => {
        if (cancelled) return;
        if (forkId && !checkpoint)
          throw new Error("Немає checkpoint для повторення.");
        setCompleted(checkpoint);
        expected.current = raw;
        if (checkpoint && !forkId) {
          setDraft({
            files: checkpoint.fileMap,
            revision: checkpoint.sourceRevision,
          });
          setSavedRevision(checkpoint.sourceRevision);
          setHydrated(true);
          setError(null);
          setPhase("ready");
          return;
        }
        if (raw === undefined) {
          setHydrated(true);
          setError(null);
          setPhase("ready");
          return;
        }
        const parsed = draftSnapshotSchema.safeParse(raw);
        if (
          !parsed.success ||
          parsed.data.lessonId !== lessonId ||
          parsed.data.courseContentVersion !== courseContentVersion ||
          parsed.data.fileMap.length !== starter.length ||
          parsed.data.fileMap.some(
            (file) =>
              !starter.some(
                (original) =>
                  original.path === file.path &&
                  (editablePaths.includes(file.path) ||
                    original.content === file.content),
              ),
          )
        ) {
          setPhase("recovery");
          setError(
            "Збережена чернетка пошкоджена або належить іншій версії матеріалів. Ми її не змінювали.",
          );
          return;
        }
        setDraft({
          files: parsed.data.fileMap,
          revision: parsed.data.revision,
        });
        setSavedRevision(parsed.data.revision);
        setHydrated(true);
        setPhase("ready");
        setError(null);
      })
      .catch(() => {
        if (!cancelled) {
          setPhase("load-error");
          setError(
            "Не вдалося відкрити локальне сховище. Дозволь збереження даних для цього сайту або закрий інші вкладки академії й повтори спробу.",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [
    phase,
    lessonId,
    courseContentVersion,
    starter,
    editablePaths,
    setDraft,
    forkId,
  ]);

  const snapshot = useCallback(
    (value: WorkspaceDraft): DraftSnapshot => ({
      schemaVersion: 1,
      lessonId,
      courseContentVersion,
      revision: value.revision,
      fileMap: value.files,
      updatedAt: new Date().toISOString(),
      token: crypto.randomUUID(),
    }),
    [lessonId, courseContentVersion],
  );

  useEffect(() => {
    if (
      phase !== "ready" ||
      (completed && !forkId) ||
      draft.revision === savedRevision
    )
      return;
    const generation = saveGeneration.current;
    const timer = setTimeout(() => {
      // Serialize writes even while the learner keeps typing. Only the committed
      // revision is marked saved; the next write uses that commit as its CAS base.
      queue.current = queue.current.then(async () => {
        if (
          halted.current ||
          operation.current ||
          !mounted.current ||
          generation !== saveGeneration.current
        )
          return;
        try {
          const next = snapshot(draft);
          await writeDraft(next, expected.current, false, forkId);
          expected.current = next;
          if (mounted.current) {
            setSavedRevision(next.revision);
            setError(null);
          }
        } catch (reason) {
          halted.current = true;
          if (mounted.current) {
            if (reason instanceof DraftConflictError) setPhase("conflict");
            setError(
              reason instanceof DraftConflictError
                ? reason.message
                : reason instanceof ZodError
                  ? "Чернетка не відповідає формату або перевищує ліміт: 64 KiB на файл, 256 KiB на проєкт. Скороти код або завантаж копію; поточний текст залишається в редакторі."
                  : "Автозбереження не вдалося. Код залишається в редакторі. Перевір доступ до сховища й вільне місце або завантаж резервну копію.",
            );
          }
        }
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [draft, phase, savedRevision, attempt, snapshot, completed, forkId]);

  async function recover() {
    if (phase !== "recovery" || recoveryActive.current || operation.current)
      return;
    recoveryActive.current = true;
    setRecovering(true);
    try {
      const next = snapshot({ files: structuredClone(starter), revision: 0 });
      await writeDraft(next, expected.current, true, forkId);
      expected.current = next;
      if (mounted.current) {
        setDraft({ files: next.fileMap, revision: next.revision });
        setSavedRevision(next.revision);
        setHydrated(true);
        setError(null);
        setPhase("ready");
      }
    } catch (reason) {
      if (mounted.current) {
        if (reason instanceof DraftConflictError) setPhase("conflict");
        setError(
          reason instanceof DraftConflictError
            ? reason.message
            : "Відновлення не вдалося. Попередню чернетку не видалено. Спробуй ще раз.",
        );
      }
    } finally {
      recoveryActive.current = false;
      if (mounted.current) setRecovering(false);
    }
  }

  const pending = hydrated && draft.revision !== savedRevision;
  const listBackups = useCallback(
    (before?: number) => readDraftBackups(lessonId, before),
    [lessonId],
  );
  const inspectStoredBackup = useCallback(
    (backup: DraftBackup) =>
      inspectBackup(backup, {
        lessonId,
        courseContentVersion,
        starter,
        editablePaths,
      }),
    [lessonId, courseContentVersion, starter, editablePaths],
  );
  const canRestoreBackup =
    (phase === "ready" || phase === "recovery") &&
    !pending &&
    !operationBusy &&
    !recovering &&
    (!completed || Boolean(forkId)) &&
    (phase === "recovery" || !error);
  const inspectImport = (value: DraftSnapshot) =>
    inspectDraftSnapshot(value, {
      lessonId,
      courseContentVersion,
      starter,
      editablePaths,
    });
  async function saveBackup(): Promise<boolean> {
    if (
      phase !== "ready" ||
      pending ||
      error ||
      operation.current ||
      recoveryActive.current ||
      (completed && !forkId)
    )
      return false;
    operation.current = true;
    setOperationBusy(true);
    try {
      await queue.current;
      if (halted.current) throw new Error("Спочатку збережи чернетку.");
      const saved = draftSnapshotSchema.parse(expected.current);
      if (
        saved.revision !== draft.revision ||
        JSON.stringify(saved.fileMap) !== JSON.stringify(draft.files)
      )
        throw new DraftConflictError();
      await createDraftBackup(saved, forkId);
      return true;
    } catch (reason) {
      if (mounted.current) {
        if (reason instanceof DraftConflictError) {
          halted.current = true;
          setPhase("conflict");
        }
        setError(
          reason instanceof DraftConflictError
            ? reason.message
            : "Не вдалося створити резервну копію. Чернетку не змінено; повтори спробу.",
        );
      }
      return false;
    } finally {
      operation.current = false;
      if (mounted.current) setOperationBusy(false);
    }
  }
  async function restoreFiles(source: DraftRestoreSource): Promise<boolean> {
    if (!canRestoreBackup || operation.current || recoveryActive.current)
      return false;
    operation.current = true;
    saveGeneration.current++;
    setOperationBusy(true);
    try {
      await queue.current;
      if (halted.current) throw new DraftConflictError();
      const next = await restoreDraftFiles({
        source,
        context: { lessonId, courseContentVersion, starter, editablePaths },
        expected: expected.current,
        currentRevision: draft.revision,
        forkId,
      });
      expected.current = next;
      if (mounted.current) {
        setDraft({ files: next.fileMap, revision: next.revision });
        setSavedRevision(next.revision);
        setHydrated(true);
        setError(null);
        setPhase("ready");
      }
      return true;
    } catch (reason) {
      if (mounted.current) {
        if (reason instanceof DraftConflictError) {
          halted.current = true;
          setPhase("conflict");
        }
        setError(
          reason instanceof Error &&
            !(reason instanceof ZodError) &&
            !(reason instanceof DOMException) &&
            !(reason instanceof TypeError)
            ? reason.message
            : "Відновлення не виконано. Перевір сумісність копії; попередні дані збережено.",
        );
      }
      return false;
    } finally {
      operation.current = false;
      if (mounted.current) setOperationBusy(false);
    }
  }
  async function complete(results: PassedResult[], requiredIds: string[]) {
    if (
      phase !== "ready" ||
      pending ||
      error ||
      completed ||
      forkId ||
      operation.current
    )
      return;
    operation.current = true;
    setOperationBusy(true);
    try {
      await queue.current;
      if (halted.current)
        throw new Error("Спочатку збережи актуальну чернетку.");
      const saved = draftSnapshotSchema.parse(expected.current);
      if (
        saved.revision !== draft.revision ||
        JSON.stringify(saved.fileMap) !== JSON.stringify(draft.files)
      )
        throw new Error("Код змінився. Повтори перевірку.");
      const checkpoint = await completeDraft(saved, results, requiredIds);
      if (mounted.current) setCompleted(checkpoint);
    } catch (reason) {
      if (mounted.current) {
        if (reason instanceof DraftConflictError) {
          halted.current = true;
          setPhase("conflict");
        }
        setError(
          reason instanceof Error
            ? reason.message
            : "Завершення не збережено. Спробуй ще раз.",
        );
      }
    } finally {
      operation.current = false;
      if (mounted.current) setOperationBusy(false);
    }
  }
  async function fork(): Promise<string | undefined> {
    if (!completed || pending || operation.current || phase !== "ready") return;
    operation.current = true;
    setOperationBusy(true);
    try {
      return await ensureFork(completed, starter);
    } catch {
      if (mounted.current)
        setError(
          "Не вдалося відкрити повторення. Збережені файли не змінено; спробуй ще раз.",
        );
    } finally {
      operation.current = false;
      if (mounted.current) setOperationBusy(false);
    }
  }
  return {
    phase,
    pending,
    error,
    recovering,
    completed,
    isFork: Boolean(forkId),
    operationBusy,
    lessonId,
    listBackups,
    inspectBackup: inspectStoredBackup,
    inspectImport,
    canRestoreBackup,
    saveBackup,
    restoreFiles,
    complete,
    fork,
    canView:
      hydrated &&
      (!completed || Boolean(forkId)) &&
      (phase === "ready" || phase === "conflict"),
    canEdit:
      hydrated &&
      (!completed || Boolean(forkId)) &&
      !operationBusy &&
      (phase === "ready" || phase === "conflict"),
    message:
      phase === "loading"
        ? "Відкриваємо збережену чернетку…"
        : (error ??
          (pending
            ? "Зберігаємо зміни…"
            : completed && !forkId
              ? "Урок завершено. Checkpoint збережено локально."
              : "Чернетка збережена локально в цьому браузері.")),
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
    recover,
    downloadCheckpoint: () => {
      try {
        if (completed) downloadJson(completed, `${lessonId}-checkpoint.json`);
      } catch {
        setError(
          "Не вдалося завантажити копію checkpoint. Збережені дані не змінено.",
        );
      }
    },
    download: () => {
      try {
        downloadJson(
          !hydrated ? expected.current : snapshot(draft),
          `${lessonId}-draft-backup.json`,
        );
      } catch {
        setError(
          "Не вдалося завантажити копію. Збережений запис не змінено; скопіюй доступний код з редактора вручну.",
        );
      }
    },
  };
}
