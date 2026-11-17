import type { LessonId } from "@/lib/lessons/schema";
import { openDatabase } from "./database";
import {
  draftSnapshotSchema,
  DraftConflictError,
  type DraftSnapshot,
} from "./draft-store";
import {
  checkpointKey,
  checkpointSchema,
  validateCompletion,
  type CompletedCheckpoint,
} from "./checkpoint-schema";

export type PassedResult = { id: string; passed: boolean };

export async function readCheckpointHistory(): Promise<CompletedCheckpoint[]> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(
      ["checkpoints", "progress"],
      "readonly",
    );
    const checkpoints = transaction.objectStore("checkpoints").getAll();
    const keys = transaction.objectStore("checkpoints").getAllKeys();
    const progress = transaction.objectStore("progress").getAll();
    const progressKeys = transaction.objectStore("progress").getAllKeys();
    transaction.oncomplete = () => {
      database.close();
      try {
        if (keys.result.length !== progressKeys.result.length)
          throw new Error("Неповна історія.");
        const saved = checkpoints.result.map((value: unknown, index) => {
          const progressIndex = progressKeys.result.findIndex(
            (key) => key === keys.result[index],
          );
          const record = validateCompletion(
            value,
            progress.result[progressIndex],
          );
          if (
            !record ||
            keys.result[index] !==
              checkpointKey(record.lessonId, record.courseContentVersion)
          )
            throw new Error("Некоректна історія.");
          return record;
        });
        resolve(
          saved.sort((a, b) => b.completedAt.localeCompare(a.completedAt)),
        );
      } catch {
        reject(
          new Error("Не вдалося прочитати історію. Збережені дані не змінено."),
        );
      }
    };
    transaction.onabort = () => {
      database.close();
      reject(transaction.error);
    };
  });
}

export async function readCompletion(
  lessonId: LessonId,
  contentVersion: number,
): Promise<CompletedCheckpoint | null> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const key = checkpointKey(lessonId, contentVersion);
    const transaction = database.transaction(
      ["checkpoints", "progress"],
      "readonly",
    );
    const checkpoint = transaction.objectStore("checkpoints").get(key);
    const progress = transaction.objectStore("progress").get(key);
    transaction.oncomplete = () => {
      database.close();
      try {
        const saved = validateCompletion(checkpoint.result, progress.result);
        if (
          saved &&
          (saved.lessonId !== lessonId ||
            saved.courseContentVersion !== contentVersion)
        )
          throw new Error("Checkpoint належить іншому уроку.");
        resolve(saved);
      } catch {
        reject(
          new Error(
            "Не вдалося прочитати завершення уроку. Збережені дані не змінено.",
          ),
        );
      }
    };
    transaction.onabort = () => {
      database.close();
      reject(transaction.error);
    };
  });
}

export async function completeDraft(
  snapshot: DraftSnapshot,
  results: PassedResult[],
  requiredIds: string[],
): Promise<CompletedCheckpoint> {
  const valid = draftSnapshotSchema.parse(snapshot);
  if (
    requiredIds.length < 2 ||
    new Set(requiredIds).size !== requiredIds.length ||
    results.length !== requiredIds.length ||
    requiredIds.some(
      (id) =>
        results.filter((result) => result.id === id && result.passed === true)
          .length !== 1,
    )
  ) {
    throw new Error("Спочатку пройди всі перевірки поточного коду.");
  }
  const next = checkpointSchema.parse({
    schemaVersion: 1,
    lessonId: valid.lessonId,
    courseContentVersion: valid.courseContentVersion,
    sourceRevision: valid.revision,
    sourceToken: valid.token,
    fileMap: valid.fileMap,
    completedAt: new Date().toISOString(),
    passedCheckIds: requiredIds,
  });
  const key = checkpointKey(valid.lessonId, valid.courseContentVersion);
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(
      ["drafts", "checkpoints", "progress"],
      "readwrite",
    );
    const draft = transaction.objectStore("drafts").get(valid.lessonId);
    const checkpoint = transaction.objectStore("checkpoints").get(key);
    const progress = transaction.objectStore("progress").get(key);
    let result = next;
    let failure: unknown;
    // Requests in this transaction are processed in issue order.
    progress.onsuccess = () => {
      try {
        if (JSON.stringify(draft.result) !== JSON.stringify(valid))
          throw new DraftConflictError();
        const existing = validateCompletion(checkpoint.result, progress.result);
        if (existing) {
          if (
            existing.lessonId !== valid.lessonId ||
            existing.courseContentVersion !== valid.courseContentVersion
          )
            throw new Error("Некоректний checkpoint.");
          result = existing;
          return;
        }
        // add, never put: completed checkpoints cannot be replaced by replay.
        transaction.objectStore("checkpoints").add(next, key);
        transaction.objectStore("progress").add(
          {
            schemaVersion: 1,
            lessonId: valid.lessonId,
            courseContentVersion: valid.courseContentVersion,
            status: "completed",
            completedAt: next.completedAt,
            checkpointId: key,
          },
          key,
        );
      } catch (error) {
        failure = error;
        transaction.abort();
      }
    };
    transaction.oncomplete = () => {
      database.close();
      resolve(result);
    };
    transaction.onabort = () => {
      database.close();
      reject(
        failure ?? transaction.error ?? new Error("Завершення не збережено."),
      );
    };
  });
}

export async function ensureFork(
  checkpoint: CompletedCheckpoint,
  starter: DraftSnapshot["fileMap"],
): Promise<string> {
  const valid = checkpointSchema.parse(checkpoint);
  const key = checkpointKey(valid.lessonId, valid.courseContentVersion);
  const fresh = draftSnapshotSchema.parse({
    schemaVersion: 1,
    lessonId: valid.lessonId,
    courseContentVersion: valid.courseContentVersion,
    revision: 0,
    fileMap: starter,
    updatedAt: new Date().toISOString(),
    token: crypto.randomUUID(),
  });
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(
      ["checkpoints", "progress", "forks"],
      "readwrite",
    );
    const saved = transaction.objectStore("checkpoints").get(key);
    const progress = transaction.objectStore("progress").get(key);
    const fork = transaction.objectStore("forks").get(key);
    let failure: unknown;
    fork.onsuccess = () => {
      try {
        const source = validateCompletion(saved.result, progress.result);
        if (!source || JSON.stringify(source) !== JSON.stringify(valid))
          throw new Error("Checkpoint змінився. Онови сторінку.");
        // Keep an existing replay draft, including a damaged one for explicit recovery.
        if (fork.result === undefined)
          transaction.objectStore("forks").add(fresh, key);
      } catch (error) {
        failure = error;
        transaction.abort();
      }
    };
    transaction.oncomplete = () => {
      database.close();
      resolve(key);
    };
    transaction.onabort = () => {
      database.close();
      reject(failure ?? transaction.error);
    };
  });
}
