import type { LessonCheck } from "./schema";

export type LessonObservation = {
  bindings: Record<string, unknown>;
  logs: unknown[][];
  runtimeError?: string;
};

// Compares observations only. This module never runs source code.
export function evaluateChecks(
  checks: LessonCheck[],
  observation: LessonObservation,
) {
  return checks.map((check) => ({
    id: check.id,
    passed:
      !observation.runtimeError &&
      (check.kind === "bindingEquals"
        ? observation.bindings[check.binding] === check.expected
        : JSON.stringify(observation.logs) === JSON.stringify(check.expected)),
    feedback: observation.runtimeError
      ? "У коді виникла помилка. Перевір лапки, назви та дужки перед повторною перевіркою."
      : check.feedback,
  }));
}
