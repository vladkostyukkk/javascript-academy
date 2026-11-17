"use client";
import { useEffect, useRef, useState } from "react";
import type { editor } from "monaco-editor/editor/editor.api";
import type { FileMap } from "@/lib/lessons/schema";
import { loadMonaco } from "@/lib/workspace/monaco-loader";

type Props = {
  files: FileMap;
  activeFile: string;
  editablePaths: string[];
  visible: boolean;
  onEdit: (path: string, value: string) => void;
  onRun: () => void;
  onCheck: () => void;
};
export function MonacoEditor(props: Props) {
  const host = useRef<HTMLDivElement>(null);
  const instance = useRef<editor.IStandaloneCodeEditor | null>(null);
  const models = useRef(new Map<string, editor.ITextModel>());
  const views = useRef(new Map<string, editor.ICodeEditorViewState | null>());
  const currentPath = useRef(props.activeFile);
  const current = useRef(props);
  useEffect(() => {
    current.current = props;
  });
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [diagnostics, setDiagnostics] = useState<Record<string, string[]>>({});
  const [retry, setRetry] = useState(0);
  const disposables = useRef<Array<{ dispose: () => void }>>([]);
  useEffect(() => {
    if (!props.visible || instance.current || !host.current) return;
    let cancelled = false;
    void loadMonaco()
      .then((monaco) => {
        if (cancelled || !host.current) return;
        monaco.editor.defineTheme("academy-dark", {
          base: "vs-dark",
          inherit: true,
          rules: [{ token: "comment", foreground: "91AE82" }],
          colors: {
            "editor.background": "#1e1e1e",
            "editorLineNumber.foreground": "#a0a699",
          },
        });
        const scope = crypto.randomUUID();
        for (const file of current.current.files) {
          const model = monaco.editor.createModel(
            file.content,
            file.path.endsWith(".js")
              ? "javascript"
              : file.path.endsWith(".css")
                ? "css"
                : "html",
            monaco.Uri.parse(`file:///${scope}/${file.path}`),
          );
          models.current.set(file.path, model);
          disposables.current.push(
            model.onDidChangeContent(() =>
              current.current.onEdit(file.path, model.getValue()),
            ),
          );
        }
        currentPath.current = current.current.activeFile;
        const code = monaco.editor.create(host.current, {
          model: models.current.get(current.current.activeFile),
          theme: "academy-dark",
          automaticLayout: true,
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: "on",
          scrollBeyondLastLine: false,
          wordWrap: "on",
          tabSize: 2,
          readOnly: !current.current.editablePaths.includes(
            current.current.activeFile,
          ),
          ariaLabel: `Код ${current.current.activeFile}${current.current.editablePaths.includes(current.current.activeFile) ? "" : " — лише читання"}`,
          readOnlyMessage: {
            value:
              "Цей файл є основою проєкту. У цьому уроці редагуй src/app.js.",
          },
          accessibilitySupport: "on",
          tabFocusMode: true,
          unicodeHighlight: {
            ambiguousCharacters: false,
            nonBasicASCII: false,
          },
          quickSuggestions: false,
        });
        instance.current = code;
        code.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () =>
          current.current.onRun(),
        );
        code.addCommand(
          monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Enter,
          () => current.current.onCheck(),
        );
        disposables.current.push(
          monaco.editor.onDidChangeMarkers(() => {
            setDiagnostics(
              Object.fromEntries(
                [...models.current].map(([path, model]) => [
                  path,
                  monaco.editor
                    .getModelMarkers({ resource: model.uri })
                    .slice(0, 6)
                    .map(
                      (marker) =>
                        `Рядок ${marker.startLineNumber}: ${marker.message}`,
                    ),
                ]),
              ),
            );
          }),
        );
        setReady(true);
        setError(null);
      })
      .catch((reason) => {
        if (!cancelled) {
          for (const disposable of disposables.current) disposable.dispose();
          disposables.current = [];
          instance.current?.dispose();
          instance.current = null;
          for (const model of models.current.values()) model.dispose();
          models.current.clear();
          setError(
            reason instanceof Error ? reason.message : "Редактор недоступний.",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [props.visible, retry]);
  useEffect(
    () => () => {
      for (const disposable of disposables.current) disposable.dispose();
      instance.current?.dispose();
      for (const model of models.current.values()) model.dispose();
    },
    [],
  );
  useEffect(() => {
    const code = instance.current;
    if (!code) return;
    for (const file of props.files) {
      const model = models.current.get(file.path);
      if (model && model.getValue() !== file.content)
        model.setValue(file.content);
    }
    if (currentPath.current !== props.activeFile) {
      views.current.set(currentPath.current, code.saveViewState());
      code.setModel(models.current.get(props.activeFile) ?? null);
      code.restoreViewState(views.current.get(props.activeFile) ?? null);
      currentPath.current = props.activeFile;
    }
    code.updateOptions({
      readOnly: !props.editablePaths.includes(props.activeFile),
      ariaLabel: `Код ${props.activeFile}${props.editablePaths.includes(props.activeFile) ? "" : " — лише читання"}`,
    });
    if (props.visible) code.layout();
  }, [
    props.files,
    props.activeFile,
    props.editablePaths,
    props.visible,
    ready,
  ]);
  const file = props.files.find((file) => file.path === props.activeFile)!;
  const activeDiagnostics = diagnostics[props.activeFile] ?? [];
  return (
    <>
      {!ready && !error && <p>Завантажуємо редактор…</p>}
      {error && (
        <div>
          <p role="alert">{error}</p>
          <button
            onClick={() => {
              setError(null);
              setRetry((value) => value + 1);
            }}
          >
            Повторити завантаження редактора
          </button>
          <textarea
            className="code-fallback"
            aria-label={`Код ${file.path}`}
            value={file.content}
            readOnly={!props.editablePaths.includes(file.path)}
            onChange={(event) => props.onEdit(file.path, event.target.value)}
          />
        </div>
      )}
      <div ref={host} className="monaco-host" hidden={Boolean(error)} />
      {activeDiagnostics.length > 0 && (
        <ul className="editor-diagnostics" aria-label="Підказки синтаксису">
          {activeDiagnostics.map((message, index) => (
            <li key={index}>{message}</li>
          ))}
        </ul>
      )}
    </>
  );
}
