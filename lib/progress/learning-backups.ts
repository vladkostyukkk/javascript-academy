import { z } from "zod";
import type { Quiz } from "@/lib/lessons/schema";
import { openDatabase } from "./database";
import {
  learningKey,
  learningSnapshotSchema,
  restoreLearning,
  LearningConflictError,
  type LearningIdentity,
  type LearningSnapshot,
} from "./learning-store";

const recordSchema = z.object({
  key: z.string(),
  archivedAt: z.string().datetime(),
  original: z.unknown(),
});
export type LearningBackup = z.infer<typeof recordSchema> & { id: number };
export function inspectLearningBackup(
  backup: LearningBackup,
  identity: LearningIdentity,
  quiz: Quiz,
) {
  try {
    const snapshot = learningSnapshotSchema.parse(backup.original);
    if (
      backup.key !== learningKey(identity) ||
      learningKey(snapshot) !== learningKey(identity)
    )
      throw new Error();
    const normalized = { ...snapshot, tab: "theory" as const };
    return {
      snapshot: normalized,
      state: restoreLearning(normalized, quiz),
      problem: null,
    };
  } catch {
    return {
      snapshot: null,
      state: null,
      problem:
        "Копія пошкоджена або несумісна з поточним уроком, режимом чи запитаннями.",
    };
  }
}
export async function readLearningBackups(
  identity: LearningIdentity,
  before?: number,
): Promise<{ entries: LearningBackup[]; before?: number }> {
  if (before !== undefined && (!Number.isSafeInteger(before) || before <= 0))
    throw new Error("Некоректна сторінка архіву.");
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = database.transaction("learning-backups", "readonly");
    const request = tx
      .objectStore("learning-backups")
      .openCursor(
        before === undefined ? undefined : IDBKeyRange.upperBound(before, true),
        "prev",
      );
    const entries: LearningBackup[] = [];
    let nextBefore: number | undefined;
    let failure: unknown;
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) return;
      try {
        const raw: unknown = cursor.value;
        if (
          typeof raw === "object" &&
          raw !== null &&
          "key" in raw &&
          raw.key === learningKey(identity)
        ) {
          if (
            typeof cursor.key !== "number" ||
            !Number.isSafeInteger(cursor.key) ||
            cursor.key <= 0
          )
            throw new Error("Некоректний ключ копії.");
          const entry = { id: cursor.key, ...recordSchema.parse(raw) };
          if (entries.length === 20) {
            nextBefore = entries[entries.length - 1].id;
            return;
          }
          entries.push(entry);
        }
        cursor.continue();
      } catch (reason) {
        failure = reason;
        tx.abort();
      }
    };
    tx.oncomplete = () => {
      database.close();
      resolve({ entries, before: nextBefore });
    };
    tx.onabort = () => {
      database.close();
      reject(failure ?? tx.error);
    };
  });
}
export async function restoreLearningBackup(
  backup: LearningBackup,
  identity: LearningIdentity,
  quiz: Quiz,
  expected: unknown,
  revision: number,
): Promise<LearningSnapshot> {
  const inspected = inspectLearningBackup(backup, identity, quiz);
  if (!inspected.snapshot)
    throw new Error(inspected.problem ?? "Копія недоступна.");
  const previous = learningSnapshotSchema.safeParse(expected);
  const next = learningSnapshotSchema.parse({
    ...inspected.snapshot,
    revision:
      Math.max(revision, previous.success ? previous.data.revision : 0) + 1,
    token: crypto.randomUUID(),
    updatedAt: new Date().toISOString(),
  });
  const fingerprint = JSON.stringify(expected);
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(
      ["learning-sessions", "learning-backups"],
      "readwrite",
    );
    const sessions = tx.objectStore("learning-sessions");
    const backups = tx.objectStore("learning-backups");
    const current = sessions.get(learningKey(identity));
    const source = backups.get(backup.id);
    let failure: unknown;
    source.onsuccess = () => {
      try {
        if (JSON.stringify(current.result) !== fingerprint)
          throw new LearningConflictError();
        if (
          JSON.stringify({
            id: backup.id,
            ...recordSchema.parse(source.result),
          }) !== JSON.stringify(backup)
        )
          throw new Error("Копія змінилася. Онови список.");
        if (current.result !== undefined)
          backups.add({
            key: learningKey(identity),
            archivedAt: new Date().toISOString(),
            original: current.result,
          });
        sessions.put(next, learningKey(identity));
      } catch (reason) {
        failure = reason;
        tx.abort();
      }
    };
    tx.oncomplete = () => {
      database.close();
      resolve(next);
    };
    tx.onabort = () => {
      database.close();
      reject(failure ?? tx.error);
    };
  });
}
