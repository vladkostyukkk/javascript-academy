import { describe, expect, it } from "vitest";
import { evaluateChecks } from "@/lib/lessons/checks";
import { checksSchema, type LessonCheck } from "@/lib/lessons/schema";
import {
  acceptMessage,
  envelopeSchema,
  runInputSchema,
} from "@/lib/runner/protocol";
import { prepareRun, resolveModule } from "@/lib/runner/prepare";
import { createSandboxDocument, sandboxPolicy } from "@/lib/runner/document";
import { runnerFixtures } from "@/lib/runner/fixtures";

const identity = {
  runId: "550e8400-e29b-41d4-a716-446655440000",
  nonce: "a".repeat(32),
};
const data = {
  channel: "academy-runner-v1",
  ...identity,
  payload: { kind: "ready" },
};
const source = {} as MessageEventSource;
const callCheck = {
  id: "title",
  kind: "callEquals",
  binding: "validateTitle",
  args: ["Завдання"],
  expected: null,
  feedback: "Функція має повернути null для коректної назви.",
} satisfies LessonCheck;
const generatorCheck = {
  id: "ids",
  kind: "generatorSequence",
  feedback: "Кожен генератор має власний лічильник.",
} satisfies LessonCheck;

describe("runner protocol boundary", () => {
  it("requires exact source, opaque origin, nonce, runId and strict schema", () => {
    const event = { source, origin: "null", data };
    expect(acceptMessage(event, source, identity)).toEqual({ kind: "ready" });
    for (const invalid of [
      { ...event, source: {} as MessageEventSource },
      { ...event, source: null },
      { ...event, origin: "https://academy.test" },
      { ...event, data: { ...data, nonce: "b".repeat(32) } },
      { ...event, data: { ...data, runId: crypto.randomUUID() } },
      {
        ...event,
        data: { ...data, payload: { kind: "unlock", lessonId: "js-02" } },
      },
      { ...event, data: { ...data, extra: "unexpected" } },
    ])
      expect(acceptMessage(invalid, source, identity)).toBeNull();
    expect(acceptMessage(event, null, identity)).toBeNull();
  });
  it("rejects oversized, malformed and unbounded output", () => {
    for (const payload of [
      { kind: "log", level: "log", text: "x".repeat(1025) },
      { kind: "result", passed: "true", actual: "5", feedback: "ok" },
      { kind: "error", text: "bad", stack: "x".repeat(3001) },
      { kind: "log", level: "log", text: { html: "<b>" } },
    ])
      expect(envelopeSchema.safeParse({ ...data, payload }).success).toBe(
        false,
      );
  });
  it("accepts a bounded JSON plan for the four lesson functions and the fixed generator", () => {
    const checks = [
      {
        ...callCheck,
        id: "priority",
        binding: "getPriorityLabel",
        args: [false],
        expected: "Невідомий",
      },
      {
        ...callCheck,
        id: "task",
        binding: "formatTaskText",
        args: ["Завдання", 0],
        expected: "Завдання · 0 хв",
      },
      callCheck,
      {
        ...callCheck,
        id: "minutes",
        binding: "formatMinutes",
        args: [],
        expected: 0,
      },
      { ...callCheck, id: "missing-title", args: [null], expected: false },
      generatorCheck,
    ];
    const input = {
      ...runnerFixtures[0].positive,
      mode: "lesson",
      assertion: { kind: "lesson", operation: "check", checks },
    };
    expect(runInputSchema.parse(input).assertion).toEqual(input.assertion);
  });
  it("rejects non-primitive, oversized or executable probe plans", () => {
    for (const check of [
      { ...callCheck, binding: "constructor" },
      { ...callCheck, expression: "validateTitle()" },
      { ...callCheck, args: [1, 2, 3] },
      { ...callCheck, args: [{}] },
      { ...callCheck, args: [[]] },
      { ...callCheck, args: [Infinity] },
      { ...callCheck, args: [undefined] },
      { ...callCheck, args: ["x".repeat(1001)] },
      { ...callCheck, expected: { value: null } },
      { ...callCheck, expected: NaN },
      { ...callCheck, expected: "x".repeat(1001) },
      { ...callCheck, expected: undefined },
      { ...generatorCheck, binding: "createIdGenerator" },
      { ...generatorCheck, expected: [1, 2, 1, 3, 2] },
    ])
      expect(
        checksSchema.safeParse([check, { ...callCheck, id: "other" }]).success,
      ).toBe(false);
  });
});
it("compares only recorded probe outcomes in the author harness", () => {
  const checks = [callCheck, generatorCheck];
  const observation = {
    bindings: {
      validateTitle: () => {
        throw new Error("Only the Worker may call learner functions.");
      },
    },
    logs: [],
  };
  expect(
    evaluateChecks(checks, observation).map(({ passed }) => passed),
  ).toEqual([false, false]);
  const observed = {
    ...observation,
    probeResults: { title: true, ids: false },
  };
  expect(evaluateChecks(checks, observed)).toEqual([
    { id: "title", passed: true, feedback: callCheck.feedback },
    { id: "ids", passed: false, feedback: generatorCheck.feedback },
  ]);
  expect(
    evaluateChecks(checks, { ...observed, runtimeError: "Помилка" }).map(
      ({ passed }) => passed,
    ),
  ).toEqual([false, false]);
});
describe("runner file preparation", () => {
  it("prepares all four fixtures and rewrites both sides of the cycle", async () => {
    for (const fixture of runnerFixtures) {
      const prepared = await prepareRun(fixture.positive);
      expect(prepared.files).toHaveLength(fixture.positive.files.length);
      if (fixture.id === "modules") {
        expect(
          prepared.files.find((file) => file.path === "src/app.js")?.content,
        ).toContain('"academy:/src/labels.js"');
        expect(
          prepared.files.find((file) => file.path === "src/labels.js")?.content,
        ).toContain('"academy:/src/app.js"');
      }
    }
  });
  it.each([
    "https://evil.test/a.js",
    "/src/app.js",
    "../../src/app.js",
    "./missing.js",
    "./%61pp.js",
    "./app.js?x",
    "./app.js#x",
    ".\\app.js",
    "react",
  ])("rejects import %s", (specifier) => {
    expect(() =>
      resolveModule(specifier, "src/app.js", new Set(["src/app.js"])),
    ).toThrow();
  });
  it.each([
    'import("./labels.js")',
    "import.meta.url",
    'import x from "./labels.js" with {type:"json"}',
  ])("rejects unsupported syntax %s", async (source) => {
    const plan = structuredClone(runnerFixtures[2].positive);
    plan.files.find((file) => file.path === plan.entry)!.content = source;
    await expect(prepareRun(plan)).rejects.toThrow();
  });
  it("does not rewrite string/comment text and handles escaped static specifiers", async () => {
    const plan = structuredClone(runnerFixtures[2].positive);
    plan.files.find((file) => file.path === plan.entry)!.content =
      'const text = "import evil"; // import bad\nimport {label} from "./labe\\u006cs.js";';
    const prepared = await prepareRun(plan);
    expect(
      prepared.files.find((file) => file.path === plan.entry)!.content,
    ).toBe(
      'const text = "import evil"; // import bad\nimport {label} from "academy:/src/labels.js";',
    );
  });
  it("rejects traversal, duplicate files and excess source sizes", () => {
    const plan = runnerFixtures[0].positive;
    for (const files of [
      [...plan.files, plan.files[0]],
      [...plan.files, { path: "../escape.js", content: "" }],
      plan.files.map((file) => ({ ...file, content: "x".repeat(65537) })),
    ])
      expect(runInputSchema.safeParse({ ...plan, files }).success).toBe(false);
  });
});
it("keeps source as escaped JSON behind nonce CSP", () => {
  const plan = structuredClone(runnerFixtures[0].positive);
  plan.files[0].content = "</script><script>parent.attack()</script>";
  const document = createSandboxDocument(
    "/* trusted bootstrap */",
    plan,
    identity,
  );
  expect(document.match(/<script /g)).toHaveLength(1);
  expect(document).not.toContain("<script>parent.attack()");
  expect(sandboxPolicy(identity.nonce)).toContain("connect-src 'none'");
  expect(sandboxPolicy(identity.nonce)).not.toContain("unsafe-eval");
  expect(sandboxPolicy(identity.nonce)).not.toContain("allow-same-origin");
});
