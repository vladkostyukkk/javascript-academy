import {
  fileMapSchema,
  lessonMetaSchema,
  type FileMap,
} from "@/lib/lessons/schema";
import {
  checkpointSchema,
  type CompletedCheckpoint,
} from "./checkpoint-schema";

/** Prepare files only; persistence must atomically verify the source and absent target. */
export function inheritCheckpointFiles(
  source: CompletedCheckpoint,
  target: {
    meta: Parameters<typeof lessonMetaSchema.parse>[0];
    starter: FileMap;
  },
  expectedSourceVersion: number,
): FileMap {
  const checkpoint = checkpointSchema.parse(source);
  const meta = lessonMetaSchema.parse(target.meta);
  const starter = fileMapSchema.parse(target.starter);
  if (
    meta.number !== Number(checkpoint.lessonId.slice(3)) + 1 ||
    meta.id !== `js-${String(meta.number).padStart(2, "0")}` ||
    meta.prerequisites.length !== 1 ||
    meta.prerequisites[0] !== checkpoint.lessonId
  )
    throw new Error("Потрібен checkpoint безпосередньо попереднього уроку.");
  if (checkpoint.courseContentVersion !== expectedSourceVersion)
    throw new Error(
      "Версія попереднього checkpoint несумісна. Потрібен явний вибір відновлення.",
    );
  if (
    meta.editablePaths.some(
      (path) => !starter.some((file) => file.path === path),
    )
  )
    throw new Error("Редагований файл відсутній у початковій основі.");
  for (const file of checkpoint.fileMap) {
    const destination = starter.find((item) => item.path === file.path);
    if (!destination)
      throw new Error(
        "Наступний урок вилучає учнівський файл. Потрібна явна міграція.",
      );
    if (
      !meta.editablePaths.includes(file.path) &&
      destination.content !== file.content
    )
      throw new Error(
        "Незмінна основа наступного уроку відрізняється. Потрібна явна міграція.",
      );
  }
  // Retain every existing byte; starter contributes only genuinely new paths.
  return fileMapSchema.parse(
    starter.map((file) => {
      const previous = checkpoint.fileMap.find(
        (item) => item.path === file.path,
      );
      return previous ? { ...previous } : { ...file };
    }),
  );
}
