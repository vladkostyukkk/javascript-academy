"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { DraftBackup } from "@/lib/progress/draft-backups";
import type { WorkspaceController } from "./use-workspace";
import { DraftImport } from "./draft-import";

export function DraftBackups({
  workspace,
}: {
  workspace: WorkspaceController;
}) {
  const { storage } = workspace;
  const [opened, setOpened] = useState(false);
  const [entries, setEntries] = useState<DraftBackup[]>([]);
  const [before, setBefore] = useState<number | undefined>();
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selected, setSelected] = useState<DraftBackup | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const sequence = useRef(0);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  async function load(older = false) {
    const request = ++sequence.current;
    setLoading(true);
    setError(null);
    try {
      const page = await storage.listBackups(older ? before : undefined);
      if (!mounted.current || request !== sequence.current) return;
      setEntries((current) =>
        older
          ? [
              ...current,
              ...page.entries.filter(
                (entry) => !current.some((item) => item.id === entry.id),
              ),
            ]
          : page.entries,
      );
      setBefore(page.before);
      setLoaded(true);
    } catch {
      if (mounted.current && request === sequence.current)
        setError(
          "Не вдалося прочитати резервні копії. Спробуй оновити список; збережені дані не змінено.",
        );
    } finally {
      if (mounted.current && request === sequence.current) setLoading(false);
    }
  }
  function closeDialog() {
    dialog.current?.close();
    opener.current?.focus();
  }
  function download(backup: DraftBackup) {
    try {
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(backup, null, 2)], {
          type: "application/json",
        }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = `${storage.lessonId}-backup-${backup.id}.json`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setError(
        "Не вдалося завантажити JSON-копію. Запис в архіві залишився без змін.",
      );
    }
  }
  const locked = workspace.busy || storage.operationBusy || storage.recovering;
  const canCreate =
    !locked &&
    !storage.pending &&
    storage.phase === "ready" &&
    !storage.error &&
    storage.canEdit;
  return (
    <section
      className="draft-backups"
      aria-label="Локальні резервні копії файлів"
    >
      <h3>Резервні копії файлів</h3>
      <p>
        Копії основного уроку та повторення зберігаються в цьому браузері.
        Відновлення замінює лише активну чернетку та архівує її попередній
        запис. Завершення уроку й checkpoint не змінюються.
      </p>
      <DraftImport
        workspace={workspace}
        onImported={() => {
          setNotice(null);
          if (opened) void load();
        }}
      />
      <div className="workspace-toolbar">
        <Button
          variant="outline"
          aria-expanded={opened}
          aria-controls="draft-backup-list"
          disabled={locked || loading}
          onClick={() => {
            const next = !opened;
            setOpened(next);
            if (next) void load();
          }}
        >
          {opened ? "Сховати список копій" : "Показати резервні копії"}
        </Button>
        <Button
          variant="outline"
          disabled={!canCreate || loading}
          onClick={async () => {
            setNotice(null);
            const saved = await storage.saveBackup();
            if (!mounted.current) return;
            if (saved) {
              setNotice("Резервну копію збережено локально.");
              setOpened(true);
              await load();
            }
          }}
        >
          Зберегти резервну копію
        </Button>
      </div>
      {storage.pending && (
        <p>
          Дочекайся автозбереження поточного коду перед створенням або
          відновленням копії.
        </p>
      )}
      {storage.completed && !storage.isFork && (
        <p>
          Основний урок уже завершено. Для відновлення коду відкрий повторення в
          окремій копії — цей архів буде доступний і там.
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      <div id="draft-backup-list" hidden={!opened}>
        <p>
          Показано копії цього уроку, від новіших до старіших. Файли нижче
          відображаються як текст і не запускаються. Завантажений JSON можна
          імпортувати через вибір файла вище.
        </p>
        <Button
          variant="ghost"
          disabled={loading || locked}
          onClick={() => void load()}
        >
          Оновити список копій
        </Button>
        {loading && <p role="status">Завантажуємо резервні копії…</p>}
        {error && <p role="alert">{error}</p>}
        {loaded && !loading && !error && entries.length === 0 && (
          <p>
            Резервних копій ще немає. Збережи поточну чернетку кнопкою вище.
          </p>
        )}
        <ul className="checkpoint-history">
          {entries.map((backup) => {
            const inspection = storage.inspectBackup(backup);
            const reason =
              backup.reason === "manual"
                ? "Ручна копія"
                : backup.reason === "backup-restore"
                  ? "Перед відновленням з копії"
                  : backup.reason === "json-import"
                    ? "Перед імпортом JSON"
                    : "Перед відновленням початкових файлів";
            return (
              <li key={backup.id}>
                <h4>
                  Копія №{backup.id} ·{" "}
                  {new Date(backup.archivedAt).toLocaleString("uk-UA")}
                </h4>
                <p>
                  {reason} ·{" "}
                  {backup.workspace === "main" ? "Основний урок" : "Повторення"}
                  {inspection.snapshot
                    ? ` · версія матеріалів ${inspection.snapshot.courseContentVersion}`
                    : ""}
                </p>
                {inspection.problem && <p>{inspection.problem}</p>}
                {inspection.snapshot && (
                  <details>
                    <summary>
                      Переглянути файли ({inspection.snapshot.fileMap.length})
                    </summary>
                    {inspection.snapshot.fileMap.map((file) => (
                      <details key={file.path}>
                        <summary>{file.path}</summary>
                        <pre className="backup-source">
                          <code>{file.content}</code>
                        </pre>
                      </details>
                    ))}
                  </details>
                )}
                <div className="workspace-toolbar">
                  <Button variant="outline" onClick={() => download(backup)}>
                    Завантажити JSON
                  </Button>
                  <Button
                    disabled={
                      locked ||
                      !storage.canRestoreBackup ||
                      Boolean(inspection.problem)
                    }
                    onClick={(event) => {
                      opener.current = event.currentTarget;
                      setSelected(backup);
                      dialog.current?.showModal();
                    }}
                  >
                    Відновити цю копію
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
        {before !== undefined && (
          <Button
            variant="outline"
            disabled={loading || locked}
            onClick={() => void load(true)}
          >
            Завантажити старіші копії
          </Button>
        )}
      </div>
      <dialog
        ref={dialog}
        className="reset-dialog"
        aria-labelledby="backup-restore-title"
        onCancel={closeDialog}
      >
        <h2 id="backup-restore-title">Відновити копію №{selected?.id}?</h2>
        <p>
          Файли {storage.isFork ? "поточного повторення" : "поточної чернетки"}{" "}
          буде замінено вибраною версією. Поточний збережений запис потрапить до
          архіву. Попередній результат Check буде скасовано.
        </p>
        <div>
          <Button variant="outline" autoFocus onClick={closeDialog}>
            Залишити поточний код
          </Button>
          <Button
            disabled={
              !selected ||
              locked ||
              !storage.canRestoreBackup ||
              (selected !== null &&
                Boolean(storage.inspectBackup(selected).problem))
            }
            onClick={async () => {
              if (!selected) return;
              const backup = selected;
              closeDialog();
              setNotice(null);
              const restored = await workspace.restoreBackup(backup);
              if (mounted.current && restored) {
                setNotice(
                  `Копію №${backup.id} відновлено. Попередня чернетка збережена в архіві.`,
                );
                await load();
              }
            }}
          >
            Архівувати поточну й відновити
          </Button>
        </div>
      </dialog>
    </section>
  );
}
