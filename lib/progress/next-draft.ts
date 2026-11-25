import {
  lessonMetaSchema,
  fileMapSchema,
  type FileMap,
} from "@/lib/lessons/schema";
import { openDatabase } from "./database";
import { checkpointKey, validateCompletion } from "./checkpoint-schema";
import { draftSnapshotSchema } from "./draft-store";
import { inheritCheckpointFiles } from "./inheritance";

export async function initializeNextDraft(
  metaInput: unknown,
  starterInput: FileMap,
  sourceVersion: number,
  useOfficialStarter = false,
): Promise<void> {
  const meta = lessonMetaSchema.parse(metaInput);
  const starter = fileMapSchema.parse(starterInput);
  const previousId = meta.prerequisites[0];
  if (
    !previousId ||
    meta.prerequisites.length !== 1 ||
    Number(previousId.slice(3)) + 1 !== meta.number
  )
    throw new Error("Некоректний перехід між уроками.");
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(
      ["drafts", "checkpoints", "progress"],
      "readwrite",
    );
    const drafts = tx.objectStore("drafts");
    const checkpoints = tx.objectStore("checkpoints");
    const progress = tx.objectStore("progress");
    const sourceKey = checkpointKey(previousId, sourceVersion);
    const targetKey = checkpointKey(meta.id, meta.courseContentVersion);
    const source = checkpoints.get(sourceKey);
    const sourceProgress = progress.get(sourceKey);
    const completed = checkpoints.get(targetKey);
    const completedProgress = progress.get(targetKey);
    const target = drafts.get(meta.id);
    let failure: unknown;
    target.onsuccess = () => {
      try {
        const checkpoint = validateCompletion(
          source.result,
          sourceProgress.result,
        );
        const existingCompletion = validateCompletion(
          completed.result,
          completedProgress.result,
        );
        if (
          existingCompletion &&
          (existingCompletion.lessonId !== meta.id ||
            existingCompletion.courseContentVersion !==
              meta.courseContentVersion)
        )
          throw new Error("Несумісне завершення уроку.");
        // Existing drafts, even invalid ones, belong to the learner and use normal recovery.
        if (target.result !== undefined || existingCompletion) return;
        const files =
          useOfficialStarter ||
          !checkpoint ||
          checkpoint.lessonId !== previousId ||
          checkpoint.courseContentVersion !== sourceVersion
            ? starter
            : inheritCheckpointFiles(
                checkpoint,
                { meta, starter },
                sourceVersion,
              );
        drafts.add(
          draftSnapshotSchema.parse({
            schemaVersion: 1,
            lessonId: meta.id,
            courseContentVersion: meta.courseContentVersion,
            fileMap: files,
            revision: 0,
            token: crypto.randomUUID(),
            updatedAt: new Date().toISOString(),
          }),
          meta.id,
        );
      } catch (reason) {
        failure = reason;
        tx.abort();
      }
    };
    tx.oncomplete = () => {
      database.close();
      resolve();
    };
    tx.onabort = () => {
      database.close();
      reject(
        failure ?? tx.error ?? new Error("Не вдалося підготувати чернетку."),
      );
    };
  });
}
