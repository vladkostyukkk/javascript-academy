import { z } from "zod";
import {
  lessonIdSchema,
  type FileMap,
  type LessonId,
} from "@/lib/lessons/schema";
import { openDatabase } from "./database";
import { checkpointKey, validateCompletion } from "./checkpoint-schema";
import {
  draftSnapshotSchema,
  DraftConflictError,
  type DraftSnapshot,
} from "./draft-store";

const backupSchema = z.object({
  lessonId: lessonIdSchema,
  archivedAt: z.string().datetime(),
  reason: z.string().max(100),
  workspace: z.string().min(1).max(100).optional().default("main"),
  original: z.unknown(),
});
export type DraftBackup = z.infer<typeof backupSchema> & { id: number };
export type BackupContext = {
  lessonId: LessonId;
  courseContentVersion: number;
  starter: FileMap;
  editablePaths: string[];
};
export type BackupPage = { entries: DraftBackup[]; before?: number };
export type DraftRestoreSource =
  | { kind: "local"; backup: DraftBackup }
  | { kind: "import"; snapshot: DraftSnapshot };

export const MAX_DRAFT_IMPORT_BYTES = 2 * 1024 * 1024;
const importedBackupSchema = backupSchema
  .extend({
    id: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
    sourceBackupId: z.number().int().positive().optional(),
  })
  .strict();

export function parseDraftImport(text: string): DraftSnapshot {
  if (new TextEncoder().encode(text).byteLength > MAX_DRAFT_IMPORT_BYTES)
    throw new Error("JSON-копія перевищує ліміт 2 MiB.");
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error(
      "Файл не містить коректний JSON. Вибери завантажену копію чернетки.",
    );
  }
  const direct = draftSnapshotSchema.safeParse(raw);
  if (direct.success) return direct.data;
  const archive = importedBackupSchema.safeParse(raw);
  if (archive.success) {
    const original = draftSnapshotSchema.safeParse(archive.data.original);
    if (
      original.success &&
      archive.data.lessonId === original.data.lessonId &&
      (archive.data.workspace === "main" ||
        archive.data.workspace ===
          checkpointKey(
            original.data.lessonId,
            original.data.courseContentVersion,
          ))
    )
      return original.data;
  }
  throw new Error(
    "Непідтримувана або пошкоджена копія чернетки. Потрібен JSON чернетки чи файлового архіву; checkpoint і відповіді quiz не імпортуються. Ліміти коду: 64 KiB на файл, 256 KiB разом.",
  );
}

function parseBackup(id: number, raw: unknown): DraftBackup {
  return { id, ...backupSchema.parse(raw) };
}

export function inspectBackup(backup: DraftBackup, context: BackupContext) {
  const result = inspectDraftSnapshot(backup.original, context);
  return backup.lessonId === context.lessonId
    ? result
    : { ...result, problem: "Копія належить іншому уроку." };
}

export function inspectDraftSnapshot(raw: unknown, context: BackupContext) {
  const parsed = draftSnapshotSchema.safeParse(raw);
  if (!parsed.success)
    return {
      snapshot: null,
      problem:
        "Запис пошкоджений або має невідомий формат. Доступна лише JSON-копія.",
    };
  const snapshot = parsed.data;
  let problem: string | null = null;
  if (snapshot.lessonId !== context.lessonId)
    problem = "Копія належить іншому уроку.";
  else if (snapshot.courseContentVersion !== context.courseContentVersion)
    problem =
      "Інша версія матеріалів: автоматичне перенесення файлів недоступне.";
  else if (
    snapshot.fileMap.length !== context.starter.length ||
    snapshot.fileMap.some(
      (file) =>
        !context.starter.some(
          (original) =>
            original.path === file.path &&
            (context.editablePaths.includes(file.path) ||
              file.content === original.content),
        ),
    )
  )
    problem =
      "Шляхи або файли основи не відповідають поточному уроку. Автоматичне виправлення не виконується.";
  return { snapshot, problem };
}

export async function readDraftBackups(
  lessonId: LessonId,
  before?: number,
): Promise<BackupPage> {
  if (before !== undefined && (!Number.isSafeInteger(before) || before <= 0))
    throw new Error("Некоректна сторінка архіву.");
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction("draft-backups", "readonly");
    const request = transaction
      .objectStore("draft-backups")
      .openCursor(
        before === undefined ? undefined : IDBKeyRange.upperBound(before, true),
        "prev",
      );
    const entries: DraftBackup[] = [];
    let nextBefore: number | undefined;
    let failure: unknown;
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) return;
      try {
        const raw: unknown = cursor.value;
        // Records from other lessons are never exposed in this workspace.
        if (
          typeof raw === "object" &&
          raw !== null &&
          "lessonId" in raw &&
          raw.lessonId === lessonId
        ) {
          if (
            typeof cursor.key !== "number" ||
            !Number.isSafeInteger(cursor.key)
          )
            throw new Error("Некоректний ключ резервної копії.");
          const backup = parseBackup(cursor.key, raw);
          if (entries.length === 20) {
            nextBefore = entries[entries.length - 1].id;
            return;
          }
          entries.push(backup);
        }
        cursor.continue();
      } catch (reason) {
        failure = reason;
        transaction.abort();
      }
    };
    transaction.oncomplete = () => {
      database.close();
      resolve({ entries, before: nextBefore });
    };
    transaction.onabort = () => {
      database.close();
      reject(
        failure ??
          transaction.error ??
          new Error("Не вдалося прочитати резервні копії."),
      );
    };
  });
}

