import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { crc32 } from "node:zlib";
import { expect, type Page } from "@playwright/test";

function readStoredEntries(zip: Buffer) {
  const entries = new Map<string, Buffer>();
  let offset = 0;
  while (zip.readUInt32LE(offset) === 0x04034b50) {
    expect(zip.readUInt16LE(offset + 8)).toBe(0);
    const checksum = zip.readUInt32LE(offset + 14);
    const size = zip.readUInt32LE(offset + 18);
    const nameLength = zip.readUInt16LE(offset + 26);
    const extraLength = zip.readUInt16LE(offset + 28);
    const name = zip.toString("utf8", offset + 30, offset + 30 + nameLength);
    const start = offset + 30 + nameLength + extraLength;
    const bytes = zip.subarray(start, start + size);
    expect(crc32(bytes)).toBe(checksum);
    entries.set(name, bytes);
    offset = start + size;
  }
  expect(zip.readUInt32LE(offset)).toBe(0x02014b50);
  expect(zip.readUInt32LE(zip.length - 22)).toBe(0x06054b50);
  return entries;
}

export async function verifyIndependentProject(page: Page, archive: string) {
  const files = readStoredEntries(await readFile(archive));
  expect(files.has("README.txt")).toBe(true);
  expect(files.has("mock/tasks.json")).toBe(true);
  const server = createServer((request, response) => {
    const path = request.url === "/" ? "index.html" : request.url?.slice(1);
    const body = path && files.get(path);
    if (!body || !path) {
      response.writeHead(404).end();
      return;
    }
    const type = path.endsWith(".js")
      ? "text/javascript"
      : path.endsWith(".css")
        ? "text/css"
        : path.endsWith(".json")
          ? "application/json"
          : "text/html";
    response
      .writeHead(200, { "Content-Type": type + "; charset=utf-8" })
      .end(body);
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  try {
    const address = server.address();
    if (!address || typeof address === "string")
      throw Error("Missing test port");
    const origin = `http://127.0.0.1:${address.port}`;
    const mockUrl = origin + "/mock/tasks.json";
    await page.route(mockUrl, (route) => route.fulfill({ status: 503 }), {
      times: 1,
    });
    await page.goto(origin);
    await expect(page.locator("#initial-load")).toHaveText(
      "Не вдалося завантажити задачі",
    );
    await page.getByRole("button", { name: "Повторити", exact: true }).click();
    await expect(page.locator("#doing article h2")).toHaveText(
      "Вивчити JavaScript",
    );
    const name = page.getByRole("textbox", {
      name: "Назва задачі",
      exact: true,
    });
    await name.fill("З архіву");
    await name.press("Enter");
    await expect(page.locator("#todo article h2")).toContainText(["З архіву"]);
    await page.getByRole("searchbox", { name: "Пошук задач" }).fill("з архіву");
    await expect(page.locator("#tasks article h2")).toHaveText(["З архіву"]);
    await page.reload();
    await expect(page.locator("#todo article h2")).toContainText(["З архіву"]);
    const task = page.locator("#todo article").filter({ hasText: "З архіву" });
    await task
      .getByRole("button", { name: "У роботу", exact: true })
      .press("Enter");
    const moved = page
      .locator("#doing article")
      .filter({ hasText: "З архіву" });
    await expect(
      moved.getByRole("button", { name: "У роботу", exact: true }),
    ).toBeFocused();
    await moved.dragTo(page.locator("#done"));
    await expect(page.locator("#done article h2")).toContainText(["З архіву"]);
    await page
      .getByRole("button", { name: "Експорт задач", exact: true })
      .click();
    await expect(
      page.getByRole("textbox", { name: "JSON для копіювання" }),
    ).toHaveValue(/З архіву/);
    const input = page.getByLabel("Імпорт задач із JSON");
    await input.setInputFiles({
      name: "invalid.json",
      mimeType: "application/json",
      buffer: Buffer.from("{"),
    });
    await expect(
      page.getByText("Не вдалося імпортувати файл", { exact: true }),
    ).toBeVisible();
    await expect(page.locator("#done article h2")).toContainText(["З архіву"]);
    await input.setInputFiles({
      name: "empty.json",
      mimeType: "application/json",
      buffer: Buffer.from("[]"),
    });
    await expect(page.locator("#tasks article")).toHaveCount(0);
    await expect(page.locator("#task-stats")).toContainText(
      "Виконано: 0 із 0 (0%)",
    );
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
}
