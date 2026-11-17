import { describe, expect, it } from "vitest";
import quizInput from "@/content/lessons/js-01/quiz.json";
import {
  gradeQuiz,
  initialLearningState,
  reduceLearningState,
} from "@/lib/lessons/learning-flow";
import { quizSchema } from "@/lib/lessons/schema";

const quiz = quizSchema.parse(quizInput);
const correctAnswers = Object.fromEntries(
  quiz.map((question) => [question.id, question.correctOptionId]),
);

describe("theory check and explicit practice transition", () => {
  it("cannot enter practice or tests without submitting a complete correct quiz", () => {
    for (const tab of ["practice", "tests"] as const)
      expect(
        reduceLearningState(initialLearningState, { type: "tab", tab }, quiz),
      ).toBe(initialLearningState);
    const answered = { ...initialLearningState, answers: correctAnswers };
    expect(
      reduceLearningState(answered, { type: "tab", tab: "practice" }, quiz).tab,
    ).toBe("theory");
    const passed = reduceLearningState(answered, { type: "submit" }, quiz);
    expect(passed.theoryPassed).toBe(true);
    expect(passed.tab).toBe("theory");
    expect(
      reduceLearningState(passed, { type: "tab", tab: "practice" }, quiz).tab,
    ).toBe("practice");
  });

  it("returns meaningful feedback for missing, invalid and incorrect answers", () => {
    expect(
      gradeQuiz(quiz, {}).every(
        (feedback) => !feedback.correct && feedback.explanation.length > 10,
      ),
    ).toBe(true);
    const wrong = { ...correctAnswers, [quiz[0].id]: "heading" };
    expect(
      reduceLearningState(
        { ...initialLearningState, answers: wrong },
        { type: "submit" },
        quiz,
      ).theoryPassed,
    ).toBe(false);
    const invalid = { ...correctAnswers, [quiz[0].id]: "forged-answer" };
    expect(gradeQuiz(quiz, invalid)[0].correct).toBe(false);
    expect(
      reduceLearningState(
        initialLearningState,
        { type: "answer", questionId: "missing", optionId: "console" },
        quiz,
      ),
    ).toBe(initialLearningState);
  });

  it("revokes the gate after editing and retains answers when returning to theory", () => {
    const passed = reduceLearningState(
      { ...initialLearningState, answers: correctAnswers },
      { type: "submit" },
      quiz,
    );
    const practice = reduceLearningState(
      passed,
      { type: "tab", tab: "practice" },
      quiz,
    );
    const returned = reduceLearningState(
      practice,
      { type: "tab", tab: "theory" },
      quiz,
    );
    expect(returned.answers).toEqual(correctAnswers);
    expect(returned.theoryPassed).toBe(true);
    const changed = reduceLearningState(
      returned,
      { type: "answer", questionId: quiz[0].id, optionId: "heading" },
      quiz,
    );
    expect(changed.theoryPassed).toBe(false);
    expect(changed.feedback).toBeNull();
    expect(
      reduceLearningState(changed, { type: "tab", tab: "practice" }, quiz).tab,
    ).toBe("theory");
    expect(initialLearningState.theoryPassed).toBe(false);
  });
});