export async function createDraftBackup(
  snapshot: DraftSnapshot,
  forkId?: string,
): Promise<void> {
  const valid = draftSnapshotSchema.parse(snapshot);
  if (
    forkId &&
    forkId !== checkpointKey(valid.lessonId, valid.courseContentVersion)
  )
    throw new Error("Копія належить іншому уроку.");
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(
      ["drafts", "forks", "draft-backups"],
      "readwrite",
    );
    const request = transaction
      .objectStore(forkId ? "forks" : "drafts")
      .get(forkId ?? valid.lessonId);
    let failure: unknown;
    request.onsuccess = () => {
      try {
        if (JSON.stringify(request.result) !== JSON.stringify(valid))
          throw new DraftConflictError();
        transaction.objectStore("draft-backups").add({
          lessonId: valid.lessonId,
          archivedAt: new Date().toISOString(),
          reason: "manual",
          workspace: forkId ?? "main",
          original: request.result,
        });
      } catch (reason) {
        failure = reason;
        transaction.abort();
      }
    };
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onabort = () => {
      database.close();
      reject(failure ?? transaction.error ?? new Error("Копію не збережено."));
    };
  });
}

export async function restoreDraftFiles({
  source,
  context,
  expected,
  currentRevision,
  forkId,
}: {
  source: DraftRestoreSource;
  context: BackupContext;
  expected: unknown;
  currentRevision: number;
  forkId?: string;
}): Promise<DraftSnapshot> {
  const candidate =
    source.kind === "local"
      ? inspectBackup(source.backup, context)
      : inspectDraftSnapshot(source.snapshot, context);
  if (candidate.problem || !candidate.snapshot)
    throw new Error(candidate.problem ?? "Копія недоступна.");
  const completionId = checkpointKey(
    context.lessonId,
    context.courseContentVersion,
  );
  if (forkId && forkId !== completionId)
    throw new Error("Копія належить іншому уроку.");
  const previous = draftSnapshotSchema.safeParse(expected);
  const next = draftSnapshotSchema.parse({
    ...candidate.snapshot,
    revision:
      Math.max(currentRevision, previous.success ? previous.data.revision : 0) +
      1,
    updatedAt: new Date().toISOString(),
    token: crypto.randomUUID(),
  });
  const fingerprint = JSON.stringify(expected);
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(
      ["drafts", "forks", "draft-backups", "checkpoints", "progress"],
      "readwrite",
    );
    const target = transaction.objectStore(forkId ? "forks" : "drafts");
    const current = target.get(forkId ?? context.lessonId);
    const checkpoint = transaction.objectStore("checkpoints").get(completionId);
    const progress = transaction.objectStore("progress").get(completionId);
    const sourceRecord =
      source.kind === "local"
        ? transaction.objectStore("draft-backups").get(source.backup.id)
        : null;
    let failure: unknown;
    // All preceding reads have finished when this request succeeds.
    (sourceRecord ?? progress).onsuccess = () => {
      try {
        if (JSON.stringify(current.result) !== fingerprint)
          throw new DraftConflictError();
        if (
          source.kind === "local" &&
          sourceRecord &&
          JSON.stringify(parseBackup(source.backup.id, sourceRecord.result)) !==
            JSON.stringify(source.backup)
        )
          throw new Error(
            "Резервна копія змінилася. Онови список перед відновленням.",
          );
        if (
          !forkId &&
          (checkpoint.result !== undefined || progress.result !== undefined)
        )
          throw new Error(
            "Основний урок завершено. Відкрий повторення й віднови копію там.",
          );
        if (forkId) {
          const completed = validateCompletion(
            checkpoint.result,
            progress.result,
          );
          if (
            !completed ||
            completed.lessonId !== context.lessonId ||
            completed.courseContentVersion !== context.courseContentVersion
          )
            throw new Error("Немає сумісного checkpoint для повторення.");
        }
        if (current.result !== undefined)
          transaction.objectStore("draft-backups").add({
            lessonId: context.lessonId,
            archivedAt: new Date().toISOString(),
            reason: source.kind === "local" ? "backup-restore" : "json-import",
            workspace: forkId ?? "main",
            ...(source.kind === "local"
              ? { sourceBackupId: source.backup.id }
              : {}),
            original: current.result,
          });
        target.put(next, forkId ?? context.lessonId);
      } catch (reason) {
        failure = reason;
        transaction.abort();
      }
    };
    transaction.oncomplete = () => {
      database.close();
      resolve(next);
    };
    transaction.onabort = () => {
      database.close();
      reject(
        failure ??
          transaction.error ??
          new Error("Відновлення не виконано. Попередні дані збережено."),
      );
    };
  });
}
