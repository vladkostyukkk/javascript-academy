import type { LessonCheck } from "../lessons/schema";
import type { PreparedRun, RunIdentity, RunnerPayload } from "./protocol";
import { matchesStructure } from "./structure";

interface RuntimeConfig extends RunIdentity {
  plan: PreparedRun;
}

// Self-contained: the same function is serialized into a Worker created INSIDE
// the opaque iframe. No learner source is evaluated in the platform realm.
async function executeSandbox(
  plan: PreparedRun,
  send: (payload: RunnerPayload) => void,
  compareStructure: typeof matchesStructure,
  pureEntry?: () => unknown,
) {
  const urls: string[] = [];
  const createUrl = (source: string) => {
    const url = URL.createObjectURL(
      new Blob([source], { type: "text/javascript" }),
    );
    urls.push(url);
    return url;
  };
  const stringify = (value: unknown): string => {
    try {
      return (
        typeof value === "string"
          ? value
          : (JSON.stringify(value) ?? String(value))
      ).slice(0, 1024);
    } catch {
      return "[Значення неможливо відобразити]";
    }
  };
  let failed = false;
  let finished = false;
  let logs = 0;
  let size = 0;
  const observedLogs: unknown[][] = [];
  let outputLimited = false;
  const reportError = (error: unknown) => {
    if (finished || failed) return;
    failed = true;
    send({
      kind: "error",
      text: (error instanceof Error ? error.message : stringify(error)).slice(
        0,
        1024,
      ),
      stack: error instanceof Error ? (error.stack ?? "").slice(0, 3000) : "",
    });
  };
  for (const level of ["log", "info", "warn", "error"] as const) {
    console[level] = (...values: unknown[]) => {
      if (finished || logs >= 40 || size >= 16384) return;
      if (level === "log")
        observedLogs.push(
          values
            .slice(0, 10)
            .map((value) =>
              typeof value === "string"
                ? value.slice(0, 1024)
                : typeof value === "number" ||
                    typeof value === "boolean" ||
                    value === null
                  ? value
                  : { unsupported: true },
            ),
        );
      const text = values
        .slice(0, 10)
        .map(stringify)
        .join(" ")
        .slice(0, Math.min(1024, 16384 - size));
      logs++;
      size += text.length;
      send({ kind: "log", level, text });
      if (logs === 40 || size >= 16384) {
        outputLimited = true;
        send({
          kind: "limit",
          text: "Виведення обмежено: максимум 40 повідомлень / 16 384 символи.",
        });
      }
    };
  }
  globalThis.addEventListener("error", (event) => {
    const error = event as ErrorEvent;
    reportError(error.error ?? error.message);
    event.preventDefault();
  });
  globalThis.addEventListener("unhandledrejection", (event) => {
    reportError((event as PromiseRejectionEvent).reason);
    event.preventDefault();
  });

  const runProbe = (
    check: Extract<LessonCheck, { kind: "callEquals" | "generatorSequence" }>,
    bindings: Record<string, unknown>,
  ): boolean => {
    try {
      const binding =
        check.kind === "callEquals" ? check.binding : "createIdGenerator";
      if (!Object.hasOwn(bindings, binding)) return false;
      const fn = bindings[binding];
      if (typeof fn !== "function") return false;
      if (check.kind === "callEquals")
        return fn(...check.args) === check.expected;

      const first: unknown = fn();
      if (typeof first !== "function") return false;
      const firstId: unknown = first();
      const secondId: unknown = first();
      const second: unknown = fn();
      if (typeof second !== "function") return false;
      const otherFirstId: unknown = second();
      const thirdId: unknown = first();
      const otherSecondId: unknown = second();
      return (
        firstId === 1 &&
        secondId === 2 &&
        otherFirstId === 1 &&
        thirdId === 3 &&
        otherSecondId === 2
      );
    } catch {
      return false;
    }
  };

  const cloneArgs = structuredClone;
  const runStructureCheck = (
    check: Extract<LessonCheck, { kind: "bindingStructure" | "callStructure" }>,
    bindings: Record<string, unknown>,
  ): boolean => {
    try {
      if (!Object.hasOwn(bindings, check.binding)) return false;
      const binding = bindings[check.binding];
      if (check.kind === "bindingStructure")
        return compareStructure(binding, check.expected);
      if (typeof binding !== "function") return false;

      const args = cloneArgs(check.args);
      const actual: unknown = binding(...args);
      const { expected } = check;
      const expectsUndefined =
        expected !== null &&
        typeof expected === "object" &&
        Object.hasOwn(expected, "$undefined");
      const resultMatches = expectsUndefined
        ? actual === undefined
        : compareStructure(actual, expected);
      if (!resultMatches) return false;
      if (check.firstArgAfter !== undefined)
        return compareStructure(args[0], check.firstArgAfter);
      if (check.returnsCopy)
        return actual !== args[0] && compareStructure(args[0], check.args[0]);
      return true;
    } catch {
      return false;
    }
  };

  // This replacement is a teaching API. CSP is the actual network boundary.
  const mockBody =
    plan.files.find((file) => file.path === "mock/tasks.json")?.content ?? "[]";
  const mockFetch: typeof fetch = async (input, init) => {
    if (
      input !== "/mock/tasks.json" ||
      (init?.method ?? "GET").toUpperCase() !== "GET"
    )
      throw new TypeError(
        "Мережу вимкнено. Дозволено лише GET /mock/tasks.json.",
      );
    const signal = init?.signal;
    await new Promise<void>((resolve, reject) => {
      if (signal?.aborted) {
        reject(new DOMException("Запит скасовано", "AbortError"));
        return;
      }
      const abort = () => {
        clearTimeout(timer);
        reject(new DOMException("Запит скасовано", "AbortError"));
      };
      const timer = setTimeout(() => {
        signal?.removeEventListener("abort", abort);
        resolve();
      }, plan.mock.delayMs);
      signal?.addEventListener("abort", abort, { once: true });
    });
    return new Response(
      plan.mock.status === 200
        ? mockBody
        : '{"error":"Сервіс тимчасово недоступний"}',
      {
        status: plan.mock.status,
        headers: { "Content-Type": "application/json" },
      },
    );
  };
  Object.defineProperty(globalThis, "fetch", {
    value: mockFetch,
    writable: false,
    configurable: false,
  });
  send({ kind: "ready" });
  try {
    const entry = plan.files.find((file) => file.path === plan.entry);
    if (!entry) throw new Error("Основний файл відсутній.");
    let result: unknown;
    if (plan.mode === "pure" || plan.mode === "lesson") {
      if (!pureEntry) throw new Error("Функцію обчислення не підготовлено.");
      result = await pureEntry();
    } else {
      renderPreview(plan);
      if (plan.mode === "classic" || plan.mode === "lesson-dom") {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = createUrl(entry.content);
          script.onload = () => resolve();
          script.onerror = () =>
            reject(new Error("Не вдалося виконати JavaScript."));
          document.body.append(script);
        });
      } else {
        const imports: Record<string, string> = {};
        for (const file of plan.files.filter((file) =>
          file.path.endsWith(".js"),
        ))
          imports[`academy:/${file.path}`] = createUrl(file.content);
        const map = document.createElement("script");
        map.type = "importmap";
        map.nonce =
          document.querySelector<HTMLScriptElement>("script[nonce]")?.nonce ??
          "";
        map.textContent = JSON.stringify({ imports });
        document.head.append(map);
        const loadedModule = await import(
          /* webpackIgnore: true */ imports[`academy:/${plan.entry}`]
        );
        result = loadedModule.result;
      }
    }
    const bindings =
      result && typeof result === "object"
        ? (result as Record<string, unknown>)
        : {};
    const probeResults = new Map<string, boolean>();
    if (
      plan.assertion.kind === "lesson" &&
      plan.assertion.operation === "check"
    ) {
      // Validate collection bindings at the end of the learner program, before
      // any probe can modify the collections through a closed-over reference.
      for (const check of plan.assertion.checks) {
        if (check.kind === "bindingStructure")
          probeResults.set(check.id, runStructureCheck(check, bindings));
      }
      for (const check of plan.assertion.checks) {
        if (check.kind === "callEquals" || check.kind === "generatorSequence")
          probeResults.set(check.id, runProbe(check, bindings));
        else if (check.kind === "callStructure")
          probeResults.set(check.id, runStructureCheck(check, bindings));
      }
    }
    // Allow queued rejection/error events and logs to arrive before reporting assertions.
    await new Promise((resolve) => setTimeout(resolve, 25));
    if (!failed) {
      if (plan.assertion.kind === "lesson") {
        const successFeedback = {
          domTextEquals: "Текст елемента відповідає умові.",
          bindingEquals: "Значення відповідає умові.",
          consoleEquals: "Виведення консолі відповідає умові.",
          callEquals: "Функція повертає очікуване значення.",
          generatorSequence: "Генератори створюють незалежні послідовності ID.",
          bindingStructure: "Поля або елементи відповідають умові.",
          callStructure: "Результат виклику відповідає умові.",
        };
        const checks =
          plan.assertion.operation === "check"
            ? plan.assertion.checks.map((check) => {
                if (outputLimited) {
                  return {
                    id: check.id,
                    passed: false,
                    feedback:
                      "Забагато виведення. Прибери зайві виклики консолі та перевір ще раз.",
                  };
                }
                let passed: boolean;
                switch (check.kind) {
                  case "domTextEquals":
                    passed =
                      document.querySelector(check.selector)?.textContent ===
                      check.expected;
                    break;
                  case "bindingEquals":
                    passed = bindings[check.binding] === check.expected;
                    break;
                  case "consoleEquals":
                    passed =
                      JSON.stringify(observedLogs) ===
                      JSON.stringify(check.expected);
                    break;
                  case "callEquals":
                  case "generatorSequence":
                  case "bindingStructure":
                  case "callStructure":
                    passed = probeResults.get(check.id) === true;
                    break;
                }
                return {
                  id: check.id,
                  passed,
                  feedback: (passed
                    ? successFeedback[check.kind]
                    : check.feedback
                  ).slice(0, 1024),
                };
              })
            : [];
        send({
          kind: "execution",
          operation: plan.assertion.operation,
          checks,
        });
        return;
      }
      const actual =
        plan.assertion.kind === "text"
          ? (document.querySelector(plan.assertion.selector)?.textContent ??
            null)
          : result;
      const passed = actual === plan.assertion.expected;
      send({
        kind: "result",
        passed,
        actual: stringify(actual),
        feedback: passed
          ? "Очікувану поведінку підтверджено."
          : `Очікувалося: ${stringify(plan.assertion.expected)}. Отримано: ${stringify(actual)}.`.slice(
              0,
              1024,
            ),
      });
    }
  } catch (error) {
    reportError(error);
  } finally {
    finished = true;
    for (const url of urls) URL.revokeObjectURL(url);
  }
}

