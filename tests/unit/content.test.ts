import { readdir } from "node:fs/promises";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeAll, describe, expect, it } from "vitest";
import manifestInput from "@/curriculum/manifest.json";
import { createLessonRegistry, canReadTheory } from "@/lib/lessons/registry";
import {
  validateContentPaths,
  readLessonBundle,
  readValidatedCourseContent,
} from "@/lib/lessons/content-files";
import {
  validateLessonBundle,
  type LessonBundle,
} from "@/lib/lessons/content-validation";
import {
  fileMapSchema,
  quizSchema,
  virtualPathSchema,
} from "@/lib/lessons/schema";
import { validateMarkdown, safeMarkdownUrl } from "@/lib/lessons/markdown";
import { TheoryMarkdown } from "@/components/course/theory-markdown";

let bundle: LessonBundle;
beforeAll(async () => {
  bundle = await readLessonBundle("js-01");
});
const summary = createLessonRegistry(manifestInput, ["js-01"]).lessons[0];

describe("registry boundaries", () => {
  it.each([
    [
      "missing ID",
      (input: typeof manifestInput) => {
        input.lessons.pop();
      },
    ],
    [
      "duplicate ID",
      (input: typeof manifestInput) => {
        input.lessons[1].id = "js-01";
      },
    ],
    [
      "reordered lessons",
      (input: typeof manifestInput) => {
        [input.lessons[0], input.lessons[1]] = [
          input.lessons[1],
          input.lessons[0],
        ];
      },
    ],
    [
      "wrong number",
      (input: typeof manifestInput) => {
        input.lessons[3].number = 5;
      },
    ],
    [
      "future prerequisite",
      (input: typeof manifestInput) => {
        input.lessons[1].prerequisites = ["js-03"];
      },
    ],
    [
      "first prerequisite",
      (input: typeof manifestInput) => {
        input.lessons[0].prerequisites = ["js-60"];
      },
    ],
    [
      "wrong module",
      (input: typeof manifestInput) => {
        input.lessons[10].module = 1;
      },
    ],
    [
      "unknown file",
      (input: typeof manifestInput) => {
        input.lessons[1].primaryFile = "../secret.js";
      },
    ],
    [
      "misplaced export",
      (input: typeof manifestInput) => {
        input.lessons[0].primaryFile = "project-export";
      },
    ],
  ] as const)("rejects %s", (_name, mutate) => {
    const input = structuredClone(manifestInput);
    mutate(input);
    expect(() => createLessonRegistry(input, ["js-01"])).toThrow();
  });

  it("rejects unknown, duplicate and missing published content registrations", () => {
    expect(() => createLessonRegistry(manifestInput, ["js-61"])).toThrow();
    expect(() =>
      createLessonRegistry(manifestInput, ["js-01", "js-01"]),
    ).toThrow();
    const input = structuredClone(manifestInput);
    input.lessons[1].status = "published";
    expect(() => createLessonRegistry(input, ["js-01"])).toThrow(/матеріалів/);
  });

  it("content availability is separate from the client prerequisite gate", () => {
    const registry = createLessonRegistry(manifestInput, ["js-01", "js-02"]);
    expect(canReadTheory(registry.lessons[0])).toBe(true);
    expect(registry.lessons[1].contentAvailable).toBe(true);
    expect(canReadTheory(registry.lessons[1])).toBe(true);
    expect(canReadTheory(registry.lessons[2])).toBe(false);
  });
});

