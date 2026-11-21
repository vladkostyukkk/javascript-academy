import { describe, expect, it } from "vitest";
import { evaluateChecks } from "@/lib/lessons/checks";
import { checksSchema, type LessonCheck } from "@/lib/lessons/schema";
import { runnerFixtures } from "@/lib/runner/fixtures";
import { runInputSchema } from "@/lib/runner/protocol";
import { matchesStructure } from "@/lib/runner/structure";

const collection = {
  id: "collection",
  kind: "bindingStructure",
  binding: "taskTitles",
  expected: ["Задача", null, { title: "Пауза", minutes: 0 }],
  feedback: "Перевір порядок елементів.",
} satisfies LessonCheck;
const call = {
  id: "change",
  kind: "callStructure",
  binding: "setTaskStatus",
  args: [{ title: "Задача", status: "У роботі" }, "Готово"],
  expected: { $undefined: true },
  firstArgAfter: { title: "Задача", status: "Готово" },
  feedback: "Зміни статус у переданій задачі.",
} satisfies LessonCheck;
const copy = {
  id: "copy",
  kind: "callStructure",
  binding: "sortTasksByPriority",
  args: [[]],
  expected: [],
  returnsCopy: true,
  feedback: "Поверни новий масив.",
} satisfies LessonCheck;

describe("structural check plans", () => {
  it("uses the same JSON checks in content and runner input", () => {
    const checks = [
      collection,
      call,
      copy,
      {
        id: "stats",
        kind: "callStructure",
        binding: "getTaskStats",
        args: [],
        expected: null,
        feedback: "Поверни null.",
      },
    ];
    const assertion = { kind: "lesson", operation: "check", checks };
    expect(checksSchema.parse(checks)).toEqual(checks);
    expect(
      runInputSchema.parse({
        ...runnerFixtures[0].positive,
        mode: "lesson",
        assertion,
      }).assertion,
    ).toEqual(assertion);
  });

  it.each([
    ["an expression", { ...copy, binding: "sortTasksByPriority()" }],
    ["a property path", { ...collection, binding: "tasks.length" }],
    ["unknown fields", { ...copy, expression: "return []" }],
    ["primitive binding expectations", { ...collection, expected: null }],
    ["oversized arrays", { ...collection, expected: Array(13).fill(0) }],
    ["sparse arrays", { ...collection, expected: [, "Задача"] }],
    ["nested arrays", { ...collection, expected: [["Задача"]] }],
    ["nested records", { ...collection, expected: { task: { title: "" } } }],
    [
      "oversized records",
      {
        ...collection,
        expected: { a: 0, b: 0, c: 0, d: 0, e: 0, f: 0, g: 0, h: 0, i: 0 },
      },
    ],
    ["prototype keys", { ...collection, expected: { prototype: null } }],
    ["constructor keys", { ...collection, expected: { constructor: null } }],
    ["__proto__ keys", { ...collection, expected: { ["__proto__"]: null } }],
    ["invalid field names", { ...collection, expected: { "bad-key": 1 } }],
    ["oversized strings", { ...collection, expected: ["а".repeat(129)] }],
    ["non-finite numbers", { ...collection, expected: [Infinity] }],
    ["too many arguments", { ...call, args: [[], 1, false, null] }],
    ["undefined arguments", { ...copy, args: [[], undefined] }],
    [
      "undefined markers in arguments",
      { ...copy, args: [[], { $undefined: true }] },
    ],
    ["undefined results without a marker", { ...call, expected: undefined }],
    ["false undefined markers", { ...call, expected: { $undefined: false } }],
    [
      "extra fields in undefined markers",
      { ...call, expected: { $undefined: true, title: "" } },
    ],
    ["conflicting postconditions", { ...copy, firstArgAfter: [] }],
    ["mutation of a primitive", { ...call, args: [null, "Готово"] }],
    ["copy of a missing argument", { ...copy, args: [] }],
    ["copy result of another type", { ...copy, expected: {} }],
    ["copy result as a primitive", { ...copy, expected: 1 }],
    [
      "copy result as an undefined marker",
      { ...copy, expected: { $undefined: true } },
    ],
    [
      "combined data exceeding 4 KiB",
      {
        ...copy,
        args: [Array(12).fill("а".repeat(128))],
        expected: Array(12).fill("а".repeat(128)),
      },
    ],
  ])("rejects %s", (_, check) => {
    expect(
      checksSchema.safeParse([{ ...collection, id: "valid" }, check]).success,
    ).toBe(false);
  });

  it("requires the undefined marker to be a single own data field", () => {
    const accessor = Object.defineProperty({}, "$undefined", {
      enumerable: true,
      get: () => {
        throw new Error("Викликано getter маркера.");
      },
    });
    for (const expected of [
      accessor,
      Object.create({ $undefined: true }),
      Object.defineProperty({ $undefined: true }, "extra", { value: 1 }),
      { $undefined: true, [Symbol()]: true },
    ]) {
      expect(
        checksSchema.safeParse([collection, { ...call, expected }]).success,
      ).toBe(false);
    }
  });

  it("reads only recorded Boolean verdicts from author observations", () => {
    const checks = [collection, call, copy];
    const probeResults = Object.assign(Object.create({ copy: true }), {
      collection: true,
      change: false,
    }) as Record<string, boolean>;
    const observation = { bindings: {}, logs: [], probeResults };
    expect(
      evaluateChecks(checks, observation).map(({ passed }) => passed),
    ).toEqual([true, false, false]);
    expect(
      evaluateChecks(checks, { ...observation, runtimeError: "Помилка" }).map(
        ({ passed }) => passed,
      ),
    ).toEqual([false, false, false]);
  });
});

