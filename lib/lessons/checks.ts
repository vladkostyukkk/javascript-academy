import type { LessonCheck } from "./schema";

export type LessonObservation = {
  bindings: Record<string, unknown>;
  logs: unknown[][];
  probeResults?: Record<string, boolean>;
  runtimeError?: string;
};

function matches(check: LessonCheck, observation: LessonObservation): boolean {
  switch (check.kind) {
    case "bindingEquals":
      return observation.bindings[check.binding] === check.expected;
    case "consoleEquals":
      return (
        JSON.stringify(observation.logs) === JSON.stringify(check.expected)
      );
    case "callEquals":
    case "generatorSequence":
    case "bindingStructure":
    case "callStructure":
      return (
        observation.probeResults !== undefined &&
        Object.hasOwn(observation.probeResults, check.id) &&
        observation.probeResults[check.id] === true
      );
  }
}

// Compares observations only. This module never runs source code.
export function evaluateChecks(
  checks: LessonCheck[],
  observation: LessonObservation,
) {
  return checks.map((check) => ({
    id: check.id,
    passed: !observation.runtimeError && matches(check, observation),
    feedback: observation.runtimeError
      ? "У коді виникла помилка. Перевір лапки, назви та дужки перед повторною перевіркою."
      : check.feedback,
  }));
}
