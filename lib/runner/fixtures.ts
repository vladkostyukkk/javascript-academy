import type { RunInput } from "./protocol";

export interface RunnerFixture {
  id: string;
  title: string;
  description: string;
  positive: RunInput;
  negative: RunInput;
}
function input(
  mode: RunInput["mode"],
  source: string,
  assertion: RunInput["assertion"],
  extra: RunInput["files"] = [],
): RunInput {
  return {
    mode,
    entry: "src/app.js",
    assertion,
    mock: { status: 200, delayMs: 20 },
    files: [
      {
        path: "index.html",
        content:
          '<main><h1>FocusBoard</h1><p id="output">Ще немає задач</p></main>',
      },
      {
        path: "styles.css",
        content:
          "body { font: 16px system-ui; background: #f5f8ef; color: #172313; padding: 20px; }",
      },
      { path: "src/app.js", content: source },
      ...extra,
    ],
  };
}
function changed(plan: RunInput, source: string): RunInput {
  return {
    ...plan,
    files: plan.files.map((file) =>
      file.path === plan.entry ? { ...file, content: source } : file,
    ),
  };
}
const pure = input(
  "pure",
  'function sum(a, b) { return a + b; }\nconsole.log("Сума", sum(2, 3));\nreturn sum(2, 3);',
  { kind: "result", expected: 5 },
);
const dom = input(
  "classic",
  'document.querySelector("#output").textContent = "Задач: 2";\nconsole.info("DOM оновлено");',
  { kind: "text", selector: "#output", expected: "Задач: 2" },
);
const modules = input(
  "module",
  'import { label } from "./labels.js";\nexport function count() { return 2; }\nexport const result = label();\nconsole.log(result);',
  { kind: "result", expected: "Задач: 2" },
  [
    {
      path: "src/labels.js",
      content:
        'import { count } from "./app.js";\nexport function label() { return `Задач: ${count()}`; }',
    },
  ],
);
const asyncPlan = input(
  "module",
  'const response = await fetch("/mock/tasks.json");\nif (!response.ok) throw new Error(`Mock API: HTTP ${response.status}`);\nconst tasks = await response.json();\nexport const result = tasks.length;\nconsole.log("Отримано задач:", result);\ndocument.querySelector("#output").textContent = `Задач: ${result}`;',
  { kind: "result", expected: 2 },
  [
    {
      path: "mock/tasks.json",
      content:
        '[{"id":"a","title":"Вивчити JS"},{"id":"b","title":"Зібрати FocusBoard"}]',
    },
  ],
);

export const runnerFixtures: RunnerFixture[] = [
  {
    id: "pure",
    title: "A · Обчислення",
    description:
      "Console, return і перевірка результату у Worker всередині sandbox.",
    positive: pure,
    negative: changed(pure, 'console.log("Хибна сума"); return 4;'),
  },
  {
    id: "dom",
    title: "B · DOM",
    description: "Класичний JavaScript змінює текст ізольованого FocusBoard.",
    positive: dom,
    negative: changed(
      dom,
      'document.querySelector("#output").textContent = "Задач: 0";',
    ),
  },
  {
    id: "modules",
    title: "C · ES modules",
    description:
      "Два модулі імпортують один одного відносними віртуальними шляхами.",
    positive: modules,
    negative: changed(
      modules,
      'import { missing } from "./labels.js"; export const result = missing();',
    ),
  },
  {
    id: "async",
    title: "D · Mock fetch",
    description:
      "Promise, top-level await і детермінований GET /mock/tasks.json.",
    positive: asyncPlan,
    negative: { ...asyncPlan, mock: { status: 503, delayMs: 20 } },
  },
];

const probes: Array<
  [string, string, string, RunInput["mode"], string | number]
> = [
  [
    "isolation",
    "Доступ до платформи",
    `let blocked = 0;
for (const attempt of [() => parent.document.body, () => localStorage.getItem("academy"), () => { top.location.href = "https://example.invalid/escape"; }]) {
  try { attempt(); } catch { blocked++; }
}
if (window.open("https://example.invalid/popup") === null) blocked++;
export const result = blocked;`,
    "module",
    4,
  ],
  [
    "network",
    "Мережа та embeds",
    `let blocked = 0;
try { await fetch("https://example.invalid/leak"); } catch { blocked++; }
await new Promise(resolve => { const xhr = new XMLHttpRequest(); xhr.open("GET", "https://example.invalid/xhr"); xhr.onerror = () => { blocked++; resolve(); }; xhr.send(); });
await new Promise(resolve => { const image = new Image(); image.onerror = () => { blocked++; resolve(); }; image.src = "https://example.invalid/image"; });
const frame = document.createElement("iframe"); frame.src = "https://example.invalid/frame"; document.body.append(frame);
const form = document.createElement("form"); form.action = "https://example.invalid/form"; document.body.append(form); form.submit();
export const result = blocked;`,
    "module",
    3,
  ],
  [
    "abort",
    "Скасування mock-запиту",
    'const controller = new AbortController(); const pending = fetch("/mock/tasks.json", { signal: controller.signal }); controller.abort(); let name; try { await pending; } catch (error) { name = error.name; } export const result = name;',
    "module",
    "AbortError",
  ],
  [
    "runtime-error",
    "Помилка виконання",
    'throw new Error("Навмисна помилка FocusBoard");',
    "pure",
    0,
  ],
  [
    "worker-network",
    "Мережа Worker",
    'let blocked = 0; await new Promise(resolve => { const xhr = new XMLHttpRequest(); xhr.open("GET", "https://example.invalid/worker"); xhr.onerror = () => { blocked++; resolve(); }; xhr.send(); }); return blocked;',
    "pure",
    1,
  ],
  [
    "large-output",
    "Довге виведення",
    'console.log("x".repeat(100000)); return "y".repeat(2000);',
    "pure",
    0,
  ],
  ["syntax-error", "Синтаксична помилка", "const broken = ;", "pure", 0],
  [
    "rejection",
    "Відхилений Promise",
    'Promise.reject(new Error("Відхилений Promise")); return 1;',
    "pure",
    1,
  ],
  [
    "flood",
    "Ліміт консолі",
    "for (let i = 0; i < 10000; i++) console.log(i); return 10000;",
    "pure",
    10000,
  ],
  [
    "xss",
    "Виведення як текст",
    'console.log("<img src=x onerror=alert(1)>"); return "<script>alert(1)</script>";',
    "pure",
    "<script>alert(1)</script>",
  ],
  ["loop", "Нескінченний цикл Worker", "while (true) {}", "pure", 0],
  [
    "pending",
    "Незавершений async DOM",
    "await new Promise(() => {}); export const result = 0;",
    "module",
    0,
  ],
];
export const securityFixtures = probes.map(
  ([id, title, source, mode, expected]) => ({
    id,
    title,
    plan: input(mode, source, { kind: "result", expected }),
  }),
);
