import { describe, expect, it } from 'vitest';
import type { DerivedCatalog } from '../src/catalog.ts';
import data from '../src/data/touch-colors.json';
import {
  computeProgress,
  countMarkers,
  DEFAULT_FILTERS,
  hasActiveFilters,
  matchesFilters,
  NO_FAMILY,
  normalizeText,
  type Filters,
} from '../src/filter.ts';

const catalog = (data as DerivedCatalog).colors;
const run = (filters: Partial<Filters>, owned: Set<string> = new Set()) =>
  catalog.filter((c) => matchesFilters(c, owned, { ...DEFAULT_FILTERS, ...filters })).map((c) => c.id);

describe('normalizeText', () => {
  it('ignora mayúsculas, acentos y usa punto decimal', () => {
    expect(normalizeText('  Ámbar  ROJO ')).toBe('ambar rojo');
    expect(normalizeText('0,5')).toBe('0.5');
  });
});

describe('búsqueda', () => {
  it('encuentra por código completo', () => {
    expect(run({ query: 'R1' })).toContain('R1');
    expect(run({ query: 'r1' })).toContain('R1');
  });

  it('encuentra por número, incluidos 120 y 0.5', () => {
    expect(run({ query: '120' })).toEqual(['120']);
    expect(run({ query: '0.5' })).toEqual(['CG0.5', 'WG0.5']);
    expect(run({ query: '0,5' })).toEqual(['CG0.5', 'WG0.5']);
  });

  it('encuentra por nombre sin distinguir mayúsculas ni acentos', () => {
    expect(run({ query: 'wine red' })).toEqual(['R1']);
    expect(run({ query: 'WÍNE' })).toEqual(['R1']);
  });

  it('combina varias palabras en cualquier orden', () => {
    expect(run({ query: 'cg 0.5' })).toEqual(['CG0.5']);
    expect(run({ query: 'red wine' })).toEqual(['R1']);
  });

  it('sin coincidencias devuelve lista vacía', () => {
    expect(run({ query: 'zzzz' })).toEqual([]);
  });
});

describe('filtros', () => {
  const owned = new Set(['R1', 'R2', 'B62', '120']);

  it('Los tengo / Me faltan', () => {
    expect(run({ status: 'owned' }, owned)).toEqual(['R1', 'R2', 'B62', '120']);
    expect(run({ status: 'missing' }, owned)).toHaveLength(catalog.length - 4);
  });

  it('por familia y sin familia', () => {
    expect(run({ family: 'CG' })).toHaveLength(10);
    expect(run({ family: NO_FAMILY })).toEqual(['120', '0']);
  });

  it('combina estado + familia + búsqueda', () => {
    expect(run({ status: 'owned', family: 'R', query: 'red' }, owned)).toEqual(['R1', 'R2']);
    expect(run({ status: 'missing', family: 'R', query: 'red' }, owned)).not.toContain('R1');
  });

  it('limpiar la búsqueda conserva los demás filtros', () => {
    const filters: Filters = { status: 'owned', family: 'R', query: 'wine' };
    expect(run(filters, owned)).toEqual(['R1']);
    expect(run({ ...filters, query: '' }, owned)).toEqual(['R1', 'R2']);
  });

  it('mantiene el orden del catálogo', () => {
    expect(run({})).toEqual(catalog.map((c) => c.id));
  });

  it('detecta filtros activos', () => {
    expect(hasActiveFilters(DEFAULT_FILTERS)).toBe(false);
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, query: '  ' })).toBe(false);
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, family: NO_FAMILY })).toBe(true);
  });
});

describe('progreso', () => {
  it('usa catalog.length como total', () => {
    expect(computeProgress(catalog, new Set()).total).toBe(catalog.length);
  });

  it('cuenta solo IDs del catálogo', () => {
    const p = computeProgress(catalog, new Set(['R1', 'NO-EXISTE']));
    expect(p.owned).toBe(1);
    expect(p.missing).toBe(catalog.length - 1);
    expect(p.percent).toBe(1);
  });

  it('100% solo cuando están todos', () => {
    const all = new Set(catalog.map((c) => c.id));
    expect(computeProgress(catalog, all).percent).toBe(100);
    all.delete('R1');
    expect(computeProgress(catalog, all).percent).toBe(99);
  });

  it('tolera catálogo vacío', () => {
    expect(computeProgress([], new Set())).toEqual({ owned: 0, missing: 0, total: 0, percent: 0 });
  });

  it('con cantidades, el progreso cuenta colores distintos y countMarkers suma unidades', () => {
    const counts = new Map([['R1', 3], ['R2', 1], ['NO-EXISTE', 5]]);
    expect(computeProgress(catalog, counts).owned).toBe(2);
    expect(countMarkers(catalog, counts)).toBe(4);
    expect(countMarkers(catalog, new Map())).toBe(0);
  });
});