describe("structural matching", () => {
  it("requires array order and compares record keys independently of order", () => {
    const expected = [{ title: "Пауза", minutes: 0 }, false, null];
    expect(
      matchesStructure([{ minutes: 0, title: "Пауза" }, false, null], expected),
    ).toBe(true);
    expect(
      matchesStructure([false, { minutes: 0, title: "Пауза" }, null], expected),
    ).toBe(false);
    expect(
      matchesStructure(
        [{ minutes: "0", title: "Пауза" }, false, null],
        expected,
      ),
    ).toBe(false);
    expect(matchesStructure([], [])).toBe(true);
    expect(matchesStructure({}, [])).toBe(false);
    expect(matchesStructure(undefined, null)).toBe(false);
  });

  it("accepts own data on a null-prototype record and rejects different key sets", () => {
    const expected = { title: "Пауза", minutes: 0 };
    const record: unknown = Object.assign(Object.create(null), expected);
    const inherited: unknown = Object.assign(
      Object.create({ title: "Пауза" }),
      { minutes: 0 },
    );
    expect(matchesStructure(record, expected)).toBe(true);
    expect(matchesStructure(inherited, expected)).toBe(false);
    expect(matchesStructure({ title: "Пауза" }, expected)).toBe(false);
    expect(matchesStructure({ ...expected, draft: false }, expected)).toBe(
      false,
    );
    expect(matchesStructure({ ...expected, [Symbol()]: null }, expected)).toBe(
      false,
    );
  });

  it("requires dense own data array entries and never reads ordinary accessors", () => {
    const getter = () => {
      throw new Error("Викликано getter.");
    };
    const record = Object.defineProperty({}, "title", {
      get: getter,
      enumerable: true,
    });
    const array = Object.defineProperty([], "0", {
      get: getter,
      enumerable: true,
    });
    const hidden = Object.defineProperty({}, "title", { value: "Пауза" });
    expect(matchesStructure(record, { title: "Пауза" })).toBe(false);
    expect(matchesStructure(array, ["Пауза"])).toBe(false);
    expect(matchesStructure(hidden, { title: "Пауза" })).toBe(false);
    expect(matchesStructure([, "Пауза"], [null, "Пауза"])).toBe(false);
    expect(
      matchesStructure(Object.assign(["Пауза"], { draft: true }), ["Пауза"]),
    ).toBe(false);
  });
});
