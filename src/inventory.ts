// Inventario local (solo IDs adquiridos) y backup JSON manual.

export const STORAGE_KEY = 'mis-touch:inventory:v1';
const STORAGE_VERSION = 1;

export const BACKUP_APP = 'mis-touch';
export const BACKUP_VERSION = 1;
export const MAX_BACKUP_BYTES = 1_000_000;

export type KeyValueStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export interface LoadedInventory {
  owned: Set<string>;
  /** IDs guardados que no existen en el catálogo activo. Se conservan en storage por si el catálogo cambia. */
  orphans: string[];
  problem: 'none' | 'unavailable' | 'corrupt';
}

/** Devuelve localStorage si se puede usar; `null` si está bloqueado o lleno. */
export function getBrowserStorage(): KeyValueStorage | null {
  try {
    const storage = window.localStorage;
    const probe = `${STORAGE_KEY}:probe`;
    storage.setItem(probe, '1');
    storage.removeItem(probe);
    return storage;
  } catch {
    return null;
  }
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === 'string');
}

/** IDs retirados del catálogo → ID vigente (p. ej. GY242 → G242). */
export type IdAliases = Readonly<Record<string, string>>;

function resolveAlias(id: string, aliases: IdAliases): string {
  return Object.hasOwn(aliases, id) ? aliases[id]! : id;
}

export function loadInventory(storage: KeyValueStorage | null, validIds: ReadonlySet<string>, aliases: IdAliases = {}): LoadedInventory {
  if (!storage) return { owned: new Set(), orphans: [], problem: 'unavailable' };

  let raw: string | null;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch {
    return { owned: new Set(), orphans: [], problem: 'unavailable' };
  }
  if (raw === null) return { owned: new Set(), orphans: [], problem: 'none' };

  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    data = undefined;
  }
  const stored = data as { version?: unknown; ownedIds?: unknown } | null | undefined;
  if (typeof stored !== 'object' || stored === null || stored.version !== STORAGE_VERSION || !isStringArray(stored.ownedIds)) {
    // Se guarda una copia del dato dañado antes de que el próximo guardado lo pise.
    try {
      storage.setItem(`${STORAGE_KEY}:corrupt`, raw);
    } catch {
      /* sin espacio: no hay más que hacer */
    }
    return { owned: new Set(), orphans: [], problem: 'corrupt' };
  }

  const owned = new Set<string>();
  const orphans = new Set<string>();
  for (const storedId of stored.ownedIds) {
    const id = resolveAlias(storedId, aliases);
    (validIds.has(id) ? owned : orphans).add(id);
  }
  return { owned, orphans: [...orphans], problem: 'none' };
}

/** Persiste la selección. Devuelve `false` si no se pudo guardar. */
export function saveInventory(storage: KeyValueStorage | null, ownedIds: Iterable<string>, orphans: readonly string[] = []): boolean {
  if (!storage) return false;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify({ version: STORAGE_VERSION, ownedIds: [...ownedIds, ...orphans] }));
    return true;
  } catch {
    return false;
  }
}

export interface Backup {
  app: typeof BACKUP_APP;
  backupVersion: typeof BACKUP_VERSION;
  exportedAt: string;
  ownedIds: string[];
}

export function createBackup(ownedIds: Iterable<string>, now: Date): Backup {
  return { app: BACKUP_APP, backupVersion: BACKUP_VERSION, exportedAt: now.toISOString(), ownedIds: [...ownedIds] };
}

export type BackupParseResult =
  | { ok: true; ids: string[]; unknownIds: string[] }
  | { ok: false; error: string };

/** Valida el archivo completo antes de que la app toque el inventario actual. */
export function parseBackup(text: string, validIds: ReadonlySet<string>, aliases: IdAliases = {}): BackupParseResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: 'El archivo no es un JSON válido.' };
  }
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return { ok: false, error: 'El archivo no tiene el formato de un backup de Mis Touch.' };
  }
  const backup = data as Record<string, unknown>;
  if (backup.app !== BACKUP_APP) {
    return { ok: false, error: 'El archivo no es un backup de Mis Touch.' };
  }
  if (backup.backupVersion !== BACKUP_VERSION) {
    return { ok: false, error: `Versión de backup no soportada (${String(backup.backupVersion)}).` };
  }
  if (!isStringArray(backup.ownedIds)) {
    return { ok: false, error: 'La lista de marcadores del backup está dañada.' };
  }

  const ids: string[] = [];
  const unknownIds: string[] = [];
  for (const id of new Set(backup.ownedIds.map((id) => resolveAlias(id, aliases)))) (validIds.has(id) ? ids : unknownIds).push(id);
  return { ok: true, ids, unknownIds };
}
