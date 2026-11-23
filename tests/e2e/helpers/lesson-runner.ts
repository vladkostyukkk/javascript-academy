import { randomBytes, randomUUID } from "node:crypto";
import type { Page } from "@playwright/test";
import type { FileMap, LessonCheck } from "../../../lib/lessons/schema";
import { createSandboxDocument } from "../../../lib/runner/document";
import { prepareRun } from "../../../lib/runner/prepare";
import { envelopeSchema } from "../../../lib/runner/protocol";
import { lessonRun } from "../../../lib/workspace/state";

// Author fixtures use the production bootstrap in its opaque iframe.
export async function createLessonRunner(page: Page) {
  await page.goto("/");
  const response = await page.request.get("/runner/runtime.js");
  if (!response.ok()) throw new Error(`Runner bootstrap: ${response.status()}`);
  const runtime = await response.text();

  return async (
    files: FileMap,
    checks: LessonCheck[],
    operation: "check" | "run" = "check",
  ) => {
    const plan = await prepareRun(
      lessonRun(files, files, [], checks, operation),
    );
    const identity = {
      runId: randomUUID(),
      nonce: randomBytes(16).toString("hex"),
    };
    const envelopes = await page.evaluate(
      ({ srcdoc, identity }) =>
        new Promise<unknown[]>((resolve, reject) => {
          const frame = document.createElement("iframe");
          frame.setAttribute("sandbox", "allow-scripts");
          const received: unknown[] = [];
          const deadline = setTimeout(() => {
            dispose();
            reject(new Error("No terminal runner event."));
          }, 4000);

          function dispose() {
            clearTimeout(deadline);
            window.removeEventListener("message", receive);
            frame.remove();
          }
          function receive(
            event: MessageEvent<{
              channel?: unknown;
              runId?: unknown;
              nonce?: unknown;
              payload?: { kind?: string };
            } | null>,
          ) {
            if (event.source !== frame.contentWindow || event.origin !== "null")
              return;
            const message = event.data;
            if (
              message?.channel !== "academy-runner-v1" ||
              message.runId !== identity.runId ||
              message.nonce !== identity.nonce
            )
              return;
            received.push(message);
            if (
              ["execution", "error", "timeout"].includes(
                message.payload?.kind ?? "",
              )
            ) {
              dispose();
              resolve(received);
            }
          }

          window.addEventListener("message", receive);
          frame.srcdoc = srcdoc;
          document.body.append(frame);
        }),
      { srcdoc: createSandboxDocument(runtime, plan, identity), identity },
    );
    return envelopes.map((envelope) => envelopeSchema.parse(envelope).payload);
  };
}
