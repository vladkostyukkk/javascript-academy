import { describe, expect, it } from "vitest";
import { inheritCheckpointFiles } from "@/lib/progress/inheritance";
import type { CompletedCheckpoint } from "@/lib/progress/checkpoint-schema";

const source: CompletedCheckpoint = {
  schemaVersion: 1,
  lessonId: "js-01",
  courseContentVersion: 1,
  sourceRevision: 3,
  sourceToken: "550e8400-e29b-41d4-a716-446655440000",
  completedAt: "2026-11-17T12:00:00.000Z",
  passedCheckIds: ["name", "console"],
  fileMap: [
    { path: "index.html", content: "<main>FocusBoard</main>" },
    { path: "styles.css", content: "body {}" },
    {
      path: "src/app.js",
      content: '// My own solution\nconst appName = "FocusBoard";',
    },
  ],
};
const target = {
  meta: {
    id: "js-02",
    number: 2,
    title: "Змінні",
    module: 1,
    prerequisites: ["js-01"],
    durationMinutes: 25,
    objectives: ["Оголосити змінну", "Оновити значення"],
    editablePaths: ["src/app.js"],
    courseContentVersion: 1,
  },
  starter: source.fileMap.map((file) => ({
    ...file,
    content: file.path === "src/app.js" ? "// official starter" : file.content,
  })),
};
describe("checkpoint inheritance preparation", () => {
  it("preserves learner code and does not mutate either input", () => {
    const before = structuredClone({ source, target });
    const files = inheritCheckpointFiles(source, target, 1);
    expect(files).toEqual(source.fileMap);
    files[2].content = "changed";
    expect({ source, target }).toEqual(before);
  });
  it("adds new paths without replacing existing files", () => {
    const files = inheritCheckpointFiles(
      source,
      {
        ...target,
        starter: [...target.starter, { path: "src/new.js", content: "// new" }],
      },
      1,
    );
    expect(files).toEqual([
      ...source.fileMap,
      { path: "src/new.js", content: "// new" },
    ]);
  });
  it("rejects skipped lessons and incompatible versions", () => {
    expect(() =>
      inheritCheckpointFiles(
        source,
        { ...target, meta: { ...target.meta, id: "js-03", number: 3 } },
        1,
      ),
    ).toThrow(/попереднього/);
    expect(() => inheritCheckpointFiles(source, target, 2)).toThrow(/Версія/);
  });
  it("rejects readonly replacement and missing learner paths", () => {
    expect(() =>
      inheritCheckpointFiles(
        source,
        {
          ...target,
          starter: target.starter.map((file) => ({
            ...file,
            content: file.path === "styles.css" ? "new" : file.content,
          })),
        },
        1,
      ),
    ).toThrow(/основа/);
    expect(() =>
      inheritCheckpointFiles(
        {
          ...source,
          fileMap: [
            ...source.fileMap,
            { path: "src/extra.js", content: "// keep" },
          ],
        },
        target,
        1,
      ),
    ).toThrow(/вилучає/);
  });
});
