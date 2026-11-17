import { z } from "zod";
import { openDatabase } from "./database";
import { checkpointKey } from "./checkpoint-schema";
import { fileMapSchema, lessonIdSchema } from "@/lib/lessons/schema";

export const draftSnapshotSchema = z.strictObject({
  schemaVersion: z.literal(1),
  lessonId: lessonIdSchema,
  courseContentVersion: z.number().int().positive(),
  revision: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  fileMap: fileMapSchema,
  updatedAt: z.string().datetime(),
  token: z.string().uuid(),
});
export type DraftSnapshot = z.infer<typeof draftSnapshotSchema>;

export class DraftConflictError extends Error {
  constructor() {
    super("Чернетку вже змінила інша вкладка. Поточний код не перезаписано.");
  }
}

export async function readDraft(
  lessonId: DraftSnapshot["lessonId"],
  forkId?: string,
): Promise<unknown> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(
      forkId ? "forks" : "drafts",
      "readonly",
    );
    const request = transaction
      .objectStore(forkId ? "forks" : "drafts")
      .get(forkId ?? lessonId);
    transaction.oncomplete = () => {
      database.close();
      resolve(request.result as unknown);
    };
    transaction.onabort = () => {
      database.close();
      reject(transaction.error ?? new Error("Не вдалося прочитати чернетку."));
    };
  });
}

// Compare the whole record, including its unique token. Invalid JSON-shaped records
// can also be recovered without overwriting a concurrent writer's newer snapshot.
function fingerprint(value: unknown): string | undefined {
  return JSON.stringify(value);
}

export async function writeDraft(
  snapshot: DraftSnapshot,
  expected: unknown,
  archive = false,
  forkId?: string,
): Promise<void> {
  const valid = draftSnapshotSchema.parse(snapshot);
  const completionKey = checkpointKey(
    valid.lessonId,
    valid.courseContentVersion,
  );
  if (forkId && forkId !== completionKey)
    throw new Error("Копія належить іншому уроку або версії.");
  const expectedFingerprint = fingerprint(expected);
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(
      ["drafts", "draft-backups", "forks", "checkpoints", "progress"],
      "readwrite",
    );
    const store = transaction.objectStore(forkId ? "forks" : "drafts");
    let failure: unknown;
    const completion = transaction
      .objectStore("checkpoints")
      .get(completionKey);
    const progress = transaction.objectStore("progress").get(completionKey);
    const request = store.get(forkId ?? valid.lessonId);
    request.onsuccess = () => {
      try {
        const current: unknown = request.result;
        if (
          (!forkId &&
            (completion.result !== undefined ||
              progress.result !== undefined)) ||
          (forkId && completion.result === undefined)
        )
          throw new DraftConflictError();
        if (fingerprint(current) !== expectedFingerprint)
          throw new DraftConflictError();
        if (archive && current !== undefined) {
          transaction.objectStore("draft-backups").add({
            lessonId: valid.lessonId,
            archivedAt: new Date().toISOString(),
            reason: "explicit-starter-recovery",
            workspace: forkId ?? "main",
            original: current,
          });
        }
        store.put(valid, forkId ?? valid.lessonId);
      } catch (error) {
        failure = error;
        transaction.abort();
      }
    };
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onabort = () => {
      database.close();
      reject(
        failure ?? transaction.error ?? new Error("Чернетку не збережено."),
      );
    };
  });
}
