import { restoreTasks } from "../storage.js";

export function parseTaskFile(raw) {
  return restoreTasks(raw);
}

export function countImportedTasks(raw) {
  return parseTaskFile(raw)?.length ?? -1;
}

export function makeTaskBlob(tasks) {
  return new Blob([JSON.stringify({ version: 2, tasks }, null, 2)], {
    type: "application/json",
  });
}
