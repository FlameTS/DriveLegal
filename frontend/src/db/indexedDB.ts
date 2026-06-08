import { openDB } from 'idb';
import type { IDBPDatabase } from 'idb';

const DB_NAME = 'drivelegal_offline_db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Store general items
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata');
        }
        // Store violations
        if (!db.objectStoreNames.contains('violations')) {
          db.createObjectStore('violations', { keyPath: 'code' });
        }
        // Store rules by state
        if (!db.objectStoreNames.contains('state_rules')) {
          db.createObjectStore('state_rules', { keyPath: 'state_code' });
        }
      },
    });
  }
  return dbPromise;
}

export async function saveOfflineViolations(violations: any[]) {
  const db = await getDB();
  const tx = db.transaction('violations', 'readwrite');
  const store = tx.objectStore('violations');
  await store.clear();
  for (const v of violations) {
    await store.put(v);
  }
  await tx.done;
  // Also save updated timestamp
  const txMeta = db.transaction('metadata', 'readwrite');
  await txMeta.objectStore('metadata').put(Date.now(), 'violations_updated');
  await txMeta.done;
}

export async function getOfflineViolations(): Promise<any[]> {
  const db = await getDB();
  return db.getAll('violations');
}

export async function saveOfflineStateRules(stateCode: string, rules: any[]) {
  const db = await getDB();
  const tx = db.transaction('state_rules', 'readwrite');
  await tx.objectStore('state_rules').put({
    state_code: stateCode,
    rules,
    updated_at: Date.now()
  });
  await tx.done;
}

export async function getOfflineStateRules(stateCode: string): Promise<any[] | null> {
  const db = await getDB();
  const data = await db.get('state_rules', stateCode);
  return data ? data.rules : null;
}

export async function getOfflineLastUpdated(): Promise<Record<string, number>> {
  const db = await getDB();
  const tx = db.transaction('metadata', 'readonly');
  const store = tx.objectStore('metadata');
  const violationsUpdated = await store.get('violations_updated') || 0;
  return { violationsUpdated };
}
