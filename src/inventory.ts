// Inventario local (código → cantidad) y backup JSON manual.

export const STORAGE_KEY = 'mis-touch:inventory:v2';
/** Formato anterior (solo IDs). Se lee una vez para migrar y no se borra. */
export const LEGACY_STORAGE_KEY = 'mis-touch:inventory:v1';
const STORAGE_VERSION = 2;

export const BACKUP_APP = 'mis-touch';
export const BACKUP_VERSION = 2;
export const MAX_BACKUP_BYTES = 1_000_000;

/** Tope de unidades por color: alcanza de sobra y entra en la tarjeta. */
export const MAX_COUNT = 99;

/** Código de marcador → unidades (entero entre 1 y `MAX_COUNT`). Un color sin entrada no se tiene. */
export type Counts = Map<string, number>;

export type KeyValueStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export interface LoadedInventory {
  owned: Counts;
  /** Códigos guardados que no existen en el catálogo activo. Se conservan en storage por si el catálogo cambia. */
  orphans: Counts;
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

function isValidCount(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 1 && (value as number) <= MAX_COUNT;
}

/** `{ "R1": 2 }` → entradas; `null` si la estructura o alguna cantidad es inválida. */
function parseCounts(value: unknown): [string, number][] | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const entries = Object.entries(value);
  return entries.every(([, count]) => isValidCount(count)) ? (entries as [string, number][]) : null;
}

/** IDs retirados del catálogo → ID vigente (p. ej. GY242 → G242). */
export type IdAliases = Readonly<Record<string, string>>;

function resolveAlias(id: string, aliases: IdAliases): string {
  return Object.hasOwn(aliases, id) ? aliases[id]! : id;
}

/**
 * Separa códigos vigentes de huérfanos y migra alias. Si un código viejo y su
 * reemplazo aparecen juntos, describen el mismo marcador: se queda la cantidad mayor.
 */
function splitCounts(entries: Iterable<[string, number]>, validIds: ReadonlySet<string>, aliases: IdAliases): { owned: Counts; orphans: Counts } {
  const owned: Counts = new Map();
  const orphans: Counts = new Map();
  for (const [storedId, count] of entries) {
    const id = resolveAlias(storedId, aliases);
    const target = validIds.has(id) ? owned : orphans;
    target.set(id, Math.max(target.get(id) ?? 0, count));
  }
  return { owned, orphans };
}

export function loadInventory(storage: KeyValueStorage | null, validIds: ReadonlySet<string>, aliases: IdAliases = {}): LoadedInventory {
  const empty = (problem: LoadedInventory['problem']): LoadedInventory => ({ owned: new Map(), orphans: new Map(), problem });
  if (!storage) return empty('unavailable');

  let key = STORAGE_KEY;
  let raw: string | null;
  try {
    raw = storage.getItem(STORAGE_KEY);
    if (raw === null) {
      key = LEGACY_STORAGE_KEY;
      raw = storage.getItem(LEGACY_STORAGE_KEY);
    }
  } catch {
    return empty('unavailable');
  }
  if (raw === null) return empty('none');

  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    data = undefined;
  }
  const stored = data as { version?: unknown; counts?: unknown; ownedIds?: unknown } | null | undefined;
  let entries: [string, number][] | null = null;
  if (typeof stored === 'object' && stored !== null) {
    if (key === STORAGE_KEY && stored.version === STORAGE_VERSION) entries = parseCounts(stored.counts);
    // Formato v1: cada color marcado pasa a tener 1 unidad.
    if (key === LEGACY_STORAGE_KEY && stored.version === 1 && isStringArray(stored.ownedIds)) entries = stored.ownedIds.map((id) => [id, 1]);
  }
  if (!entries) {
    // Se guarda una copia del dato dañado antes de que el próximo guardado lo pise.
    try {
      storage.setItem(`${key}:corrupt`, raw);
    } catch {
      /* sin espacio: no hay más que hacer */
    }
    return empty('corrupt');
  }

  return { ...splitCounts(entries, validIds, aliases), problem: 'none' };
}

/** Persiste la colección. Devuelve `false` si no se pudo guardar. */
export function saveInventory(storage: KeyValueStorage | null, owned: Iterable<[string, number]>, orphans: Iterable<[string, number]> = []): boolean {
  if (!storage) return false;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify({ version: STORAGE_VERSION, counts: Object.fromEntries([...owned, ...orphans]) }));
    return true;
  } catch {
    return false;
  }
}

export interface Backup {
  app: typeof BACKUP_APP;
  backupVersion: typeof BACKUP_VERSION;
  exportedAt: string;
  counts: Record<string, number>;
}

export function createBackup(owned: Iterable<[string, number]>, now: Date): Backup {
  return { app: BACKUP_APP, backupVersion: BACKUP_VERSION, exportedAt: now.toISOString(), counts: Object.fromEntries(owned) };
}

export type BackupParseResult =
  | { ok: true; owned: Counts; unknown: Counts }
  | { ok: false; error: string };

/** Valida el archivo completo antes de que la app toque el inventario actual. Acepta backups v1 (sin cantidades) y v2. */
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

  let entries: [string, number][] | null;
  if (backup.backupVersion === 1) {
    entries = isStringArray(backup.ownedIds) ? backup.ownedIds.map((id) => [id, 1]) : null;
  } else if (backup.backupVersion === BACKUP_VERSION) {
    entries = parseCounts(backup.counts);
  } else {
    return { ok: false, error: `Versión de backup no soportada (${String(backup.backupVersion)}).` };
  }
  if (!entries) {
    return { ok: false, error: 'La lista de marcadores del backup está dañada.' };
  }

  const { owned, orphans } = splitCounts(entries, validIds, aliases);
  return { ok: true, owned, unknown: orphans };
}
