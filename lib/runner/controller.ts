import { createSandboxDocument } from "./document";
import {
  acceptMessage,
  limits,
  type PreparedRun,
  type RunnerPayload,
  type RunIdentity,
} from "./protocol";

export type RunnerEvent = RunnerPayload | { kind: "disposed" };

export function startRunner(
  container: HTMLElement,
  runtime: string,
  plan: PreparedRun,
  onEvent: (event: RunnerEvent) => void,
) {
  const identity: RunIdentity = {
    runId: crypto.randomUUID(),
    nonce: Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join(""),
  };
  const frame = document.createElement("iframe");
  frame.title = "Ізольований перегляд FocusBoard";
  frame.setAttribute("sandbox", "allow-scripts");
  frame.setAttribute("referrerpolicy", "no-referrer");
  frame.setAttribute(
    "allow",
    "camera 'none'; microphone 'none'; geolocation 'none'; clipboard-read 'none'; clipboard-write 'none'",
  );
  let disposed = false;
  let terminal = false;
  let count = 0;
  let output = 0;
  let logCount = 0;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    clearTimeout(deadline);
    clearTimeout(lease);
    window.removeEventListener("message", receive);
    frame.remove();
    onEvent({ kind: "disposed" });
  };
  const receive = (event: MessageEvent<unknown>) => {
    if (disposed || terminal) return;
    const payload = acceptMessage(event, frame.contentWindow, identity);
    if (!payload) return;
    if (++count > 80) {
      onEvent({
        kind: "error",
        text: "Забагато повідомлень від runner.",
        stack: "",
      });
      dispose();
      return;
    }
    if (payload.kind === "log") {
      if (
        ++logCount > limits.logs ||
        output + payload.text.length > limits.output
      )
        return;
      output += payload.text.length;
    }
    onEvent(payload);
    if (["result", "execution", "error", "timeout"].includes(payload.kind)) {
      terminal = true;
      clearTimeout(deadline);
      if (payload.kind !== "result" && payload.kind !== "execution") dispose();
    }
  };
  const deadline = setTimeout(() => {
    terminal = true;
    onEvent({
      kind: "timeout",
      text: "Час виконання вичерпано. Перегляд закрито; DOM-зупинка є best-effort.",
    });
    dispose();
  }, limits.timeoutMs);
  // A completed preview cannot keep background scripts alive indefinitely.
  const lease = setTimeout(dispose, limits.previewMs);
  window.addEventListener("message", receive);
  frame.srcdoc = createSandboxDocument(runtime, plan, identity);
  container.replaceChildren(frame);
  return { dispose, runId: identity.runId };
}
