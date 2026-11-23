import { parse } from "es-module-lexer/js";
import { runInputSchema, type PreparedRun } from "./protocol";

export class SourceParseError extends Error {
  constructor(path: string, cause: unknown) {
    super(`Синтаксична помилка у файлі ${path}. Перевір лапки та дужки.`, {
      cause,
    });
  }
}

export function resolveModule(
  specifier: string,
  importer: string,
  paths: Set<string>,
): string {
  if (!specifier.startsWith("./") && !specifier.startsWith("../"))
    throw new Error(
      "Імпорт дозволено лише відносним шляхом до JS-файла проєкту.",
    );
  if (/[\\%?#:]/.test(specifier)) throw new Error("Некоректний шлях імпорту.");
  const segments = importer.split("/").slice(0, -1);
  for (const part of specifier.split("/")) {
    if (part === ".") continue;
    if (part === "..") {
      if (!segments.length) throw new Error("Імпорт виходить за межі проєкту.");
      segments.pop();
    } else segments.push(part);
  }
  const path = segments.join("/");
  if (!paths.has(path) || !path.endsWith(".js"))
    throw new Error(`Файл імпорту відсутній: ${path}`);
  return `academy:/${path}`;
}

// Lexes source as data; never evaluates learner code on the host or server.
export async function prepareRun(input: unknown): Promise<PreparedRun> {
  const plan = runInputSchema.parse(input);
  const paths = new Set(plan.files.map((file) => file.path));
  const files = await Promise.all(
    plan.files.map(async (file) => {
      if (!file.path.endsWith(".js")) return file;
      let imports;
      try {
        [imports] = await parse(file.content);
      } catch (error) {
        throw new SourceParseError(file.path, error);
      }
      let source = file.content;
      for (const item of [...imports].reverse()) {
        if (
          (plan.mode !== "module" && plan.mode !== "lesson-module") ||
          (item.type !== "static" && item.type !== "reexport-star") ||
          item.attributesStart !== -1 ||
          item.phase !== null ||
          item.typeOnly
        )
          throw new Error(
            "У прототипі підтримано лише статичні ES imports без attributes; pure/classic не імпортують модулі.",
          );
        const target = resolveModule(item.specifier, file.path, paths);
        source = source.slice(0, item.start) + target + source.slice(item.end);
      }
      return { ...file, content: source };
    }),
  );
  return { ...plan, files };
}
