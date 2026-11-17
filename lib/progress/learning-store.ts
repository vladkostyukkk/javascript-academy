import { z } from "zod";
import { lessonIdSchema, type Quiz } from "@/lib/lessons/schema";
import {
  initialLearningState,
  reduceLearningState,
  type LearningState,
} from "@/lib/lessons/learning-flow";
import { openDatabase } from "./database";

const identifier = z.string().regex(/^[a-z][a-z0-9-]{0,49}$/);
export const learningSnapshotSchema = z.strictObject({
  schemaVersion: z.literal(1),
  lessonId: lessonIdSchema,
  courseContentVersion: z.number().int().positive(),
  scope: z.enum(["main", "fork"]),
  answers: z
    .record(identifier, identifier)
    .refine((answers) => Object.keys(answers).length <= 5),
  submitted: z.boolean(),
  tab: z.enum(["theory", "practice", "tests"]),
  quizAttempts: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  revision: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  token: z.string().uuid(),
  updatedAt: z.string().datetime(),
});
export type LearningSnapshot = z.infer<typeof learningSnapshotSchema>;
export type LearningIdentity = Pick<
  LearningSnapshot,
  "lessonId" | "courseContentVersion" | "scope"
>;
export function learningKey(identity: LearningIdentity) {
  return `${identity.lessonId}@${identity.courseContentVersion}:${identity.scope}`;
}

export function restoreLearning(
  snapshot: LearningSnapshot,
  quiz: Quiz,
): LearningState {
  let state = initialLearningState;
  for (const [questionId, optionId] of Object.entries(snapshot.answers)) {
    if (
      !quiz.some(
        (question) =>
          question.id === questionId &&
          question.options.some((option) => option.id === optionId),
      )
    ) {
      throw new Error(
        "Збережені відповіді не відповідають поточним запитанням.",
      );
    }
    state = reduceLearningState(
      state,
      { type: "answer", questionId, optionId },
      quiz,
    );
  }
  if (snapshot.submitted)
    state = reduceLearningState(state, { type: "submit" }, quiz);
  // Recompute feedback and gate from current quiz, never trust a persisted passed flag.
  return reduceLearningState(state, { type: "tab", tab: snapshot.tab }, quiz);
}

export class LearningConflictError extends Error {
  constructor() {
    super(
      "Інша вкладка вже змінила відповіді. Автозбереження навчального стану зупинено; поточні відповіді залишаються на сторінці.",
    );
  }
}

export async function readLearning(
  identity: LearningIdentity,
): Promise<unknown> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction("learning-sessions", "readonly");
    const request = transaction
      .objectStore("learning-sessions")
      .get(learningKey(identity));
    transaction.oncomplete = () => {
      database.close();
      resolve(request.result as unknown);
    };
    transaction.onabort = () => {
      database.close();
      reject(transaction.error);
    };
  });
}

export async function writeLearning(
  snapshot: LearningSnapshot,
  expected: unknown,
  archive = false,
): Promise<LearningSnapshot> {
  const valid = learningSnapshotSchema.parse(snapshot);
  const fingerprint = JSON.stringify(expected);
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(
      ["learning-sessions", "learning-backups"],
      "readwrite",
    );
    const store = transaction.objectStore("learning-sessions");
    const key = learningKey(valid);
    const request = store.get(key);
    let failure: unknown;
    request.onsuccess = () => {
      try {
        if (JSON.stringify(request.result) !== fingerprint)
          throw new LearningConflictError();
        if (archive && request.result !== undefined)
          transaction.objectStore("learning-backups").add({
            key,
            archivedAt: new Date().toISOString(),
            original: request.result,
          });
        store.put(valid, key);
      } catch (reason) {
        failure = reason;
        transaction.abort();
      }
    };
    transaction.oncomplete = () => {
      database.close();
      resolve(valid);
    };
    transaction.onabort = () => {
      database.close();
      reject(failure ?? transaction.error);
    };
  });
}