function renderPreview(plan: PreparedRun) {
  // Parse only inside the opaque iframe. Disallow active/URL-bearing HTML;
  // JS can manipulate the preview, still under sandbox + CSP restrictions.
  const parsed = new DOMParser().parseFromString(
    plan.files.find((file) => file.path === "index.html")?.content ?? "",
    "text/html",
  );
  const allowedTags = new Set([
    "MAIN",
    "SECTION",
    "DIV",
    "H1",
    "H2",
    "H3",
    "P",
    "SPAN",
    "UL",
    "OL",
    "LI",
    "BUTTON",
    "LABEL",
    "INPUT",
    "STRONG",
    "EM",
    "BR",
  ]);
  const copy = (source: Element, parent: Element) => {
    if (!allowedTags.has(source.tagName)) return;
    const node = document.createElement(source.tagName.toLowerCase());
    for (const attribute of source.attributes) {
      if (
        ["id", "class", "type", "value", "aria-label", "for"].includes(
          attribute.name,
        )
      )
        node.setAttribute(attribute.name, attribute.value);
    }
    for (const child of source.childNodes) {
      if (child.nodeType === Node.TEXT_NODE)
        node.append(document.createTextNode(child.textContent ?? ""));
      else if (child instanceof Element) copy(child, node);
    }
    parent.append(node);
  };
  const root = document.createElement("main");
  for (const child of parsed.body.children) copy(child, root);
  document.body.append(root);
  const style = document.createElement("style");
  style.textContent =
    plan.files.find((file) => file.path === "styles.css")?.content ?? "";
  document.head.append(style);
}

