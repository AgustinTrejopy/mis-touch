import { describe, expect, it } from 'vitest';
import csv from '../data/source/touch-colors-original.csv?raw';
import correctionsFile from '../data/catalog-corrections.json';
import generated from '../src/data/touch-colors.json';
import {
  buildCatalog,
  deriveFamilies,
  parseSourceCsv,
  validateCatalog,
  type CatalogCorrections,
  type TouchColor,
} from '../src/catalog.ts';

const rows = parseSourceCsv(csv);
const corrections = correctionsFile as CatalogCorrections & { references: Record<string, unknown> };
const { colors: catalog, aliases } = buildCatalog(rows, corrections);
const byId = (id: string) => catalog.find((c) => c.id === id);

describe('CSV fuente', () => {
  it('tiene 203 registros', () => {
    expect(rows).toHaveLength(203);
  });

  it('rechaza una cabecera distinta', () => {
    expect(() => parseSourceCsv('name,letter,number,hex\nA,R,1,#000000')).toThrow(/Cabecera/);
  });

  it('rechaza filas con campos de más o de menos', () => {
    expect(() => parseSourceCsv('nombre,letra,numero,hex\nA,R,1')).toThrow(/campos/);
  });

  it('acepta CRLF y BOM', () => {
    expect(parseSourceCsv('﻿nombre,letra,numero,hex\r\nA,R,1,#000000\r\n')).toHaveLength(1);
  });

  it('sin correcciones, el catálogo reproduce el CSV en su orden original', () => {
    const plain = buildCatalog(rows);
    expect(plain.colors.map((c) => c.id)).toEqual(rows.map((r) => r.letra + r.numero));
    expect(plain.aliases).toEqual({});
  });
});

