import { chromium, expect, test } from "@playwright/test";

// A separate browser confines the intentional renderer hang and has an external
// Playwright watchdog. Never expose this fixture through the application UI.
test("documents actual host responsiveness during a hostile DOM loop", async ({
  baseURL,
}, testInfo) => {
  const browser = await chromium.launch({
    channel: process.platform === "win32" ? "msedge" : undefined,
  });
  try {
    const page = await browser.newPage();
    let markStarted: () => void = () => {};
    const started = new Promise<void>((resolve) => {
      markStarted = resolve;
    });
    await page.exposeFunction("__markLoopStarted", () => markStarted());
    await page.goto(`${baseURL}/lab/runner`);
    await page.getByLabel("Сценарій", { exact: true }).selectOption("pending");
    await page.getByRole("button", { name: "Запустити сценарій" }).click();
    await expect(page.locator("iframe")).toHaveCount(1);
    const frame = await (await page
      .locator("iframe")
      .elementHandle())!.contentFrame();
    // Execution is exclusively in the opaque sandbox, never the parent page.
    void frame!
      .evaluate("void globalThis.__markLoopStarted(); while (true) {}")
      .catch(() => {});
    await Promise.race([
      started,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Loop did not start")), 1500),
      ),
    ]);
    const responsiveness = await Promise.race([
      page.evaluate(() => "responsive").catch(() => "closed"),
      new Promise<string>((resolve) =>
        setTimeout(() => resolve("blocked"), 750),
      ),
    ]);
    expect(["responsive", "blocked"]).toContain(responsiveness);
    if (responsiveness === "responsive") {
      await expect(page.getByRole("status")).toHaveText("Ліміт часу");
      await expect(page.locator("iframe")).toHaveCount(0);
    }
    console.log(
      `DOM infinite-loop probe: host ${responsiveness}; ${responsiveness === "blocked" ? "external browser teardown required" : "parent timeout removed iframe"}.`,
    );
    await testInfo.attach("dom-loop-limit", {
      body: JSON.stringify({
        responsiveness,
        watchdogMs: 750,
        guarantee: "No browser-only hard deadline for hostile DOM code",
      }),
      contentType: "application/json",
    });
  } finally {
    await browser.close();
  }
});