export function boot(config: RuntimeConfig) {
  if (window === window.top || window.origin !== "null") {
    throw new Error("Runner дозволено запускати лише в opaque-origin iframe.");
  }
  const post = parent.postMessage.bind(parent);
  const send = (payload: RunnerPayload) =>
    post(
      {
        channel: "academy-runner-v1",
        runId: config.runId,
        nonce: config.nonce,
        payload,
      },
      "*",
    );
  if (config.plan.mode === "lesson") renderPreview(config.plan);
  if (config.plan.mode === "pure" || config.plan.mode === "lesson") {
    const entry = config.plan.files.find(
      (file) => file.path === config.plan.entry,
    )!.content;
    const names = new Set<string>();
    if (
      config.plan.assertion.kind === "lesson" &&
      config.plan.assertion.operation === "check"
    ) {
      for (const check of config.plan.assertion.checks) {
        if ("binding" in check) names.add(check.binding);
        else if (check.kind === "generatorSequence")
          names.add("createIdGenerator");
      }
    }
    const bindings = Array.from(
      names,
      (name) =>
        `[${JSON.stringify(name)}]: typeof ${name} === "undefined" ? void 0 : ${name}`,
    ).join(",");
    const tail = config.plan.mode === "lesson" ? `\nreturn {${bindings}};` : "";
    const source = `(${executeSandbox.toString()})(${JSON.stringify(config.plan)}, payload => postMessage(payload), (${matchesStructure.toString()}), async function () {\n${entry}\n${tail}\n});`;
    const url = URL.createObjectURL(
      new Blob([source], { type: "text/javascript" }),
    );
    const worker = new Worker(url);
    const timer = setTimeout(() => {
      worker.terminate();
      URL.revokeObjectURL(url);
      send({
        kind: "timeout",
        text: "Час виконання вичерпано. Worker зупинено.",
      });
    }, 1800);
    worker.onmessage = (event) => {
      const payload = event.data as RunnerPayload;
      send(payload);
      if (["result", "execution", "error"].includes(payload.kind)) {
        clearTimeout(timer);
        worker.terminate();
        URL.revokeObjectURL(url);
      }
    };
    worker.onerror = (event) => {
      clearTimeout(timer);
      worker.terminate();
      URL.revokeObjectURL(url);
      send({ kind: "error", text: event.message.slice(0, 1024), stack: "" });
      event.preventDefault();
    };
  } else void executeSandbox(config.plan, send, matchesStructure);
}
