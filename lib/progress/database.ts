export function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("javascript-academy", 3);
    let abandoned = false;
    request.onupgradeneeded = (event) => {
      const database = request.result;
      // Additive, atomic migration: v1 draft records and backups remain untouched.
      if (event.oldVersion < 1) {
        database.createObjectStore("drafts");
        database.createObjectStore("draft-backups", { autoIncrement: true });
      }
      if (event.oldVersion < 2) {
        database.createObjectStore("checkpoints");
        database.createObjectStore("progress");
        database.createObjectStore("forks");
      }
      if (event.oldVersion < 3) {
        // Additive migration; drafts, checkpoints and completed records are untouched.
        database.createObjectStore("learning-sessions");
        database.createObjectStore("learning-backups", { autoIncrement: true });
      }
    };
    request.onblocked = () => {
      abandoned = true;
      reject(
        new Error("Закрий інші вкладки академії та повтори відкриття сховища."),
      );
    };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      database.onversionchange = () => database.close();
      if (abandoned) database.close();
      else resolve(database);
    };
  });
}
