"use client";
import { Component, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { MonacoEditor } from "./monaco-editor";
import { DraftBackups } from "./draft-backups";
import type { WorkspaceController } from "./use-workspace";

class EditorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export function CheckResults({
  workspace,
}: {
  workspace: WorkspaceController;
}) {
  return (
    <section className="check-results" aria-label="Результати перевірки коду">
      <h3>Результати перевірки</h3>
      {workspace.storage.error && (
        <div role="alert">
          <p>{workspace.storage.error}</p>
          {workspace.storage.phase === "ready" && (
            <Button variant="outline" onClick={workspace.storage.retry}>
              Повторити спробу збереження
            </Button>
          )}
        </div>
      )}
      {workspace.results ? (
        <>
          <ul>
            {workspace.results.map((result) => (
              <li
                key={result.id}
                data-check-id={result.id}
                data-passed={result.passed}
                className={result.passed ? "check-pass" : "check-fail"}
              >
                <strong>{result.passed ? "Пройдено" : "Не пройдено"}</strong>
                <p>{result.feedback}</p>
              </li>
            ))}
          </ul>
          {workspace.results.every((result) => result.passed) && (
            <div>
              <p>
                {workspace.storage.isFork
                  ? "Повторення пройдено. Збережений checkpoint залишається незмінним."
                  : workspace.storage.completed
                    ? "Завершення уроку збережено локально."
                    : "Рішення правильне. Дочекайся автозбереження й підтвердь завершення уроку."}
              </p>
              {!workspace.storage.isFork && !workspace.storage.completed && (
                <Button
                  disabled={!workspace.canComplete}
                  onClick={() => void workspace.complete()}
                >
                  {workspace.storage.operationBusy
                    ? "Зберігаємо завершення…"
                    : "Завершити урок і зберегти checkpoint"}
                </Button>
              )}
            </div>
          )}
        </>
      ) : (
        <p>
          Перевірки ще не виконані для поточного коду. У практиці натисни
          «Перевірити».
        </p>
      )}
    </section>
  );
}

export function LessonWorkspace({
  workspace,
  editablePaths,
  visible,
}: {
  workspace: WorkspaceController;
  editablePaths: string[];
  visible: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const resetButton = useRef<HTMLButtonElement>(null);
  const recoveryDialog = useRef<HTMLDialogElement>(null);
  const recoveryButton = useRef<HTMLButtonElement>(null);
  const fileButtons = useRef(new Map<string, HTMLButtonElement>());
  const [boundaryKey, setBoundaryKey] = useState(0);
  const { draft, activeFile } = workspace;
  const selected = draft.files.find((file) => file.path === activeFile)!;
  function closeReset() {
    dialog.current?.close();
    resetButton.current?.focus();
  }
  function closeRecovery() {
    recoveryDialog.current?.close();
    recoveryButton.current?.focus();
  }
  return (
    <section className="lesson-workspace" aria-label="Робочі файли FocusBoard">
      <div className="workspace-heading">
        <h3>Файли FocusBoard</h3>
        <span className="small-tag">
          {workspace.storage.pending
            ? "Є незбережені зміни"
            : workspace.dirty
              ? "Твоя чернетка"
              : "Початковий код"}
        </span>
      </div>
      <p className="workspace-note">
        Файли автоматично зберігаються в цьому браузері. Перед виходом дочекайся
        повідомлення про збереження. Quiz відновлюється окремо; перевірку коду
        Check після оновлення сторінки потрібно запускати знову.
      </p>
      <div className="workspace-storage">
        <p role="status" aria-live="polite">
          {workspace.storage.message}
        </p>
        <div className="workspace-toolbar">
          {(workspace.storage.canEdit ||
            workspace.storage.phase === "recovery" ||
            workspace.storage.phase === "conflict") && (
            <Button variant="outline" onClick={workspace.storage.download}>
              Завантажити копію чернетки
            </Button>
          )}
          {(workspace.storage.phase === "load-error" ||
            (workspace.storage.phase === "ready" &&
              workspace.storage.error)) && (
            <Button variant="outline" onClick={workspace.storage.retry}>
              {workspace.storage.phase === "load-error"
                ? "Повторити завантаження чернетки"
                : "Повторити збереження"}
            </Button>
          )}
          {workspace.storage.phase === "recovery" && (
            <Button
              ref={recoveryButton}
              disabled={
                workspace.storage.recovering || workspace.storage.operationBusy
              }
              onClick={() => recoveryDialog.current?.showModal()}
            >
              Відновити з початкових файлів
            </Button>
          )}
          {workspace.storage.phase === "conflict" && (
            <p>
              Автозбереження зупинено. Завантаж копію свого коду, а потім онови
              сторінку, щоб відкрити новішу чернетку. Твої зміни автоматично не
              об’єднуються.
            </p>
          )}
        </div>
      </div>
      <dialog
        ref={recoveryDialog}
        aria-labelledby="recovery-title"
        className="reset-dialog"
        onCancel={closeRecovery}
      >
        <h2 id="recovery-title">Відновити чернетку з початкових файлів?</h2>
        <p>
          Попередній запис залишиться в локальній резервній копії. Для власної
          копії спочатку завантаж його кнопкою над редактором. Робочу чернетку
          буде замінено початковими файлами цього уроку.
        </p>
        <div>
          <Button variant="outline" autoFocus onClick={closeRecovery}>
            Скасувати
          </Button>
          <Button
            onClick={() => {
              closeRecovery();
              void workspace.storage.recover();
            }}
          >
            Зберегти копію та відновити
          </Button>
        </div>
      </dialog>
      <DraftBackups workspace={workspace} />
      {workspace.storage.canView && (
        <>
          <div className="workspace-toolbar">
            <Button
              disabled={
                workspace.busy || !visible || !workspace.storage.canEdit
              }
              onClick={() => void workspace.execute("run")}
            >
              Запустити
            </Button>
            <Button
              variant="outline"
              disabled={
                workspace.busy || !visible || !workspace.storage.canEdit
              }
              onClick={() => void workspace.execute("check")}
            >
              Перевірити
            </Button>
            <Button
              variant="outline"
              disabled={!workspace.busy && !workspace.preview}
              onClick={workspace.stop}
            >
              Зупинити
            </Button>
            <Button
              ref={resetButton}
              variant="ghost"
              disabled={!workspace.storage.canEdit}
              onClick={() => dialog.current?.showModal()}
            >
              Скинути код
            </Button>
          </div>
          <p role="status" aria-live="polite" className="workspace-status">
            {workspace.status}
          </p>
          <div className="workspace-code-grid">
            <nav aria-label="Дерево файлів FocusBoard" className="file-tree">
              <ul>
                {draft.files.map((file) => (
                  <li key={file.path}>
                    <button
                      aria-current={
                        file.path === activeFile ? "true" : undefined
                      }
                      onClick={() => workspace.setActiveFile(file.path)}
                    >
                      {file.path}
                      {!editablePaths.includes(file.path) && (
                        <small>лише читання</small>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
            <div className="workspace-editor">
              <div
                role="tablist"
                aria-label="Файли проєкту"
                className="file-tabs"
              >
                {draft.files.map((file, index) => (
                  <button
                    key={file.path}
                    ref={(node) => {
                      if (node) fileButtons.current.set(file.path, node);
                      else fileButtons.current.delete(file.path);
                    }}
                    role="tab"
                    id={`file-tab-${index}`}
                    aria-controls="file-editor-panel"
                    aria-selected={file.path === activeFile}
                    tabIndex={file.path === activeFile ? 0 : -1}
                    onClick={() => workspace.setActiveFile(file.path)}
                    onKeyDown={(event) => {
                      let target = index;
                      if (event.key === "ArrowRight")
                        target = (index + 1) % draft.files.length;
                      else if (event.key === "ArrowLeft")
                        target =
                          (index + draft.files.length - 1) % draft.files.length;
                      else if (event.key === "Home") target = 0;
                      else if (event.key === "End")
                        target = draft.files.length - 1;
                      else return;
                      event.preventDefault();
                      workspace.setActiveFile(draft.files[target].path);
                      fileButtons.current
                        .get(draft.files[target].path)
                        ?.focus();
                    }}
                  >
                    {file.path}
                  </button>
                ))}
              </div>
              <div
                id="file-editor-panel"
                role="tabpanel"
                aria-labelledby={`file-tab-${draft.files.findIndex((file) => file.path === activeFile)}`}
              >
                <EditorBoundary
                  key={boundaryKey}
                  fallback={
                    <div>
                      <p role="alert">
                        Редактор зіткнувся з помилкою. Твій код залишився в
                        чернетці.
                      </p>
                      <Button
                        onClick={() => setBoundaryKey((value) => value + 1)}
                      >
                        Відновити редактор
                      </Button>
                      <textarea
                        className="code-fallback"
                        aria-label={`Код ${activeFile}`}
                        value={selected.content}
                        readOnly={
                          !workspace.storage.canEdit ||
                          !editablePaths.includes(activeFile)
                        }
                        onChange={(event) =>
                          workspace.edit(activeFile, event.target.value)
                        }
                      />
                    </div>
                  }
                >
                  <MonacoEditor
                    files={draft.files}
                    activeFile={activeFile}
                    editablePaths={
                      workspace.storage.canEdit ? editablePaths : []
                    }
                    visible={visible}
                    onEdit={workspace.edit}
                    onRun={() => {
                      if (visible && !workspace.busy)
                        void workspace.execute("run");
                    }}
                    onCheck={() => {
                      if (visible && !workspace.busy)
                        void workspace.execute("check");
                    }}
                  />
                </EditorBoundary>
              </div>
              <p className="editor-help">
                {editablePaths.includes(activeFile)
                  ? "Редагуй цей файл."
                  : "Це основа проєкту — у цьому уроці лише читання."}{" "}
                Ctrl+Enter — запуск; Ctrl+Shift+Enter — перевірка. Tab
                переходить до наступного елемента.
              </p>
            </div>
          </div>
          <div className="workspace-output-grid">
            <section
              className="workspace-console"
              aria-label="Консоль виконання"
            >
              <h3>Консоль</h3>
              {workspace.events.some((event) => "text" in event) ? (
                <ol>
                  {workspace.events.map((event, index) =>
                    "text" in event ? (
                      <li
                        key={index}
                        className={
                          event.kind === "error" || event.kind === "timeout"
                            ? "console-error"
                            : ""
                        }
                      >
                        <pre>{event.text}</pre>
                      </li>
                    ) : null,
                  )}
                </ol>
              ) : (
                <p>
                  Після запуску тут з’являться повідомлення та помилки коду.
                </p>
              )}
            </section>
            <section>
              <h3>Перегляд FocusBoard</h3>
              <p>
                {workspace.preview
                  ? "Поточний перегляд закриється автоматично через 10 секунд від запуску."
                  : "Натисни «Запустити», щоб відкрити перегляд FocusBoard."}
              </p>
              <div
                className="workspace-preview"
                ref={(element) => workspace.attachPreview(element)}
              />
            </section>
          </div>
          <CheckResults workspace={workspace} />
          <dialog
            ref={dialog}
            aria-labelledby="reset-title"
            className="reset-dialog"
            onCancel={closeReset}
          >
            <h2 id="reset-title">Відновити початковий код?</h2>
            <p>
              Твої зміни в цьому уроці буде втрачено. Цю дію не можна скасувати.
            </p>
            <div>
              <Button variant="outline" autoFocus onClick={closeReset}>
                Залишити мій код
              </Button>
              <Button
                onClick={() => {
                  workspace.reset();
                  closeReset();
                }}
              >
                Відновити початковий код
              </Button>
            </div>
          </dialog>
        </>
      )}
    </section>
  );
}