describe("complete lesson content", () => {
  it("loads the sample, checks its reference checksum and keeps planned lessons unpopulated", async () => {
    const content = await readValidatedCourseContent();
    expect(content).toHaveLength(20);
    expect(content[0].meta.id).toBe("js-01");
    expect(content[0].hints).toHaveLength(3);
    expect(
      content[0].negativeCases.filter(({ category }) => category === "edge")
        .length,
    ).toBeGreaterThanOrEqual(2);
    expect(content[1].meta.id).toBe("js-02");
    expect(content[2].meta.id).toBe("js-03");
    expect(content[2].starter).toEqual(content[1].solution);
    expect(content[3].meta.id).toBe("js-04");
    expect(content[3].starter).toEqual(content[2].solution);
    expect(content[4].meta.id).toBe("js-05");
    expect(content[4].starter).toEqual(content[3].solution);
    for (let i = 5; i < content.length; i++) {
      expect(content[i].meta.id).toBe(`js-${String(i + 1).padStart(2, "0")}`);
      expect(content[i].starter).toEqual(content[i - 1].solution);
    }
    await expect(readLessonBundle("js-21")).rejects.toThrow(/не зареєстровано/);
    await expect(readLessonBundle("../js-01")).rejects.toThrow(/Невідомий ID/);
  });

  it("rejects missing fields, metadata mismatches, unsafe paths and stale checkpoints", () => {
    const invalidInputs = [
      { ...bundle, meta: { ...bundle.meta, durationMinutes: undefined } },
      { ...bundle, meta: { ...bundle.meta, id: "js-02" } },
      {
        ...bundle,
        meta: { ...bundle.meta, editablePaths: ["src/missing.js"] },
      },
      { ...bundle, meta: { ...bundle.meta, courseContentVersion: 2 } },
      { ...bundle, meta: { ...bundle.meta, objectives: [] } },
      { ...bundle, theory: "" },
      { ...bundle, hints: bundle.hints.slice(0, 2) },
      {
        ...bundle,
        solution: [...bundle.solution, { path: "src/new.js", content: "" }],
      },
      {
        ...bundle,
        solution: bundle.solution.map((file) => ({
          ...file,
          content: file.content + "\n",
        })),
      },
      {
        ...bundle,
        negativeCases: bundle.negativeCases.filter(
          ({ category }) => category !== "edge",
        ),
      },
      {
        ...bundle,
        negativeCases: bundle.negativeCases.map((scenario) => ({
          ...scenario,
          failedCheckIds: ["unknown"],
        })),
      },
    ];
    for (const input of invalidInputs)
      expect(() => validateLessonBundle(input, summary, 1)).toThrow();
  });

  it.each([
    "../src/app.js",
    "src/../app.js",
    "src\\app.js",
    "/src/app.js",
    "C:/app.js",
    "src/%2e%2e/app.js",
    "src/app.ts",
    "src/.hidden.js",
    "src/app.js?x=1",
    "https://example.com/app.js",
  ])("rejects virtual path %s", (value) => {
    expect(virtualPathSchema.safeParse(value).success).toBe(false);
  });

  it("rejects duplicate files and files exceeding the size budget", () => {
    expect(() =>
      fileMapSchema.parse([...bundle.starter, bundle.starter[0]]),
    ).toThrow();
    expect(() =>
      fileMapSchema.parse(
        bundle.starter.map((file) => ({
          ...file,
          content: "a".repeat(65_537),
        })),
      ),
    ).toThrow();
  });

  it("rejects unknown quiz answers, repeated choices and blank explanations", () => {
    for (const question of [
      { ...bundle.quiz[0], correctOptionId: "missing" },
      {
        ...bundle.quiz[0],
        options: [bundle.quiz[0].options[0], bundle.quiz[0].options[0]],
      },
      {
        ...bundle.quiz[0],
        options: bundle.quiz[0].options.map((option) => ({
          ...option,
          explanation: "",
        })),
      },
    ])
      expect(() =>
        quizSchema.parse([question, ...bundle.quiz.slice(1)]),
      ).toThrow();
  });

  it("rejects missing documents and unregistered paths in a real file inventory", async () => {
    const root = path.join(process.cwd(), "content", "lessons", "js-01");
    const entries = await readdir(root, {
      recursive: true,
      withFileTypes: true,
    });
    const files = entries
      .filter((entry) => entry.isFile())
      .map((entry) =>
        path
          .relative(root, path.join(entry.parentPath, entry.name))
          .replaceAll("\\", "/"),
      );
    expect(() => validateContentPaths(files, "js-01")).not.toThrow();
    expect(() =>
      validateContentPaths([...files, "unknown.json"], "js-01"),
    ).toThrow(/невідомий шлях/);
    expect(() =>
      validateContentPaths(
        files.filter((file) => file !== "quiz.json"),
        "js-01",
      ),
    ).toThrow(/quiz.json/);
  });
});

describe("strict Markdown rendering", () => {
  it.each([
    "<script>alert(1)</script>",
    "<img src=x onerror=alert(1)>",
    "<Widget />",
    "[click](javascript:alert%281%29)",
    "[click](jav&#x61;script:alert%281%29)",
    "[click](data:text/html,hello)",
    "[click](//example.com)",
    "![tracking](https://example.com/pixel.png)",
    "# Duplicate page heading",
    "```jsx\n<Component />\n```",
    "   ",
  ])("rejects unsupported content: %s", (source) => {
    expect(() => validateMarkdown(source)).toThrow();
    expect(() =>
      renderToStaticMarkup(createElement(TheoryMarkdown, { source })),
    ).toThrow();
  });

  it("renders supported Markdown and escapes code instead of interpreting it", () => {
    const source =
      '## Теорія\n\n**Важливо**: `appName`\n\n- Крок один\n\n```html\n<script>alert("x")</script>\n```\n\n[Довідка](https://developer.mozilla.org/)';
    const html = renderToStaticMarkup(
      createElement(TheoryMarkdown, { source }),
    );
    expect(html).toContain("<h2>Теорія</h2>");
    expect(html).toContain("<strong>Важливо</strong>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
    expect(html).toContain('href="https://developer.mozilla.org/"');
    expect(safeMarkdownUrl("https://user:password@example.com")).toBe("");
    expect(safeMarkdownUrl("javascript:alert(1)")).toBe("");
  });
});
