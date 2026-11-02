import { describe, expect, it } from 'vitest';
import {
  createBackup,
  LEGACY_STORAGE_KEY,
  loadInventory,
  MAX_COUNT,
  parseBackup,
  saveInventory,
  STORAGE_KEY,
  type KeyValueStorage,
} from '../src/inventory.ts';

function memoryStorage(initial: Record<string, string> = {}): KeyValueStorage & { data: Map<string, string> } {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
}

const failing: KeyValueStorage = {
  getItem: () => {
    throw new Error('SecurityError');
  },
  setItem: () => {
    throw new Error('QuotaExceededError');
  },
  removeItem: () => undefined,
};

const valid = new Set(['R1', 'R2', '120', 'CG0.5']);
const v2 = (counts: unknown) => ({ [STORAGE_KEY]: JSON.stringify({ version: 2, counts }) });

describe('persistencia', () => {
  it('guardar y volver a leer restaura colores y cantidades', () => {
    const storage = memoryStorage();
    expect(saveInventory(storage, [['R1', 3], ['CG0.5', 1]])).toBe(true);
    const loaded = loadInventory(storage, valid);
    expect([...loaded.owned]).toEqual([['R1', 3], ['CG0.5', 1]]);
    expect(loaded.problem).toBe('none');
  });

  it('solo guarda versión y código → cantidad', () => {
    const storage = memoryStorage();
    saveInventory(storage, [['R1', 2]]);
    expect(JSON.parse(storage.data.get(STORAGE_KEY)!)).toEqual({ version: 2, counts: { R1: 2 } });
  });

  it('sin datos previos empieza vacío', () => {
    expect(loadInventory(memoryStorage(), valid)).toEqual({ owned: new Map(), orphans: new Map(), problem: 'none' });
  });

  it('migra el formato v1: cada color marcado queda con 1 unidad y la clave vieja no se toca', () => {
    const legacy = JSON.stringify({ version: 1, ownedIds: ['R1', '120'] });
    const storage = memoryStorage({ [LEGACY_STORAGE_KEY]: legacy });
    const loaded = loadInventory(storage, valid);
    expect([...loaded.owned]).toEqual([['R1', 1], ['120', 1]]);
    expect(loaded.problem).toBe('none');
    saveInventory(storage, loaded.owned);
    expect(storage.data.get(LEGACY_STORAGE_KEY)).toBe(legacy);
  });

  it('con datos v2 ignora la clave v1', () => {
    const storage = memoryStorage({ ...v2({}), [LEGACY_STORAGE_KEY]: JSON.stringify({ version: 1, ownedIds: ['R1'] }) });
    expect(loadInventory(storage, valid).owned.size).toBe(0);
  });

  it('códigos desconocidos no entran al inventario pero se conservan al guardar, con su cantidad', () => {
    const storage = memoryStorage(v2({ R1: 1, GY999: 4 }));
    const loaded = loadInventory(storage, valid);
    expect([...loaded.owned]).toEqual([['R1', 1]]);
    expect([...loaded.orphans]).toEqual([['GY999', 4]]);
    saveInventory(storage, loaded.owned, loaded.orphans);
    expect(JSON.parse(storage.data.get(STORAGE_KEY)!).counts).toEqual({ R1: 1, GY999: 4 });
  });

  it.each([
    ['JSON inválido', STORAGE_KEY, '{nope'],
    ['versión desconocida', STORAGE_KEY, JSON.stringify({ version: 3, counts: {} })],
    ['counts no es objeto', STORAGE_KEY, JSON.stringify({ version: 2, counts: ['R1'] })],
    ['cantidad cero', STORAGE_KEY, JSON.stringify({ version: 2, counts: { R1: 0 } })],
    ['cantidad decimal', STORAGE_KEY, JSON.stringify({ version: 2, counts: { R1: 1.5 } })],
    ['cantidad mayor al tope', STORAGE_KEY, JSON.stringify({ version: 2, counts: { R1: MAX_COUNT + 1 } })],
    ['cantidad como texto', STORAGE_KEY, JSON.stringify({ version: 2, counts: { R1: '2' } })],
    ['null', STORAGE_KEY, 'null'],
    ['v1 con tipo incorrecto', LEGACY_STORAGE_KEY, JSON.stringify({ version: 1, ownedIds: 'R1' })],
  ])('%s: inicia vacío, avisa y guarda copia del dato dañado', (_label, key, raw) => {
    const storage = memoryStorage({ [key]: raw });
    const loaded = loadInventory(storage, valid);
    expect(loaded.problem).toBe('corrupt');
    expect(loaded.owned.size).toBe(0);
    expect(storage.data.get(`${key}:corrupt`)).toBe(raw);
  });

  it('migra IDs retirados a su código vigente', () => {
    const storage = memoryStorage(v2({ GY242: 2, R1: 1 }));
    const loaded = loadInventory(storage, new Set(['G242', 'R1']), { GY242: 'G242' });
    expect([...loaded.owned]).toEqual([['G242', 2], ['R1', 1]]);
    expect(loaded.orphans.size).toBe(0);
  });

  it('si un código retirado y su reemplazo aparecen juntos, queda la cantidad mayor', () => {
    const storage = memoryStorage(v2({ GY243: 2, G243: 1 }));
    expect([...loadInventory(storage, new Set(['G243']), { GY243: 'G243' }).owned]).toEqual([['G243', 2]]);
  });

  it('storage bloqueado o ausente no rompe', () => {
    expect(loadInventory(failing, valid).problem).toBe('unavailable');
    expect(loadInventory(null, valid).problem).toBe('unavailable');
    expect(saveInventory(failing, [['R1', 1]])).toBe(false);
    expect(saveInventory(null, [['R1', 1]])).toBe(false);
  });
});

