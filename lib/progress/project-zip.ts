import { fileMapSchema, type FileMap } from "../lessons/schema";

const encoder = new TextEncoder();
const instructions = `FocusBoard

Розпакуйте архів у нову папку. Запустіть у ній локальний статичний сервер, наприклад:
  python -m http.server 8000 --bind 127.0.0.1
Відкрийте http://127.0.0.1:8000 у браузері. Початкові задачі читаються з mock/tasks.json.
Дані цієї копії зберігаються у браузері за адресою локального сервера.
`;

function crc32(bytes: Uint8Array) {
  let crc = -1;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ -1) >>> 0;
}

export function createProjectZip(files: FileMap): Uint8Array<ArrayBuffer> {
  const entries = [
    ...fileMapSchema.parse(files),
    { path: "README.txt", content: instructions },
  ].map(({ path, content }) => ({
    name: encoder.encode(path),
    data: encoder.encode(content),
  }));
  const localSize = entries.reduce(
    (sum, { name, data }) => sum + 30 + name.length + data.length,
    0,
  );
  const directorySize = entries.reduce(
    (sum, { name }) => sum + 46 + name.length,
    0,
  );
  const zip = new Uint8Array(localSize + directorySize + 22);
  const view = new DataView(zip.buffer);
  const u16 = (at: number, value: number) => view.setUint16(at, value, true);
  const u32 = (at: number, value: number) => view.setUint32(at, value, true);
  let local = 0;
  let directory = localSize;

  // ZIP store method preserves the UTF-8 bytes exactly without a compressor.
  for (const { name, data } of entries) {
    const crc = crc32(data);
    u32(local, 0x04034b50);
    u16(local + 4, 20);
    u16(local + 6, 0x0800);
    u16(local + 12, 0x21);
    u32(local + 14, crc);
    u32(local + 18, data.length);
    u32(local + 22, data.length);
    u16(local + 26, name.length);
    zip.set(name, local + 30);
    zip.set(data, local + 30 + name.length);

    u32(directory, 0x02014b50);
    u16(directory + 4, 20);
    u16(directory + 6, 20);
    u16(directory + 8, 0x0800);
    u16(directory + 14, 0x21);
    u32(directory + 16, crc);
    u32(directory + 20, data.length);
    u32(directory + 24, data.length);
    u16(directory + 28, name.length);
    u32(directory + 42, local);
    zip.set(name, directory + 46);

    local += 30 + name.length + data.length;
    directory += 46 + name.length;
  }

  u32(directory, 0x06054b50);
  u16(directory + 8, entries.length);
  u16(directory + 10, entries.length);
  u32(directory + 12, directorySize);
  u32(directory + 16, localSize);
  return zip;
}
