import { expect, test } from "@playwright/test";
import type { FileMap, LessonCheck } from "../../lib/lessons/schema";
import { createLessonRunner } from "./helpers/lesson-runner";

function files(content: string): FileMap {
  return [
    { path: "index.html", content: "<main><h1>FocusBoard</h1></main>" },
    { path: "styles.css", content: "" },
    { path: "src/app.js", content },
  ];
}

const bindingCheck = {
  id: "label",
  kind: "bindingEquals",
  binding: "label",
  expected: "FocusBoard",
  feedback: "Збережи початкову назву застосунку.",
} satisfies LessonCheck;
const minuteCheck = {
  id: "minutes",
  kind: "callEquals",
  binding: "formatMinutes",
  args: [],
  expected: 0,
  feedback: "Функція має повернути нуль.",
} satisfies LessonCheck;

test("Check calls functions strictly while Run executes only the program", async ({
  page,
}) => {
  const run = await createLessonRunner(page);
  const consoleCheck = {
    id: "console-early",
    kind: "consoleEquals",
    expected: [["FocusBoard"]],
    feedback: "Прибери зайве виведення.",
  } satisfies LessonCheck;
  const taskCheck = {
    id: "task-default",
    kind: "callEquals",
    binding: "formatTaskText",
    args: ["Чернетка"],
    expected: "Чернетка · 30 хв",
    feedback: "Використовуй 30 хв, якщо тривалість пропущено.",
  } satisfies LessonCheck;
  const titleCheck = {
    id: "title-null",
    kind: "callEquals",
    binding: "validateTitle",
    args: [null],
    expected: null,
    feedback: "Поверни значення null.",
  } satisfies LessonCheck;
  const checks: LessonCheck[] = [
    consoleCheck,
    bindingCheck,
    taskCheck,
    {
      ...taskCheck,
      id: "task-zero",
      args: ["Пауза", 0],
      expected: "Пауза · 0 хв",
    },
    titleCheck,
    { ...titleCheck, id: "title-string", args: ["текст"] },
    { ...titleCheck, id: "title-undefined", args: [false] },
    { ...titleCheck, id: "title-promise", args: [0] },
    { ...titleCheck, id: "title-throw", args: ["викинь помилку"] },
    { ...taskCheck, id: "not-callable", binding: "getPriorityLabel" },
    minuteCheck,
    { ...consoleCheck, id: "console-late" },
    {
      ...consoleCheck,
      id: "console-full",
      expected: [["FocusBoard"], ["probe"]],
    },
  ];
  const source = files(`
    let label = "FocusBoard";
    console.log(label);
    const formatTaskText = (title, minutes = 30) => title + " · " + minutes + " хв";
    const getPriorityLabel = "Не функція";
    function validateTitle(title) {
      if (title === "викинь помилку") throw new Error("Синхронний виняток");
      if (title === "текст") return "null";
      if (title === false) return;
      if (title === 0) return Promise.resolve(null);
      return null;
    }
    function formatMinutes() {
      label = "Після виклику";
      queueMicrotask(() => console.log("probe"));
      return 0;
    }
  `);

  const running = await run(source, checks, "run");
  expect(running.filter(({ kind }) => kind === "log")).toEqual([
    { kind: "log", level: "log", text: "FocusBoard" },
  ]);
  expect(running.at(-1)).toEqual({
    kind: "execution",
    operation: "run",
    checks: [],
  });

  const checking = await run(source, checks);
  const result = checking.at(-1);
  expect(result?.kind).toBe("execution");
  if (result?.kind !== "execution") return;
  expect(
    result.checks.filter(({ passed }) => passed).map(({ id }) => id),
  ).toEqual([
    "label",
    "task-default",
    "task-zero",
    "title-null",
    "minutes",
    "console-full",
  ]);
  expect(result.checks.find(({ id }) => id === "title-throw")).toEqual({
    id: "title-throw",
    passed: false,
    feedback: titleCheck.feedback,
  });
});

test("Check requires two independent generators with interleaved calls", async ({
  page,
}) => {
  const run = await createLessonRunner(page);
  const generatorCheck = {
    id: "ids",
    kind: "generatorSequence",
    feedback: "Лічильник кожного генератора має починатися з одиниці.",
  } satisfies LessonCheck;
  const checks: LessonCheck[] = [bindingCheck, generatorCheck];

  for (const [implementation, passed] of [
    ["function createIdGenerator() { let n = 0; return () => ++n; }", true],
    ["let n = 0; const createIdGenerator = () => () => ++n;", false],
    ["const createIdGenerator = () => () => 1;", false],
    ["const createIdGenerator = () => 1;", false],
    [
      "const createIdGenerator = () => { let n = 0; return () => String(++n); };",
      false,
    ],
  ] as const) {
    const events = await run(
      files(`const label = "FocusBoard";\n${implementation}`),
      checks,
    );
    expect(events.at(-1), implementation).toMatchObject({
      kind: "execution",
      operation: "check",
      checks: [
        { id: "label", passed: true },
        {
          id: "ids",
          passed,
          ...(!passed && { feedback: generatorCheck.feedback }),
        },
      ],
    });
  }

  const order = await run(
    files(`
    let instances = 0;
    function createIdGenerator() {
      const instance = ++instances;
      console.log("factory", String(instance));
      let n = 0;
      return () => {
        n++;
        console.log(String(instance), String(n));
        return n;
      };
    }
  `),
    [
      generatorCheck,
      {
        id: "order",
        kind: "consoleEquals",
        expected: [
          ["factory", "1"],
          ["1", "1"],
          ["1", "2"],
          ["factory", "2"],
          ["2", "1"],
          ["1", "3"],
          ["2", "2"],
        ],
        feedback: "Перевір порядок викликів генераторів.",
      },
    ],
  );
  expect(order.at(-1)).toMatchObject({
    kind: "execution",
    checks: [
      { id: "ids", passed: true },
      { id: "order", passed: true },
    ],
  });
});

test("Check keeps output limits, queued errors and Worker deadlines for probes", async ({
  page,
}) => {
  const run = await createLessonRunner(page);
  const checks: LessonCheck[] = [bindingCheck, minuteCheck];
  const fixture = (body: string) =>
    files(`const label = "FocusBoard";\nfunction formatMinutes() { ${body} }`);

  const flood = await run(
    fixture('for (let i = 0; i < 40; i++) console.log("x"); return 0;'),
    checks,
  );
  expect(flood.filter(({ kind }) => kind === "log")).toHaveLength(40);
  expect(flood.at(-2)?.kind).toBe("limit");
  expect(flood.at(-1)).toMatchObject({
    kind: "execution",
    checks: checks.map(({ id }) => ({
      id,
      passed: false,
      feedback: expect.stringContaining("Забагато виведення"),
    })),
  });

  const rejected = await run(
    fixture('Promise.reject(new Error("Асинхронна помилка")); return 0;'),
    checks,
  );
  expect(rejected.at(-1)).toMatchObject({
    kind: "error",
    text: "Асинхронна помилка",
  });

  const pending = await run(fixture("while (true) {}"), checks);
  expect(pending.at(-1)).toMatchObject({
    kind: "timeout",
    text: expect.stringContaining("Worker зупинено"),
  });
});
