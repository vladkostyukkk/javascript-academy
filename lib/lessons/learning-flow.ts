import type { Quiz } from "./schema";

export type QuizFeedback = {
  questionId: string;
  correct: boolean;
  explanation: string;
};
export type LearningState = {
  tab: "theory" | "practice" | "tests";
  answers: Record<string, string>;
  feedback: QuizFeedback[] | null;
  theoryPassed: boolean;
};
export type LearningAction =
  | { type: "answer"; questionId: string; optionId: string }
  | { type: "submit" }
  | { type: "tab"; tab: LearningState["tab"] };

export const initialLearningState: LearningState = {
  tab: "theory",
  answers: {},
  feedback: null,
  theoryPassed: false,
};

export function gradeQuiz(
  quiz: Quiz,
  answers: Record<string, string>,
): QuizFeedback[] {
  return quiz.map((question) => {
    const answer = question.options.find(
      ({ id }) => id === answers[question.id],
    );
    return {
      questionId: question.id,
      correct: answer?.id === question.correctOptionId,
      explanation:
        answer?.explanation ??
        "Обери одну відповідь, щоб перевірити розуміння.",
    };
  });
}

export function reduceLearningState(
  state: LearningState,
  action: LearningAction,
  quiz: Quiz,
): LearningState {
  if (action.type === "answer") {
    const question = quiz.find(({ id }) => id === action.questionId);
    if (!question?.options.some(({ id }) => id === action.optionId))
      return state;
    return {
      ...state,
      tab: "theory",
      answers: { ...state.answers, [action.questionId]: action.optionId },
      feedback: null,
      theoryPassed: false,
    };
  }
  if (action.type === "submit") {
    const feedback = gradeQuiz(quiz, state.answers);
    return {
      ...state,
      feedback,
      theoryPassed:
        feedback.length > 0 && feedback.every(({ correct }) => correct),
    };
  }
  if (action.tab !== "theory" && !state.theoryPassed) return state;
  return { ...state, tab: action.tab };
}
