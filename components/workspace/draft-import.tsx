"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  MAX_DRAFT_IMPORT_BYTES,
  parseDraftImport,
} from "@/lib/progress/draft-backups";
import type { DraftSnapshot } from "@/lib/progress/draft-store";
import type { WorkspaceController } from "./use-workspace";

export function DraftImport({
  workspace,
  onImported,
}: {
  workspace: WorkspaceController;
  onImported: () => void;
}) {
  const { storage } = workspace;
  const [candidate, setCandidate] = useState<{
    name: string;
    snapshot: DraftSnapshot;
  } | null>(null);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const sequence = useRef(0);
  const mounted = useRef(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (notice) input.current?.focus();
  }, [notice]);

  async function readFile(file: File) {
    const request = ++sequence.current;
    setCandidate(null);
    setError(null);
    setNotice(null);
    setReading(true);
    try {
      if (file.size > MAX_DRAFT_IMPORT_BYTES)
        throw new Error(
          "JSON-копія перевищує ліміт 2 MiB. Вибери менший файл.",
        );
      const text = await file.text();
      if (!mounted.current || request !== sequence.current) return;
      const snapshot = parseDraftImport(text);
      setCandidate({ name: file.name, snapshot });
    } catch (reason) {
      if (mounted.current && request === sequence.current)
        setError(
          reason instanceof Error && !(reason instanceof DOMException)
            ? reason.message
            : "Не вдалося прочитати файл. Вибери JSON-копію ще раз.",
        );
    } finally {
      if (mounted.current && request === sequence.current) setReading(false);
    }
  }
  function clear() {
    sequence.current++;
    setCandidate(null);
    setReading(false);
    setError(null);
    setNotice(null);
    input.current?.focus();
  }
  function closeDialog() {
    dialog.current?.close();
    opener.current?.focus();
  }
  const inspection = candidate
    ? storage.inspectImport(candidate.snapshot)
    : null;
  const locked = workspace.busy || storage.operationBusy || storage.recovering;
  const canImport =
    Boolean(candidate && inspection && !inspection.problem) &&
    !reading &&
    !locked &&
    storage.canRestoreBackup;
  return (
    <section className="draft-import" aria-labelledby="draft-import-title">
      <h4 id="draft-import-title">Імпорт JSON-копії</h4>
      <p id="draft-import-help">
        Вибери раніше завантажену чернетку або копію файлового архіву (до 2
        MiB). Спочатку переглянь файли, потім підтвердь заміну. Вибір файла не
        змінює код. Checkpoint і відповіді quiz не імпортуються.
      </p>
      <label htmlFor="draft-import-file">JSON-файл чернетки</label>{" "}
      <input
        ref={input}
        id="draft-import-file"
        type="file"
        accept=".json,application/json"
        aria-describedby="draft-import-help"
        disabled={locked}
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = "";
          if (file) void readFile(file);
        }}
      />
      {reading && <p role="status">Читаємо та перевіряємо JSON-копію…</p>}
      {error && <p role="alert">{error} Поточну чернетку не змінено.</p>}
      {notice && <p role="status">{notice}</p>}
      {candidate && (
        <div>
          <p>
            {candidate.name} · урок {candidate.snapshot.lessonId} · версія
            матеріалів {candidate.snapshot.courseContentVersion} ·{" "}
            {candidate.snapshot.fileMap.length} файли
          </p>
          {inspection?.problem && <p role="alert">{inspection.problem}</p>}
          <p>Нижче лише текст файлів. Код не запускається автоматично.</p>
          {candidate.snapshot.fileMap.map((file) => (
            <details key={file.path}>
              <summary>{file.path}</summary>
              <pre className="backup-source">
                <code>{file.content}</code>
              </pre>
            </details>
          ))}
          <Button
            ref={opener}
            disabled={!canImport}
            onClick={() => dialog.current?.showModal()}
          >
            Імпортувати ці файли…
          </Button>
        </div>
      )}
      {(candidate || reading || error) && (
        <Button variant="ghost" disabled={locked} onClick={clear}>
          Скасувати вибір файла
        </Button>
      )}
      <dialog
        ref={dialog}
        className="reset-dialog"
        aria-labelledby="draft-import-confirm"
        aria-describedby="draft-import-warning"
        onCancel={closeDialog}
      >
        <h2 id="draft-import-confirm">Замінити чернетку файлами з JSON?</h2>
        <p id="draft-import-warning">
          Файли з «{candidate?.name}» замінять код{" "}
          {storage.isFork ? "поточного повторення" : "поточної чернетки"}.
          Поточний збережений запис буде архівовано. Попередній Check
          скасується; завершення уроку, checkpoint і відповіді quiz залишаться
          без змін.
        </p>
        <div>
          <Button variant="outline" autoFocus onClick={closeDialog}>
            Залишити поточний код
          </Button>
          <Button
            className="h-auto min-h-11 whitespace-normal py-2"
            disabled={!canImport}
            onClick={async () => {
              if (!candidate || !canImport) return;
              const snapshot = candidate.snapshot;
              closeDialog();
              setNotice(null);
              const imported = await workspace.importDraft(snapshot);
              if (!mounted.current) return;
              if (imported) {
                setCandidate(null);
                setNotice(
                  "Файли імпортовано. Попередню чернетку збережено в архіві. Для завершення уроку виконай новий Check.",
                );
                onImported();
              }
            }}
          >
            Архівувати поточну й імпортувати
          </Button>
        </div>
      </dialog>
    </section>
  );
}
