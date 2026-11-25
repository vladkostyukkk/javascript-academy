import { useSyncExternalStore } from "react";

export const localRunnerNotice =
  "Запуск і перевірка коду доступні в локальній копії Академії.";

export function isLocalRunnerHost(hostname: string) {
  return (
    hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]"
  );
}

const subscribe = () => () => {};
const serverSnapshot = () => false;
const browserSnapshot = () => isLocalRunnerHost(window.location.hostname);

export function useLocalRunnerAccess() {
  return useSyncExternalStore(subscribe, browserSnapshot, serverSnapshot);
}
