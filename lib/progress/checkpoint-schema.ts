import { z } from "zod";
import { fileMapSchema, lessonIdSchema } from "@/lib/lessons/schema";

export function checkpointKey(lessonId: string, contentVersion: number) {
  return `${lessonId}@${contentVersion}`;
}

export const checkpointSchema = z.strictObject({
  schemaVersion: z.literal(1),
  lessonId: lessonIdSchema,
  courseContentVersion: z.number().int().positive(),
  sourceRevision: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  sourceToken: z.string().uuid(),
  fileMap: fileMapSchema,
  completedAt: z.string().datetime(),
  passedCheckIds: z
    .array(z.string().min(1).max(100))
    .min(2)
    .max(10)
    .refine((ids) => new Set(ids).size === ids.length),
});
export type CompletedCheckpoint = z.infer<typeof checkpointSchema>;
export const completedProgressSchema = z.strictObject({
  schemaVersion: z.literal(1),
  lessonId: lessonIdSchema,
  courseContentVersion: z.number().int().positive(),
  status: z.literal("completed"),
  completedAt: z.string().datetime(),
  checkpointId: z.string().min(1).max(100),
});

export function validateCompletion(
  checkpoint: unknown,
  progress: unknown,
): CompletedCheckpoint | null {
  if (checkpoint === undefined && progress === undefined) return null;
  const saved = checkpointSchema.parse(checkpoint);
  const state = completedProgressSchema.parse(progress);
  if (
    state.lessonId !== saved.lessonId ||
    state.courseContentVersion !== saved.courseContentVersion ||
    state.completedAt !== saved.completedAt ||
    state.checkpointId !==
      checkpointKey(saved.lessonId, saved.courseContentVersion)
  ) {
    throw new Error(
      "Збереження завершення пошкоджене. Дані залишено без змін.",
    );
  }
  return saved;
}
