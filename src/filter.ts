// Búsqueda, filtros y progreso. Todo se deriva de catálogo + estado; nada se guarda.
import type { TouchColor } from './catalog.ts';

export type StatusFilter = 'all' | 'owned' | 'missing';

/** Valor de `family` que representa "códigos sin familia" (120, 0). */
export const NO_FAMILY = '';

export interface Filters {
  status: StatusFilter;
  /** `null` = todas las familias; `NO_FAMILY` = códigos sin familia. */
  family: string | null;
  query: string;
}

export const DEFAULT_FILTERS: Filters = { status: 'all', family: null, query: '' };

/** Lo único que los filtros necesitan saber de la colección: si un código se tiene. Sirve un Set o el Map de cantidades. */
export type OwnedLookup = Pick<ReadonlySet<string>, 'has'>;

/** Minúsculas, sin diacríticos, coma decimal como punto y espacios colapsados. */
export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/,/g, '.')
    .replace(/\s+/g, ' ')
    .trim();
}

function searchText(color: TouchColor): string {
  return normalizeText(`${color.id} ${color.family} ${color.number} ${color.name}`);
}

export function matchesFilters(color: TouchColor, owned: OwnedLookup, filters: Filters): boolean {
  if (filters.status === 'owned' && !owned.has(color.id)) return false;
  if (filters.status === 'missing' && owned.has(color.id)) return false;
  if (filters.family !== null && color.family !== filters.family) return false;

  const query = normalizeText(filters.query);
  if (query === '') return true;
  const haystack = searchText(color);
  return query.split(' ').every((token) => haystack.includes(token));
}

export function hasActiveFilters(filters: Filters): boolean {
  return filters.status !== 'all' || filters.family !== null || filters.query.trim() !== '';
}

export interface Progress {
  owned: number;
  missing: number;
  total: number;
  /** Entero 0–100. Solo es 0 o 100 cuando corresponde exactamente. */
  percent: number;
}

export function computeProgress(catalog: readonly TouchColor[], owned: OwnedLookup): Progress {
  const total = catalog.length;
  const ownedCount = catalog.reduce((n, c) => n + (owned.has(c.id) ? 1 : 0), 0);
  let percent = 0;
  if (total > 0 && ownedCount === total) percent = 100;
  else if (ownedCount > 0) percent = Math.min(99, Math.max(1, Math.round((ownedCount / total) * 100)));
  return { owned: ownedCount, missing: total - ownedCount, total, percent };
}

/** Unidades físicas de colores del catálogo, contando repetidos. Los huérfanos no suman. */
export function countMarkers(catalog: readonly TouchColor[], counts: ReadonlyMap<string, number>): number {
  return catalog.reduce((n, c) => n + (counts.get(c.id) ?? 0), 0);
}
