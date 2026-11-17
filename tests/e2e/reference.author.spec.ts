import { expect, test, type Page } from "@playwright/test";
import { readLessonBundle } from "../../lib/lessons/content-files";
import {
  evaluateChecks,
  type LessonObservation,
} from "../../lib/lessons/checks";
import type { FileMap } from "../../lib/lessons/schema";

// Author QA only. There is no application runner/API and no learner input here.
// Even these repository-owned fixtures execute exclusively in an opaque sandbox.
async function observeFixture(
  page: Page,
  files: FileMap,
): Promise<LessonObservation> {
  const file = (name: string) => {
    const found = files.find(({ path }) => path === name);
    if (!found) throw new Error(`Missing fixture file ${name}`);
    return found.content;
  };
  const policy =
    "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'";
  const capture = `globalThis.__sampleLogs = []; globalThis.__sampleError = undefined;
    console.log = (...args) => { if (globalThis.__sampleLogs.length < 20) globalThis.__sampleLogs.push(args); };
    addEventListener('error', event => { globalThis.__sampleError = event.message; event.preventDefault(); });`;
  const html = file("index.html")
    .replace(
      "<head>",
      `<head><meta http-equiv="Content-Security-Policy" content="${policy}">`,
    )
    .replace(
      '<link rel="stylesheet" href="styles.css" />',
      `<style>${file("styles.css")}</style>`,
    )
    .replace(
      '<script src="src/app.js"></script>',
      `<script>${capture}</script><script>${file("src/app.js")}</script>`,
    );
  await page.evaluate((srcdoc) => {
    const iframe = document.createElement("iframe");
    iframe.setAttribute("sandbox", "allow-scripts");
    iframe.title = "Еталон FocusBoard";
    iframe.srcdoc = srcdoc;
    document.body.replaceChildren(iframe);
  }, html);
  const handle = await page.locator("iframe").elementHandle();
  const frame = await handle?.contentFrame();
  if (!frame) throw new Error("Author fixture frame not available.");
  await expect(
    frame.getByRole("heading", { name: "FocusBoard", exact: true }),
  ).toBeVisible();
  await frame.waitForFunction("document.readyState === 'complete'");
  await expect(page.locator("iframe")).toHaveAttribute(
    "sandbox",
    "allow-scripts",
  );
  expect(
    await frame.evaluate(() => {
      try {
        return parent.document.title;
      } catch {
        return "blocked";
      }
    }),
  ).toBe("blocked");
  // This expression runs in the sandbox frame, never in Node, Next.js or the parent.
  return frame.evaluate<LessonObservation>(
    "({ bindings: { appName: typeof appName === 'undefined' ? undefined : appName }, logs: globalThis.__sampleLogs, runtimeError: globalThis.__sampleError })",
  );
}

test("reference checkpoint passes; starter, invalid inputs and edge cases fail meaningfully", async ({
  page,
}) => {
  const bundle = await readLessonBundle("js-01");
  await page.goto("about:blank");
  await page.route("**/*", (route) => route.abort());
  const reference = evaluateChecks(
    bundle.checks,
    await observeFixture(page, bundle.solution),
  );
  expect(reference.every(({ passed }) => passed)).toBe(true);
  const starter = evaluateChecks(
    bundle.checks,
    await observeFixture(page, bundle.starter),
  );
  expect(
    starter.every(({ passed, feedback }) => !passed && feedback.length > 20),
  ).toBe(true);
  for (const scenario of bundle.negativeCases) {
    const files = bundle.solution.map((file) =>
      file.path === "src/app.js" ? { ...file, content: scenario.source } : file,
    );
    const results = evaluateChecks(
      bundle.checks,
      await observeFixture(page, files),
    );
    expect(
      results
        .filter(({ passed }) => !passed)
        .map(({ id }) => id)
        .sort(),
      scenario.id,
    ).toEqual([...scenario.failedCheckIds].sort());
  }
  const invalidSyntax = bundle.solution.map((file) =>
    file.path === "src/app.js"
      ? { ...file, content: 'const appName = "FocusBoard;' }
      : file,
  );
  const observation = await observeFixture(page, invalidSyntax);
  expect(observation.runtimeError).toBeTruthy();
  expect(
    evaluateChecks(bundle.checks, observation).every(
      ({ passed, feedback }) => !passed && feedback.includes("помилка"),
    ),
  ).toBe(true);
});