describe('catálogo derivado', () => {
  it('es válido: HEX, IDs únicos, nombres y números no vacíos', () => {
    expect(validateCatalog(catalog)).toEqual([]);
  });

  it('coincide con src/data/touch-colors.json (ejecutar `npm run catalog` si falla)', () => {
    expect(generated).toEqual({ aliases, colors: catalog });
  });

  it('tiene 204 registros: 203 − GY243 + GY172 + GY173', () => {
    expect(catalog).toHaveLength(204);
    expect(byId('GY243')).toBeUndefined();
    expect(byId('GY172')).toBeDefined();
    expect(byId('GY173')).toBeDefined();
  });

  it('los registros del CSV sin corrección conservan sus valores originales', () => {
    for (const color of catalog.filter((c) => c.source === 'user-csv' && !c.references)) {
      const row = rows.find((r) => r.line === color.sourceLine)!;
      expect([color.name, color.family, color.number, color.hex]).toEqual([row.nombre, row.letra, row.numero, row.hex]);
    }
  });

  it('todo registro corregido o agregado cita referencias definidas y una nota', () => {
    const touched = catalog.filter((c) => c.references);
    expect(touched.length).toBeGreaterThan(0);
    for (const color of touched) {
      expect(color.note, color.id).toBeTruthy();
      for (const ref of color.references!) expect(corrections.references[ref], `${color.id} → ${ref}`).toBeDefined();
    }
  });

  it('243: queda G243 y GY243 se migra a G243', () => {
    expect(byId('G243')).toMatchObject({ name: 'Green Deep', source: 'user-csv' });
    expect(aliases.GY243).toBe('G243');
  });

  it('242: GY242 pasa a G242 sin cambiar el nombre', () => {
    expect(byId('GY242')).toBeUndefined();
    expect(byId('G242')).toMatchObject({ family: 'G', number: '242', name: 'Cobalt Green Pale' });
    expect(aliases.GY242).toBe('G242');
  });

  it('la carta de colores cubre exactamente los códigos del catálogo y define cada HEX', () => {
    const chart = corrections.chartHex!.colors;
    expect(Object.keys(chart).sort()).toEqual(catalog.map((c) => c.id).sort());
    for (const color of catalog) expect(color.hex, color.id).toBe(chart[color.id]);
    expect(catalog.filter((c) => c.hexEstimated)).toEqual([]);
  });

  it('GY172 y GY173 se agregan con el HEX de la carta', () => {
    expect(byId('GY172')).toMatchObject({ hex: '#CEE6C4', source: 'verified-reference', sourceLine: null });
    expect(byId('GY173')).toMatchObject({ hex: '#F7F8D9', source: 'verified-reference', sourceLine: null });
    expect(byId('GY172')!.references).toContain('shinhan-chart');
  });

  it('los nombres corregidos se mantienen con el HEX de la carta', () => {
    expect(byId('Y44')).toMatchObject({ name: 'Fresh Yellow', hex: '#E8CD00', source: 'user-csv', verificationStatus: 'provided' });
    expect(byId('Y44')!.references).toEqual(expect.arrayContaining(['physical-marker-y44', 'shinhan-chart']));
    expect(aliases.Y44).toBeUndefined();
    expect(byId('GY174')).toMatchObject({ name: 'Spring Dim Green', hex: '#E3EDB9' });
    expect(byId('GY233')).toMatchObject({ name: 'Grayish Olive Green', hex: '#B0BF98' });
  });

  it('la escala de grises cálidos va de claro a oscuro', () => {
    const lightness = (hex: string) => [1, 3, 5].reduce((sum, i) => sum + Number.parseInt(hex.slice(i, i + 2), 16), 0);
    const wg = catalog.filter((c) => c.family === 'WG').map((c) => lightness(c.hex!));
    expect(wg).toEqual([...wg].sort((a, b) => b - a));
  });

  it('los agregados quedan ordenados dentro de su familia', () => {
    const gy = catalog.filter((c) => c.family === 'GY').map((c) => c.id);
    expect(gy.slice(4, 9)).toEqual(['GY166', 'GY167', 'GY172', 'GY173', 'GY174']);
    expect(catalog.filter((c) => c.family === 'G').map((c) => c.id).slice(-3)).toEqual(['G241', 'G242', 'G243']);
  });

  it('preserva los códigos sin familia 120 y 0 al final', () => {
    expect(catalog.slice(-2).map((c) => [c.id, c.name])).toEqual([
      ['120', 'Black'],
      ['0', 'Colorless Blender'],
    ]);
  });

  it('mantiene los números como strings, incluidos 0 y 0.5', () => {
    expect(catalog.every((c) => typeof c.number === 'string')).toBe(true);
    expect(byId('CG0.5')?.number).toBe('0.5');
    expect(byId('WG0.5')?.number).toBe('0.5');
    expect(byId('0')?.number).toBe('0');
  });

  it('permite HEX repetidos entre códigos distintos', () => {
    const r1 = byId('R1')!;
    expect(validateCatalog([r1, { ...r1, id: 'R99', number: '99', sourceLine: null }])).toEqual([]);
  });

  it('no quedan registros sin resolver', () => {
    expect(catalog.filter((c) => c.verificationStatus === 'unresolved')).toEqual([]);
  });

  it('deriva las familias de los datos', () => {
    expect(deriveFamilies(catalog)).toEqual(['R', 'RP', 'YR', 'Y', 'GY', 'G', 'BG', 'B', 'PB', 'P', 'BR', 'CG', 'WG', 'GG', 'F']);
  });

  it('una corrección sobre un código inexistente falla', () => {
    expect(() => buildCatalog(rows, { annotations: [{ id: 'ZZ1', verificationStatus: 'unresolved', note: 'x' }] })).toThrow();
    expect(() => buildCatalog(rows, { exclusions: [{ id: 'R1', aliasOf: 'ZZ9', note: 'x', references: [] }] })).toThrow();
  });
});

describe('validateCatalog', () => {
  const base: TouchColor = {
    id: 'R1',
    family: 'R',
    number: '1',
    name: 'Wine Red',
    hex: '#8B0021',
    source: 'user-csv',
    sourceLine: 2,
    verificationStatus: 'provided',
  };

  it('detecta HEX inválido, duplicados y campos vacíos', () => {
    const errors = validateCatalog([
      base,
      { ...base },
      { ...base, id: 'R2', number: '2', hex: '8B0021' },
      { ...base, id: 'R', number: '', name: ' ' },
    ]).join('\n');
    expect(errors).toMatch(/duplicado/);
    expect(errors).toMatch(/HEX inválido/);
    expect(errors).toMatch(/nombre vacío/);
    expect(errors).toMatch(/número vacío/);
  });

  it('solo acepta HEX null en registros agregados desde referencias', () => {
    expect(validateCatalog([{ ...base, hex: null }]).join()).toMatch(/falta el HEX/);
    expect(validateCatalog([{ ...base, hex: null, source: 'verified-reference', sourceLine: null }])).toEqual([]);
  });

  it('HEX estimado solo en registros agregados o corregidos con HEX', () => {
    expect(validateCatalog([{ ...base, hexEstimated: true }]).join()).toMatch(/estimado/);
    expect(validateCatalog([{ ...base, hex: null, hexEstimated: true, source: 'verified-reference', sourceLine: null }]).join()).toMatch(/estimado/);
  });
});
