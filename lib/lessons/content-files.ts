import { lstat, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { lessonRegistry } from "./registry";
import {
  isLessonId,
  virtualPathSchema,
  type FileMap,
  type LessonId,
} from "./schema";
import { validateLessonBundle } from "./content-validation";

const requiredDocuments = [
  "meta.json",
  "theory.md",
  "challenge.md",
  "quiz.json",
  "hints.json",
  "tests/checks.json",
  "tests/negative-cases.json",
  "checkpoint.json",
];

async function listFiles(id: LessonId, prefix = ""): Promise<string[]> {
  if (prefix.split("/").length > 10)
    throw new Error("Завелика вкладеність файлів уроку.");
  const entries = await readdir(
    path.join(process.cwd(), "content", "lessons", id, prefix),
    {
      withFileTypes: true,
    },
  );
  const files: string[] = [];
  for (const entry of entries) {
    if (entry.isSymbolicLink())
      throw new Error("Символічні посилання в матеріалах не дозволені.");
    const relative = prefix + entry.name;
    if (entry.isDirectory())
      files.push(...(await listFiles(id, `${relative}/`)));
    else if (entry.isFile()) files.push(relative);
    else throw new Error("У матеріалах дозволені лише звичайні файли.");
  }
  return files;
}

export function validateContentPaths(paths: string[], id: LessonId) {
  if (paths.length > 108) throw new Error(`${id}: забагато файлів.`);
  for (const document of requiredDocuments) {
    if (!paths.includes(document))
      throw new Error(`${id}: відсутній обов’язковий файл ${document}.`);
  }
  for (const file of paths) {
    if (requiredDocuments.includes(file)) continue;
    if (!file.startsWith("starter/") && !file.startsWith("solution/"))
      throw new Error(`${id}: невідомий шлях ${file}.`);
    virtualPathSchema.parse(file.slice(file.indexOf("/") + 1));
  }
}

export async function readLessonBundle(id: string) {
  // Fixed root also keeps Next.js output tracing scoped to course content.
  if (!isLessonId(id)) throw new Error("Невідомий ID уроку.");
  const summary = lessonRegistry.lessons.find((lesson) => lesson.id === id);
  if (!summary?.contentAvailable)
    throw new Error(`${id}: матеріали не зареєстровано.`);
  if (
    (
      await lstat(path.join(process.cwd(), "content", "lessons", id))
    ).isSymbolicLink()
  )
    throw new Error("Каталог уроку не може бути символічним посиланням.");
  const paths = await listFiles(id);
  validateContentPaths(paths, id);
  async function read(relative: string) {
    const file = path.join(process.cwd(), "content", "lessons", id, relative);
    if ((await lstat(file)).size > 65_536)
      throw new Error(`${id}: файл ${relative} перевищує 64 KiB.`);
    return (await readFile(file, "utf8")).replace(/\r\n/g, "\n");
  }
  async function json(relative: string): Promise<unknown> {
    try {
      return JSON.parse(await read(relative));
    } catch {
      throw new Error(`${id}: не вдалося прочитати JSON ${relative}.`);
    }
  }
  async function fileMap(folder: string): Promise<FileMap> {
    return Promise.all(
      paths
        .filter((file) => file.startsWith(`${folder}/`))
        .sort()
        .map(async (file) => ({
          path: file.slice(folder.length + 1),
          content: await read(file),
        })),
    );
  }
  const [
    meta,
    theory,
    challenge,
    quiz,
    hints,
    starter,
    solution,
    checks,
    negativeCases,
    checkpoint,
  ] = await Promise.all([
    json("meta.json"),
    read("theory.md"),
    read("challenge.md"),
    json("quiz.json"),
    json("hints.json"),
    fileMap("starter"),
    fileMap("solution"),
    json("tests/checks.json"),
    json("tests/negative-cases.json"),
    json("checkpoint.json"),
  ]);
  return validateLessonBundle(
    {
      meta,
      theory,
      challenge,
      quiz,
      hints,
      starter,
      solution,
      checks,
      negativeCases,
      checkpoint,
    },
    summary,
    lessonRegistry.version,
  );
}

export async function readValidatedCourseContent() {
  const declared = lessonRegistry.lessons
    .filter(({ contentAvailable }) => contentAvailable)
    .map(({ id }) => id);
  const entries = await readdir(
    path.join(process.cwd(), "content", "lessons"),
    { withFileTypes: true },
  );
  for (const entry of entries) {
    if (entry.name === "index.json" && entry.isFile()) continue;
    if (
      !entry.isDirectory() ||
      !isLessonId(entry.name) ||
      !declared.includes(entry.name)
    )
      throw new Error(`Незареєстрований шлях матеріалів: ${entry.name}.`);
  }
  return Promise.all(declared.map((id) => readLessonBundle(id)));
}
