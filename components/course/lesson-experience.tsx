"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Code2,
  FlaskConical,
  Lightbulb,
  LockKeyhole,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLearningSession } from "./use-learning-session";
import type {
  Quiz,
  FileMap,
  LessonCheck,
  LessonId,
} from "@/lib/lessons/schema";
import { useWorkspace } from "@/components/workspace/use-workspace";
import { CompletionPanel } from "@/components/workspace/completion-panel";
import {
  LessonWorkspace,
  CheckResults,
} from "@/components/workspace/lesson-workspace";

type Props = {
  lessonId: LessonId;
  courseContentVersion: number;
  quiz: Quiz;
  hints: string[];
  objectives: string[];
  durationMinutes: number;
  theory: ReactNode;
  challenge: ReactNode;
  starter: FileMap;
  editablePaths: string[];
  checks: LessonCheck[];
};

export function LessonExperience(props: Props) {
  const [forkId, setForkId] = useState<string | undefined>();
  return (
    <LessonSession
      key={forkId ?? "main"}
      {...props}
      forkId={forkId}
      onSwitch={setForkId}
    />
  );
}

function LessonSession({
  lessonId,
  courseContentVersion,
  quiz,
  hints,
  objectives,
  durationMinutes,
  theory,
  challenge,
  starter,
  editablePaths,
  checks,
  forkId,
  onSwitch,
}: Props & {
  forkId?: string;
  onSwitch: (forkId: string | undefined) => void;
}) {
  const learning = useLearningSession(
    lessonId,
    courseContentVersion,
    quiz,
    forkId,
  );
  const { state, dispatch } = learning;
  const workspace = useWorkspace(
    starter,
    editablePaths,
    checks,
    lessonId,
    courseContentVersion,
    forkId,
    learning.pending,
  );
  const learningDisabled = !learning.ready || workspace.storage.operationBusy;
  const [visibleHints, setVisibleHints] = useState(0);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const practiceRef = useRef<HTMLDivElement>(null);
  const focusPractice = useRef(false);
  useEffect(() => {
    if (state.feedback) feedbackRef.current?.focus();
  }, [state.feedback]);
  useEffect(() => {
    if (state.tab === "practice" && focusPractice.current) {
      // Radix Presence reveals the panel after the tab state changes.
      // Focus after that DOM update, without taking focus away from keyboard tab navigation.
      const frame = requestAnimationFrame(() => {
        practiceRef.current?.focus();
        focusPractice.current = false;
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [state.tab]);

  return (
    <Tabs
      value={state.tab}
      onValueChange={(tab) => {
        if (learningDisabled) return;
        if (tab !== "practice") workspace.suspend();
        if (tab === "theory" || tab === "practice" || tab === "tests")
          dispatch({ type: "tab", tab });
      }}
    >
      <CompletionPanel
        workspace={workspace}
        onSwitch={onSwitch}
        switchBlocked={!learning.ready || learning.pending}
      />
      <div
        className="workspace-status"
        aria-label="Збереження навчального стану"
      >
        <p role="status">{learning.message}</p>
        {(learning.phase === "load-error" ||
          (learning.phase === "ready" && learning.error)) && (
          <Button variant="outline" onClick={learning.retry}>
            Повторити спробу
          </Button>
        )}
        {learning.phase === "recovery" && (
          <Button
            disabled={learning.recovering}
            onClick={() => void learning.recover()}
          >
            Почати quiz заново зі збереженням копії
          </Button>
        )}
        {learning.error && learning.phase !== "load-error" && (
          <Button variant="ghost" onClick={learning.download}>
            Завантажити копію відповідей
          </Button>
        )}
        {learning.phase === "conflict" && (
          <p>
            Завантаж копію відповідей і онови сторінку, щоб прочитати новіший
            запис. Автоматичного об’єднання немає.
          </p>
        )}
      </div>
      <TabsList aria-label="Розділи уроку">
        <TabsTrigger value="theory" disabled={learningDisabled}>
          <BookOpen size={17} />
          Теорія
        </TabsTrigger>
        <TabsTrigger
          value="practice"
          disabled={learningDisabled || !state.theoryPassed}
          aria-describedby="practice-lock-note"
        >
          <Code2 size={17} />
          Практика
          {!state.theoryPassed && <LockKeyhole size={12} aria-hidden="true" />}
        </TabsTrigger>
        <TabsTrigger
          value="tests"
          disabled={learningDisabled || !state.theoryPassed}
        >
          <FlaskConical size={17} />
          Перевірка
        </TabsTrigger>
      </TabsList>
      <p id="practice-lock-note" className="practice-lock-note">
        {state.theoryPassed
          ? "Перевірку розуміння пройдено. Можна перейти до завдання або повернутися до теорії."
          : "Щоб відкрити завдання, прочитай теорію та правильно відповідай на всі запитання нижче."}
      </p>
      <TabsContent value="theory">
        <div className="lesson-content-grid">
          <div>
            <article className="theory-content">{theory}</article>
            <section
              className="knowledge-check"
              aria-labelledby="knowledge-heading"
            >
              <span className="eyebrow">ПЕРЕВІР СЕБЕ</span>
              <h2 id="knowledge-heading">Чи все зрозуміло?</h2>
              <p>
                Обери по одній відповіді. Якщо помилишся, пояснення допоможе
                спробувати знову.
              </p>
              <form
                noValidate
                onSubmit={(event) => {
                  event.preventDefault();
                  if (learningDisabled) return;
                  dispatch({ type: "submit" });
                }}
              >
                {quiz.map((question, index) => {
                  const feedback = state.feedback?.find(
                    ({ questionId }) => questionId === question.id,
                  );
                  return (
                    <fieldset
                      disabled={learningDisabled}
                      key={question.id}
                      className="quiz-question"
                      aria-describedby={
                        feedback ? `${question.id}-feedback` : undefined
                      }
                    >
                      <legend>
                        <span className="quiz-number">{index + 1}.</span>{" "}
                        {question.prompt}
                      </legend>
                      {question.options.map((option) => (
                        <label key={option.id} className="quiz-option">
                          <input
                            type="radio"
                            name={question.id}
                            value={option.id}
                            checked={state.answers[question.id] === option.id}
                            onChange={() =>
                              dispatch({
                                type: "answer",
                                questionId: question.id,
                                optionId: option.id,
                              })
                            }
                          />
                          <span>{option.label}</span>
                        </label>
                      ))}
                      {feedback && (
                        <p
                          id={`${question.id}-feedback`}
                          className={`quiz-feedback ${feedback.correct ? "correct" : "incorrect"}`}
                        >
                          <strong>
                            {feedback.correct
                              ? "Правильно. "
                              : "Ще одна спроба. "}
                          </strong>
                          {feedback.explanation}
                        </p>
                      )}
                    </fieldset>
                  );
                })}
                <Button
                  type="submit"
                  variant="outline"
                  disabled={learningDisabled}
                >
                  Перевірити відповіді
                </Button>
              </form>
              {state.feedback && (
                <div
                  ref={feedbackRef}
                  tabIndex={-1}
                  role="status"
                  className={`quiz-summary ${state.theoryPassed ? "correct" : "incorrect"}`}
                >
                  {state.theoryPassed ? (
                    <>
                      <CheckCircle2 size={19} aria-hidden="true" />
                      <p>
                        <strong>Перевірку розуміння пройдено.</strong>
                        <br />
                        Тепер можна прочитати завдання. Це ще не завершення
                        уроку.
                      </p>
                    </>
                  ) : (
                    <p>
                      Поки не всі відповіді правильні. Переглянь пояснення біля
                      запитань та перевір відповіді ще раз.
                    </p>
                  )}
                </div>
              )}
              {state.theoryPassed && (
                <Button
                  className="practice-transition"
                  disabled={learningDisabled}
                  onClick={() => {
                    focusPractice.current = true;
                    dispatch({ type: "tab", tab: "practice" });
                  }}
                >
                  Перейти до практики <ArrowRight />
                </Button>
              )}
            </section>
          </div>
          <aside className="lesson-aside">
            <span className="eyebrow">НАВЧИШСЯ</span>
            <h3>Перший крок до FocusBoard</h3>
            <ul>
              {objectives.map((objective) => (
                <li key={objective}>{objective}</li>
              ))}
            </ul>
            <span className="small-tag">
              Орієнтовно {durationMinutes} хвилин
            </span>
            <div className="aside-divider" />
            <p>
              Відповіді, результат quiz і вибрана вкладка зберігаються в цьому
              браузері. Перед виходом дочекайся збереження навчального стану.
            </p>
            <p>
              Файли та завершення уроку зберігаються локально в цьому браузері.
              Після успішного Check підтвердь завершення. Наступні матеріали
              поки заблоковані.
            </p>
          </aside>
        </div>
      </TabsContent>
      <TabsContent
        value="practice"
        forceMount
        hidden={
          state.tab !== "practice" || !state.theoryPassed || !learning.ready
        }
        ref={practiceRef}
        tabIndex={-1}
      >
        <>
          <article className="theory-content">{challenge}</article>
          <section className="lesson-hints" aria-labelledby="hints-heading">
            <h3 id="hints-heading">
              <Lightbulb size={19} aria-hidden="true" />
              Підказки крок за кроком
            </h3>
            <ol aria-live="polite">
              {hints.slice(0, visibleHints).map((hint) => (
                <li key={hint}>{hint}</li>
              ))}
            </ol>
            {visibleHints < hints.length ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setVisibleHints((value) => value + 1)}
              >
                Показати підказку {visibleHints + 1} з {hints.length}
              </Button>
            ) : (
              <p className="muted">Усі три підказки відкрито.</p>
            )}
          </section>
          <LessonWorkspace
            workspace={workspace}
            editablePaths={editablePaths}
            visible={
              state.tab === "practice" && state.theoryPassed && learning.ready
            }
          />
        </>
      </TabsContent>
      <TabsContent value="tests">
        <CheckResults workspace={workspace} />
        <Button
          variant="outline"
          disabled={learningDisabled}
          onClick={() => {
            focusPractice.current = true;
            dispatch({ type: "tab", tab: "practice" });
          }}
        >
          Повернутися до коду
        </Button>
      </TabsContent>
    </Tabs>
  );
}
