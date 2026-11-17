import { describe, expect, it } from "vitest";
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
