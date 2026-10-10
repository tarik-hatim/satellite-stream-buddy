/** Tiny IndexedDB key/value store (falls back to memory if unavailable). */
const DB = "pulseepg";
const STORE = "kv";
const mem = new Map<string, unknown>();

function open(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  return new Promise((res) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => res(r.result);
    r.onerror = () => res(null);
  });
}

export async function idbGet<T>(key: string): Promise<T | undefined> {
  const db = await open();
  if (!db) return mem.get(key) as T | undefined;
  return new Promise((res) => {
    const q = db.transaction(STORE).objectStore(STORE).get(key);
    q.onsuccess = () => res(q.result as T | undefined);
    q.onerror = () => res(undefined);
  });
}

export async function idbSet(key: string, value: unknown) {
  const db = await open();
  if (!db) return void mem.set(key, value);
  return new Promise<void>((res) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => res();
    tx.onerror = () => res();
  });
}
