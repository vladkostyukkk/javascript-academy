import { z } from "zod";
import { fileMapSchema, checksSchema } from "@/lib/lessons/schema";

export const limits = {
  timeoutMs: 2000,
  previewMs: 10000,
  logs: 40,
  text: 1024,
  output: 16384,
} as const;
const text = z.string().max(limits.text);
export const runInputSchema = z
  .object({
    mode: z.enum(["pure", "classic", "module", "lesson"]),
    files: fileMapSchema,
    entry: z.literal("src/app.js"),
    assertion: z.discriminatedUnion("kind", [
      z
        .object({
          kind: z.literal("lesson"),
          operation: z.enum(["run", "check"]),
          checks: checksSchema.max(10),
        })
        .strict(),
      z
        .object({
          kind: z.literal("result"),
          expected: z.union([
            z.string().max(500),
            z.number().finite(),
            z.boolean(),
            z.null(),
          ]),
        })
        .strict(),
      z
        .object({
          kind: z.literal("text"),
          selector: z.string().min(1).max(100),
          expected: z.string().max(500),
        })
        .strict(),
    ]),
    mock: z
      .object({
        status: z.union([z.literal(200), z.literal(503)]),
        delayMs: z.number().int().min(0).max(500),
      })
      .strict(),
  })
  .strict()
  .refine(
    (plan) => (plan.mode === "lesson") === (plan.assertion.kind === "lesson"),
    "Lesson mode requires lesson checks.",
  );
export type RunInput = z.infer<typeof runInputSchema>;
export type PreparedRun = RunInput;
export const payloadSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("execution"),
      operation: z.enum(["run", "check"]),
      checks: z
        .array(
          z
            .object({
              id: z.string().min(1).max(100),
              passed: z.boolean(),
              feedback: text,
            })
            .strict(),
        )
        .max(10),
    })
    .strict(),
  z.object({ kind: z.literal("ready") }).strict(),
  z
    .object({
      kind: z.literal("log"),
      level: z.enum(["log", "info", "warn", "error"]),
      text,
    })
    .strict(),
  z
    .object({ kind: z.literal("error"), text, stack: z.string().max(3000) })
    .strict(),
  z
    .object({
      kind: z.literal("result"),
      passed: z.boolean(),
      actual: text,
      feedback: text,
    })
    .strict(),
  z.object({ kind: z.literal("limit"), text }).strict(),
  z.object({ kind: z.literal("timeout"), text }).strict(),
]);
export type RunnerPayload = z.infer<typeof payloadSchema>;
export const envelopeSchema = z
  .object({
    channel: z.literal("academy-runner-v1"),
    runId: z.string().uuid(),
    nonce: z.string().regex(/^[a-f0-9]{32}$/),
    payload: payloadSchema,
  })
  .strict();
export interface RunIdentity {
  runId: string;
  nonce: string;
}

export function acceptMessage(
  event: Pick<MessageEvent<unknown>, "source" | "origin" | "data">,
  source: MessageEventSource | null,
  identity: RunIdentity,
): RunnerPayload | null {
  if (!source || event.source !== source || event.origin !== "null")
    return null;
  const parsed = envelopeSchema.safeParse(event.data);
  if (
    !parsed.success ||
    parsed.data.runId !== identity.runId ||
    parsed.data.nonce !== identity.nonce
  )
    return null;
  return parsed.data.payload;
}
