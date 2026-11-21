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

const titles = {
  id: "titles",
  kind: "bindingStructure",
  binding: "taskTitles",
  expected: ["Ранок", "Пауза"],
  feedback: "Перевір порядок назв.",
} satisfies LessonCheck;
const find = {
  id: "find-missing",
  kind: "callStructure",
  binding: "findTaskById",
  args: [99],
  expected: { $undefined: true },
  feedback: "Поверни undefined, якщо задачі немає.",
} satisfies LessonCheck;

test("structural Check compares own data and keeps exceptions local", async ({
  page,
}) => {
  const run = await createLessonRunner(page);
  const source = files(`
    const taskTitles = ["Ранок", "Пауза"];
    const updatedTaskTitles = [, "Пауза"];
    const firstTask = {minutes: 0, title: "Пауза"};
    const secondTask = Object.create({title: "Пауза"});
    secondTask.minutes = 0;
    let getterReads = 0;
    const thirdTask = {
      minutes: 0,
      get title() { getterReads++; return "Пауза"; },
    };
    function getTaskStats() {
      return thirdTask;
    }
    function findTaskById(id) {
      if (id === 1) return firstTask;
      if (id === 0) return null;
      if (id < 0) throw new Error("Неприпустимий ID");
      taskTitles.reverse();
    }
    function countCompleted() { return getterReads; }
  `);
  const task = { title: "Пауза", minutes: 0 };
  const checks: LessonCheck[] = [
    find,
    titles,
    { ...titles, id: "wrong-order", expected: ["Пауза", "Ранок"] },
    {
      ...titles,
      id: "sparse-array",
      binding: "updatedTaskTitles",
      expected: [null, "Пауза"],
    },
    { ...titles, id: "record", binding: "firstTask", expected: task },
    { ...titles, id: "inherited", binding: "secondTask", expected: task },
    { ...titles, id: "getter", binding: "thirdTask", expected: task },
    { ...titles, id: "absent-binding", binding: "updatedTask", expected: {} },
    { ...find, id: "actual-null", args: [0], expected: null },
    { ...find, id: "null-is-defined", args: [0] },
    { ...find, id: "missing-call", binding: "getTaskTitleAt" },
    { ...find, id: "throw", args: [-1] },
    {
      ...find,
      id: "different-type",
      args: [1],
      expected: { ...task, minutes: "0" },
    },
    { ...find, id: "returned-record", args: [1], expected: task },
    {
      ...find,
      id: "returned-getter",
      binding: "getTaskStats",
      args: [],
      expected: task,
    },
    {
      ...find,
      id: "no-getter-reads",
      binding: "countCompleted",
      args: [],
      expected: 0,
    },
  ];
  const result = (await run(source, checks)).at(-1);
  expect(result?.kind).toBe("execution");
  if (result?.kind !== "execution") return;
  expect(result.checks.map(({ id }) => id)).toEqual(checks.map(({ id }) => id));
  expect(
    result.checks.filter(({ passed }) => passed).map(({ id }) => id),
  ).toEqual([
    "find-missing",
    "titles",
    "record",
    "actual-null",
    "returned-record",
    "no-getter-reads",
  ]);
  expect(result.checks.find(({ id }) => id === "throw")).toEqual({
    id: "throw",
    passed: false,
    feedback: find.feedback,
  });
});

test("structural probes check mutation and a separate copy only during Check", async ({
  page,
}) => {
  const run = await createLessonRunner(page);
  const source = files(`
    function addTaskTitleAt(titles, index, title) {
      console.log("probe");
      if (index >= 0) titles.splice(index, 0, title);
      return true;
    }
    function setTaskStatus(task, status) {
      task.status = status;
    }
    function updateTask(task, status) {
      if (status === "Аліас") return task;
      if (status === "Мутація") task.status = "Готово";
      return {...task, status: "Готово"};
    }
    function sortTasksByPriority(tasks, alias) {
      if (alias) return tasks;
      return [...tasks].sort((a, b) => b.priority - a.priority);
    }
  `);
  const task = { title: "Пауза", status: "У роботі", minutes: 0 };
  const doneTask = { ...task, status: "Готово" };
  const add = {
    id: "add",
    kind: "callStructure",
    binding: "addTaskTitleAt",
    args: [["Ранок"], 1, "Пауза"],
    expected: true,
    firstArgAfter: ["Ранок", "Пауза"],
    feedback: "Додай нову назву до переданого масиву.",
  } satisfies LessonCheck;
  const change = {
    id: "change",
    kind: "callStructure",
    binding: "setTaskStatus",
    args: [task, "Готово"],
    expected: { $undefined: true },
    firstArgAfter: doneTask,
    feedback: "Онови статус у переданому об’єкті.",
  } satisfies LessonCheck;
  const copy = {
    id: "copy",
    kind: "callStructure",
    binding: "updateTask",
    args: [task, "Готово"],
    expected: doneTask,
    returnsCopy: true,
    feedback: "Поверни копію і збережи вихідну задачу.",
  } satisfies LessonCheck;
  const sort = {
    id: "empty-copy",
    kind: "callStructure",
    binding: "sortTasksByPriority",
    args: [[]],
    expected: [],
    returnsCopy: true,
    feedback: "Повертай новий масив навіть для порожнього списку.",
  } satisfies LessonCheck;
  const checks: LessonCheck[] = [
    add,
    { ...add, id: "truthy-without-mutation", args: [["Ранок"], -1, "Пауза"] },
    change,
    { ...change, id: "wrong-postcondition", firstArgAfter: task },
    copy,
    { ...copy, id: "copy-of-same-value", args: [doneTask, "Готово"] },
    { ...copy, id: "alias", args: [doneTask, "Аліас"] },
    { ...copy, id: "mutated-original", args: [task, "Мутація"] },
    sort,
    { ...sort, id: "empty-alias", args: [[], true] },
    {
      ...sort,
      id: "sorted-copy",
      args: [
        [
          { title: "Пауза", priority: 0 },
          { title: "Ранок", priority: 2 },
        ],
      ],
      expected: [
        { title: "Ранок", priority: 2 },
        { title: "Пауза", priority: 0 },
      ],
    },
  ];
  expect(await run(source, checks, "run")).toEqual([
    { kind: "ready" },
    { kind: "execution", operation: "run", checks: [] },
  ]);
  const result = (await run(source, checks)).at(-1);
  expect(result?.kind).toBe("execution");
  if (result?.kind !== "execution") return;
  expect(result.checks.map(({ id }) => id)).toEqual(checks.map(({ id }) => id));
  expect(
    result.checks.filter(({ passed }) => passed).map(({ id }) => id),
  ).toEqual([
    "add",
    "change",
    "copy",
    "copy-of-same-value",
    "empty-copy",
    "sorted-copy",
  ]);
  expect(result.checks.find(({ id }) => id === "mutated-original")).toEqual({
    id: "mutated-original",
    passed: false,
    feedback: copy.feedback,
  });
});
