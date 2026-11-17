"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { startRunner, type RunnerEvent } from "@/lib/runner/controller";
import { runnerFixtures, securityFixtures } from "@/lib/runner/fixtures";
import { prepareRun } from "@/lib/runner/prepare";

export function RunnerLab() {
  const [selection, setSelection] = useState("pure");
  const [negative, setNegative] = useState(false);
  const [events, setEvents] = useState<RunnerEvent[]>([]);
  const [status, setStatus] = useState("Готово до запуску");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const active = useRef<ReturnType<typeof startRunner> | null>(null);
  const generation = useRef(0);
  const fixture = runnerFixtures.find((item) => item.id === selection);
  const plan = fixture
    ? negative
      ? fixture.negative
      : fixture.positive
    : securityFixtures.find((item) => item.id === selection)!.plan;
  useEffect(
    () => () => {
      generation.current++;
      active.current?.dispose();
    },
    [],
  );

  function stop() {
    generation.current++;
    active.current?.dispose();
    active.current = null;
    setBusy(false);
    setPreview(false);
    setStatus("Запуск зупинено");
  }
  async function run() {
    active.current?.dispose();
    const version = ++generation.current;
    setEvents([]);
    setBusy(true);
    setPreview(false);
    setStatus("Підготовка запуску…");
    try {
      const prepared = await prepareRun(plan);
      const response = await fetch("/runner/runtime.js");
      if (!response.ok)
        throw new Error("Runtime відсутній. Виконай npm run build:runner.");
      const runtime = await response.text();
      if (version !== generation.current || !container.current) return;
      setPreview(true);
      setStatus("Виконується…");
      active.current = startRunner(
        container.current,
        runtime,
        prepared,
        (event) => {
          if (version !== generation.current) return;
          if (event.kind === "disposed") {
            setPreview(false);
            return;
          }
          setEvents((previous) => [...previous, event]);
          if (event.kind === "result") {
            setBusy(false);
            setStatus(
              event.passed ? "Перевірку пройдено" : "Перевірку не пройдено",
            );
          }
          if (event.kind === "error" || event.kind === "timeout") {
            setBusy(false);
            setStatus(
              event.kind === "timeout" ? "Ліміт часу" : "Помилка виконання",
            );
          }
        },
      );
    } catch (error) {
      if (version !== generation.current) return;
      setBusy(false);
      setStatus("Запуск відхилено");
      setEvents([
        {
          kind: "error",
          text:
            error instanceof Error
              ? error.message
              : "Не вдалося підготувати запуск.",
          stack: "",
        },
      ]);
    }
  }
  return (
    <section className="runner-lab" aria-label="Прототип runner">
      <div className="runner-controls">
        <label>
          Сценарій
          <select
            aria-label="Сценарій"
            value={selection}
            onChange={(event) => {
              stop();
              setSelection(event.target.value);
              setNegative(false);
              setEvents([]);
            }}
          >
            <optgroup label="Основні fixtures">
              {runnerFixtures.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </optgroup>
            <optgroup label="Діагностика меж">
              {securityFixtures.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </optgroup>
          </select>
        </label>
        {fixture && (
          <label className="runner-negative">
            <input
              type="checkbox"
              checked={negative}
              onChange={(event) => {
                stop();
                setNegative(event.target.checked);
                setEvents([]);
              }}
            />{" "}
            Негативний сценарій
          </label>
        )}
        <Button onClick={() => void run()} disabled={busy}>
          Запустити сценарій
        </Button>
        <Button variant="outline" onClick={stop} disabled={!busy && !preview}>
          Зупинити
        </Button>
      </div>
      <p>
        {fixture?.description ??
          "Окрема діагностична перевірка обмежень прототипу."}
      </p>
      <p role="status" aria-live="polite" className="runner-status">
        {status}
      </p>
      <div className="runner-panels">
        <section aria-label="Консоль та результат">
          <h2>Консоль та результат</h2>
          <ol className="runner-output">
            {events
              .filter((event) => event.kind !== "ready")
              .map((event, index) => (
                <li key={index}>
                  {event.kind === "result" ? (
                    <>
                      <strong>{event.feedback}</strong>
                      <pre>{event.actual}</pre>
                    </>
                  ) : "text" in event ? (
                    <pre>{event.text}</pre>
                  ) : null}
                </li>
              ))}
          </ol>
        </section>
        <section>
          <h2>Ізольований перегляд</h2>
          <p>
            {preview
              ? "Перегляд діє до 10 секунд від запуску."
              : "Активного перегляду немає."}
          </p>
          <div className="runner-preview" ref={container} />
        </section>
      </div>
      <details className="runner-source">
        <summary>Файли сценарію</summary>
        {plan.files.map((file) => (
          <section key={file.path}>
            <h3>{file.path}</h3>
            <pre>{file.content}</pre>
          </section>
        ))}
      </details>
    </section>
  );
}
