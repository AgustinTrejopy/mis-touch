import { describe, expect, it } from 'vitest';
import {
  createBackup,
  loadInventory,
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

describe('persistencia', () => {
  it('guardar y volver a leer restaura la selección', () => {
    const storage = memoryStorage();
    expect(saveInventory(storage, ['R1', 'CG0.5'])).toBe(true);
    const loaded = loadInventory(storage, valid);
    expect([...loaded.owned]).toEqual(['R1', 'CG0.5']);
    expect(loaded.problem).toBe('none');
  });

  it('solo guarda IDs y versión', () => {
    const storage = memoryStorage();
    saveInventory(storage, ['R1']);
    expect(JSON.parse(storage.data.get(STORAGE_KEY)!)).toEqual({ version: 1, ownedIds: ['R1'] });
  });

  it('sin datos previos empieza vacío', () => {
    expect(loadInventory(memoryStorage(), valid)).toEqual({ owned: new Set(), orphans: [], problem: 'none' });
  });

  it('IDs desconocidos no entran al inventario pero se conservan al guardar', () => {
    const storage = memoryStorage({ [STORAGE_KEY]: JSON.stringify({ version: 1, ownedIds: ['R1', 'GY999'] }) });
    const loaded = loadInventory(storage, valid);
    expect([...loaded.owned]).toEqual(['R1']);
    expect(loaded.orphans).toEqual(['GY999']);
    saveInventory(storage, loaded.owned, loaded.orphans);
    expect(JSON.parse(storage.data.get(STORAGE_KEY)!).ownedIds).toEqual(['R1', 'GY999']);
  });

  it.each([
    ['JSON inválido', '{nope'],
    ['versión desconocida', JSON.stringify({ version: 2, ownedIds: [] })],
    ['tipo incorrecto', JSON.stringify({ version: 1, ownedIds: 'R1' })],
    ['null', 'null'],
  ])('%s: inicia vacío, avisa y guarda copia del dato dañado', (_label, raw) => {
    const storage = memoryStorage({ [STORAGE_KEY]: raw });
    const loaded = loadInventory(storage, valid);
    expect(loaded.problem).toBe('corrupt');
    expect(loaded.owned.size).toBe(0);
    expect(storage.data.get(`${STORAGE_KEY}:corrupt`)).toBe(raw);
  });

  it('migra IDs retirados a su código vigente', () => {
    const storage = memoryStorage({ [STORAGE_KEY]: JSON.stringify({ version: 1, ownedIds: ['GY242', 'R1'] }) });
    const loaded = loadInventory(storage, new Set(['G242', 'R1']), { GY242: 'G242' });
    expect([...loaded.owned]).toEqual(['G242', 'R1']);
    expect(loaded.orphans).toEqual([]);
  });

  it('storage bloqueado o ausente no rompe', () => {
    expect(loadInventory(failing, valid).problem).toBe('unavailable');
    expect(loadInventory(null, valid).problem).toBe('unavailable');
    expect(saveInventory(failing, ['R1'])).toBe(false);
    expect(saveInventory(null, ['R1'])).toBe(false);
  });
});

describe('backup', () => {
  it('exporta versión, fecha e IDs', () => {
    const backup = createBackup(['R1', '120'], new Date('2026-01-01T12:00:00.000Z'));
    expect(backup).toEqual({
      app: 'mis-touch',
      backupVersion: 1,
      exportedAt: '2026-01-01T12:00:00.000Z',
      ownedIds: ['R1', '120'],
    });
  });

  it('ida y vuelta restaura el inventario', () => {
    const text = JSON.stringify(createBackup(['R1', 'CG0.5'], new Date()));
    expect(parseBackup(text, valid)).toEqual({ ok: true, ids: ['R1', 'CG0.5'], unknownIds: [] });
  });

  it('informa IDs desconocidos sin aceptarlos y elimina repetidos', () => {
    const text = JSON.stringify({ app: 'mis-touch', backupVersion: 1, exportedAt: '', ownedIds: ['R1', 'R1', 'GY172'] });
    expect(parseBackup(text, valid)).toEqual({ ok: true, ids: ['R1'], unknownIds: ['GY172'] });
  });

  it('migra IDs retirados del backup y evita duplicados', () => {
    const text = JSON.stringify({ app: 'mis-touch', backupVersion: 1, exportedAt: '', ownedIds: ['GY243', 'G243'] });
    expect(parseBackup(text, new Set(['G243']), { GY243: 'G243' })).toEqual({ ok: true, ids: ['G243'], unknownIds: [] });
  });

  it.each([
    ['JSON inválido', 'no es json', /JSON válido/],
    ['array', '[]', /formato/],
    ['otra app', JSON.stringify({ app: 'otra', backupVersion: 1, ownedIds: [] }), /no es un backup/],
    ['versión desconocida', JSON.stringify({ app: 'mis-touch', backupVersion: 9, ownedIds: [] }), /no soportada \(9\)/],
    ['ownedIds dañado', JSON.stringify({ app: 'mis-touch', backupVersion: 1, ownedIds: [1, 2] }), /dañada/],
  ])('rechaza %s', (_label, text, message) => {
    const result = parseBackup(text, valid);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(message);
  });
});
