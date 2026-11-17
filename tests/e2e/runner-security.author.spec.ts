import { expect, test, type Page } from "@playwright/test";

async function run(page: Page, id: string, status: string) {
  await page.getByLabel("Сценарій", { exact: true }).selectOption(id);
  await page.getByRole("button", { name: "Запустити сценарій" }).click();
  await expect(page.getByRole("status")).toHaveText(status);
}
test("bootstrap refuses to execute in platform origin", async ({ page }) => {
  await page.goto("/lab/runner");
  await page.addScriptTag({ url: "/runner/runtime.js" });
  const message = await page.evaluate(
    '(() => { try { AcademyRuntime.boot({}); return "unsafe"; } catch (error) { return error.message; } })()',
  );
  expect(message).toBe(
    "Runner дозволено запускати лише в opaque-origin iframe.",
  );
  await expect(page.locator("iframe")).toHaveCount(0);
});
test("sandbox blocks platform DOM/storage, top navigation, popups, network and embeds", async ({
  page,
  context,
}) => {
  const external: string[] = [];
  await page.route("https://example.invalid/**", (route) => {
    external.push(route.request().url());
    return route.abort();
  });
  await page.goto("/lab/runner");
  await run(page, "isolation", "Перевірку пройдено");
  await expect(page).toHaveURL(/\/lab\/runner$/);
  expect(context.pages()).toHaveLength(1);
  await run(page, "network", "Перевірку пройдено");
  await run(page, "worker-network", "Перевірку пройдено");
  expect(external).toEqual([]);
  await run(page, "abort", "Перевірку пройдено");
});
test("errors, rejections, output limits and XSS are reported as text", async ({
  page,
}) => {
  await page.goto("/lab/runner");
  for (const id of ["runtime-error", "syntax-error", "rejection"]) {
    await run(page, id, "Помилка виконання");
    await expect(page.locator(".runner-output")).not.toBeEmpty();
  }
  await run(page, "flood", "Перевірку пройдено");
  await expect(page.locator(".runner-output li")).toHaveCount(42);
  await expect(page.locator(".runner-output")).toContainText(
    "Виведення обмежено",
  );
  await run(page, "xss", "Перевірку пройдено");
  await expect(page.locator(".runner-output")).toContainText(
    "<img src=x onerror=alert(1)>",
  );
  await expect(
    page.locator(".runner-output img, .runner-output script"),
  ).toHaveCount(0);
  await run(page, "large-output", "Перевірку не пройдено");
  expect(await page.locator(".runner-output").textContent()).toHaveLength(3072);
});
test("Worker infinite loop times out with responsive host; async timeout can restart", async ({
  page,
}) => {
  await page.goto("/lab/runner");
  await page.getByLabel("Сценарій", { exact: true }).selectOption("loop");
  await page.getByRole("button", { name: "Запустити сценарій" }).click();
  await expect(page.locator("iframe")).toHaveCount(1);
  expect(await page.evaluate(() => 2 + 2)).toBe(4);
  await expect(page.getByRole("status")).toHaveText("Ліміт часу");
  await expect(page.locator("iframe")).toHaveCount(0);
  await run(page, "pending", "Ліміт часу");
  await run(page, "pure", "Перевірку пройдено");
});
test("rejects spoofed source, stale run, wrong nonce, malformed and oversized messages", async ({
  page,
}) => {
  await page.goto("/lab/runner");
  await page.getByLabel("Сценарій", { exact: true }).selectOption("pending");
  await page.getByRole("button", { name: "Запустити сценарій" }).click();
  await expect(page.locator("iframe")).toHaveCount(1);
  const identity = await page.locator("iframe").evaluate((frame) => {
    const source = (frame as HTMLIFrameElement).srcdoc;
    return {
      runId: source.match(/"runId":"([^"]+)"/)![1],
      nonce: source.match(/"nonce":"([a-f0-9]+)"/)![1],
    };
  });
  const forged = {
    channel: "academy-runner-v1",
    ...identity,
    payload: {
      kind: "result",
      passed: true,
      actual: "forged",
      feedback: "forged",
    },
  };
  await page.evaluate((message) => window.postMessage(message, "*"), forged);
  const frame = await (await page
    .locator("iframe")
    .elementHandle())!.contentFrame();
  await frame!.evaluate((message) => {
    parent.postMessage({ ...message, nonce: "b".repeat(32) }, "*");
    parent.postMessage({ ...message, runId: crypto.randomUUID() }, "*");
    parent.postMessage({ ...message, payload: { kind: "unlock" } }, "*");
    parent.postMessage(
      {
        ...message,
        payload: { kind: "log", level: "log", text: "x".repeat(1025) },
      },
      "*",
    );
  }, forged);
  await expect(page.getByRole("status")).toHaveText("Виконується…");
  await expect(page.locator(".runner-output")).not.toContainText("forged");
  await expect(page.getByRole("status")).toHaveText("Ліміт часу");
});
test("completed preview has a bounded lifetime", async ({ page }) => {
  await page.goto("/lab/runner");
  await run(page, "dom", "Перевірку пройдено");
  await expect(page.locator("iframe")).toHaveCount(0, { timeout: 12000 });
  await expect(page.getByRole("status")).toHaveText("Перевірку пройдено");
});

test("records self-navigation as an unresolved network boundary", async ({
  page,
}, testInfo) => {
  const attempts: string[] = [];
  await page.route("https://example.invalid/self-navigation", (route) => {
    attempts.push(route.request().url());
    return route.abort();
  });
  await page.goto("/lab/runner");
  await run(page, "dom", "Перевірку пройдено");
  const frame = await (await page
    .locator("iframe")
    .elementHandle())!.contentFrame();
  await frame!.evaluate(() => {
    location.href = "https://example.invalid/self-navigation";
  });
  await expect.poll(() => attempts.length).toBe(1);
  await expect(page).toHaveURL(/\/lab\/runner$/);
  await testInfo.attach("self-navigation-release-blocker", {
    body: "CSP does not block iframe self-navigation. Request intercepted and aborted by Playwright; no external request was sent. Public launch requires a separate mitigation/security review.",
    contentType: "text/plain",
  });
});
