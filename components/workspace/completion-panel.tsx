"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { WorkspaceController } from "./use-workspace";

export function CompletionPanel({
  workspace,
  onSwitch,
  switchBlocked = false,
}: {
  workspace: WorkspaceController;
  onSwitch: (forkId: string | undefined) => void;
  switchBlocked?: boolean;
}) {
  const { storage } = workspace;
  if (!storage.completed) return null;
  return (
    <section
      className="completion-panel"
      aria-label="Збережене завершення уроку"
    >
      <h2>
        {storage.isFork ? "Повторна практика — окрема копія" : "Урок завершено"}
      </h2>
      <p>
        Checkpoint збережено{" "}
        {new Date(storage.completed.completedAt).toLocaleString("uk-UA")}.
        Повторення не змінює ці файли або завершення уроку.
      </p>
      <p>
        {storage.isFork
          ? "Твій код повторення зберігається окремо. Після оновлення сторінки відкрий повторення знову, щоб продовжити."
          : "Перше повторення починається з початкового завдання. Якщо копія вже є, відкриються твої останні зміни."}
      </p>
      <p>Наступний урок ще готується й залишається заблокованим.</p>
      <p role="status">
        {storage.operationBusy
          ? "Зберігаємо…"
          : (storage.error ??
            (storage.pending
              ? "Дочекайся збереження змін перед переходом."
              : "Збережено в цьому браузері."))}
      </p>
      <div className="workspace-toolbar">
        <Button variant="outline" onClick={storage.downloadCheckpoint}>
          Завантажити checkpoint JSON
        </Button>
        {storage.isFork ? (
          <Button
            disabled={
              storage.pending ||
              switchBlocked ||
              storage.operationBusy ||
              storage.phase !== "ready" ||
              Boolean(storage.error)
            }
            onClick={() => {
              workspace.suspend();
              onSwitch(undefined);
            }}
          >
            До завершеного уроку
          </Button>
        ) : (
          <Button
            disabled={
              switchBlocked ||
              storage.operationBusy ||
              storage.phase !== "ready"
            }
            onClick={async () => {
              const id = await storage.fork();
              if (id) {
                workspace.suspend();
                onSwitch(id);
              }
            }}
          >
            Відкрити повторення в копії
          </Button>
        )}
        <Button asChild variant="ghost">
          <Link href="/project">Збережені версії FocusBoard</Link>
        </Button>
      </div>
    </section>
  );
}
