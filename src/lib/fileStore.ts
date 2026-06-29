/**
 * IndexedDB wrapper for attachment blobs.
 * Files are stored as raw Blobs — no base64 encoding, no localStorage bloat.
 * Object URLs are created on demand and must be revoked by the caller.
 */

const DB_NAME = 'threed-attachments';
const STORE = 'blobs';
let dbPromise: Promise<IDBDatabase> | null = null;

function getDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => {
        dbPromise = null;
        reject(req.error);
      };
    });
  }
  return dbPromise;
}

export async function saveFile(id: string, blob: Blob): Promise<void> {
  const db = await getDb();
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(blob, id);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}

export async function getBlob(id: string): Promise<Blob | null> {
  const db = await getDb();
  return new Promise((res, rej) => {
    const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(id);
    req.onsuccess = () => res((req.result as Blob) ?? null);
    req.onerror = () => rej(req.error);
  });
}

export async function deleteFile(id: string): Promise<void> {
  const db = await getDb();
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}

/** Converts a stored blob to a base64 data URL (used only for JSON export). */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = () => rej(r.error);
    r.readAsDataURL(blob);
  });
}

/** Save a base64 data URL back as a blob (used when importing a JSON that includes file data). */
export async function saveDataUrl(id: string, dataUrl: string): Promise<void> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  await saveFile(id, blob);
}
