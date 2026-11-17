import type * as Monaco from "monaco-editor/editor/editor.api";
export type MonacoApi = typeof Monaco;
let loading: Promise<MonacoApi> | null = null;
export function loadMonaco(): Promise<MonacoApi> {
  const scope = window as typeof window & { AcademyMonaco?: MonacoApi };
  if (scope.AcademyMonaco) return Promise.resolve(scope.AcademyMonaco);
  if (loading) return loading;
  loading = new Promise<MonacoApi>((resolve, reject) => {
    const style = document.createElement("link");
    style.rel = "stylesheet";
    style.href = "/monaco/editor.css";
    const script = document.createElement("script");
    script.src = "/monaco/editor.js";
    script.async = true;
    const timeout = setTimeout(() => fail(), 15000);
    function fail() {
      clearTimeout(timeout);
      style.remove();
      script.remove();
      loading = null;
      reject(
        new Error(
          "Не вдалося завантажити Monaco. Код залишається доступним у простому редакторі.",
        ),
      );
    }
    style.onerror = fail;
    script.onerror = fail;
    style.onload = () => document.head.append(script);
    script.onload = () => {
      clearTimeout(timeout);
      if (scope.AcademyMonaco) resolve(scope.AcademyMonaco);
      else fail();
    };
    document.head.append(style);
  });
  return loading;
}