describe('backup', () => {
  it('exporta versión, fecha y cantidades', () => {
    const backup = createBackup([['R1', 2], ['120', 1]], new Date('2026-01-01T12:00:00.000Z'));
    expect(backup).toEqual({
      app: 'mis-touch',
      backupVersion: 2,
      exportedAt: '2026-01-01T12:00:00.000Z',
      counts: { R1: 2, '120': 1 },
    });
  });

  it('ida y vuelta restaura el inventario con cantidades', () => {
    const text = JSON.stringify(createBackup([['R1', 5], ['CG0.5', 1]], new Date()));
    const result = parseBackup(text, valid);
    expect(result.ok && [...result.owned]).toEqual([['R1', 5], ['CG0.5', 1]]);
    expect(result.ok && result.unknown.size).toBe(0);
  });

  it('acepta backups v1: cada color con 1 unidad, sin repetidos', () => {
    const text = JSON.stringify({ app: 'mis-touch', backupVersion: 1, exportedAt: '', ownedIds: ['R1', 'R1', 'GY172'] });
    const result = parseBackup(text, valid);
    expect(result.ok && [...result.owned]).toEqual([['R1', 1]]);
    expect(result.ok && [...result.unknown]).toEqual([['GY172', 1]]);
  });

  it('migra IDs retirados del backup y se queda con la cantidad mayor', () => {
    const text = JSON.stringify({ app: 'mis-touch', backupVersion: 2, exportedAt: '', counts: { GY243: 1, G243: 3 } });
    const result = parseBackup(text, new Set(['G243']), { GY243: 'G243' });
    expect(result.ok && [...result.owned]).toEqual([['G243', 3]]);
  });

  it.each([
    ['JSON inválido', 'no es json', /JSON válido/],
    ['array', '[]', /formato/],
    ['otra app', JSON.stringify({ app: 'otra', backupVersion: 2, counts: {} }), /no es un backup/],
    ['versión desconocida', JSON.stringify({ app: 'mis-touch', backupVersion: 9, counts: {} }), /no soportada \(9\)/],
    ['ownedIds v1 dañado', JSON.stringify({ app: 'mis-touch', backupVersion: 1, ownedIds: [1, 2] }), /dañada/],
    ['counts v2 dañado', JSON.stringify({ app: 'mis-touch', backupVersion: 2, counts: { R1: -1 } }), /dañada/],
    ['v2 sin counts', JSON.stringify({ app: 'mis-touch', backupVersion: 2, ownedIds: ['R1'] }), /dañada/],
  ])('rechaza %s', (_label, text, message) => {
    const result = parseBackup(text, valid);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(message);
  });
});
