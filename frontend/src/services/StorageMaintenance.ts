import AsyncStorage from '@react-native-async-storage/async-storage';

export const BACKUP_KEYS = ['@transitlink_app_v1', '@transitlink_tickets_v1', '@transit_incidents'] as const;
const JOURNAL = '@transitlink_restore_journal_v1';
let maintenance = false;
let recovery: Promise<void> | null = null;
const drains: Array<() => Promise<unknown>> = [];
export const registerStorageQueue = (drain: () => Promise<unknown>) => { drains.push(drain); };
export const storageIsBusy = () => maintenance;

// If a restore was interrupted, recover the pre-restore snapshot before any read.
export function recoverStorage(): Promise<void> {
  if (!recovery) recovery = (async () => {
    const raw = await AsyncStorage.getItem(JOURNAL);
    if (raw !== null) {
      const entries: unknown = JSON.parse(raw);
      if (!Array.isArray(entries) || entries.length !== BACKUP_KEYS.length || !entries.every((e, i) =>
        Array.isArray(e) && e[0] === BACKUP_KEYS[i] && (e[1] === null || typeof e[1] === 'string')))
        throw new Error('Restore recovery data is invalid. Existing data was preserved.');
      await writeEntries(entries as Array<[string, string | null]>);
      await AsyncStorage.removeItem(JOURNAL);
    }
  })().finally(() => { recovery = null; });
  return recovery;
}
async function writeEntries(entries: ReadonlyArray<readonly [string, string | null]>) {
  await AsyncStorage.multiSet(entries.filter(e => e[1] !== null).map(e => [e[0], e[1]!]));
  const missing = entries.filter(e => e[1] === null).map(e => e[0]);
  if (missing.length) await AsyncStorage.multiRemove(missing);
}
export async function runMaintenance<T>(operation: () => Promise<T>): Promise<T> {
  if (maintenance) throw new Error('A backup or restore is already running.');
  maintenance = true;
  try { await Promise.all(drains.map(d => d().catch(() => undefined))); await recoverStorage(); return await operation(); }
  finally { maintenance = false; }
}
export async function replaceStorage(entries: Array<[string, string | null]>) {
  const original = await AsyncStorage.multiGet([...BACKUP_KEYS]);
  await AsyncStorage.setItem(JOURNAL, JSON.stringify(original));
  try { await writeEntries(entries); await AsyncStorage.removeItem(JOURNAL); }
  catch (cause) {
    try { await writeEntries(original); await AsyncStorage.removeItem(JOURNAL); }
    catch { throw new Error('Restore failed. Recovery is saved and will retry before the next data operation.'); }
    throw cause;
  }
}
