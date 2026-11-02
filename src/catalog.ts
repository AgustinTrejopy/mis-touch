// Catálogo TOUCH: parseo del CSV fuente, construcción del catálogo derivado y validación.
// Este módulo no importa nada para poder ejecutarse también desde scripts de Node.

export const SOURCE_HEADER = ['nombre', 'letra', 'numero', 'hex'] as const;

export const HEX_PATTERN = /^#[0-9A-Fa-f]{6}$/;

export interface SourceRow {
  /** Línea del archivo fuente (la cabecera es la línea 1). */
  line: number;
  nombre: string;
  letra: string;
  numero: string;
  hex: string;
}

export type ColorSource = 'user-csv' | 'verified-reference';
export type VerificationStatus = 'provided' | 'cross-checked' | 'unresolved';

export interface TouchColor {
  /** Código exacto del fabricante: `family + number` (p. ej. R1, CG0.5, 120). */
  id: string;
  family: string;
  number: string;
  name: string;
  /** `null` cuando ninguna fuente respalda un color: la app no inventa uno. */
  hex: string | null;
  /** `true` si el HEX se estimó desde una imagen y no proviene de una lista de colores. */
  hexEstimated?: boolean;
  source: ColorSource;
  sourceLine: number | null;
  verificationStatus: VerificationStatus;
  note?: string;
  /** Claves de `references` en el archivo de correcciones. */
  references?: string[];
}

export interface CatalogCorrections {
  annotations?: { id: string; verificationStatus: VerificationStatus; note: string; references?: string[] }[];
  changes?: {
    id: string;
    field: 'family' | 'name' | 'hex';
    value: string;
    /** Solo para `field: 'hex'`: el valor se estimó desde una imagen. */
    hexEstimated?: boolean;
    note: string;
    references: string[];
  }[];
  exclusions?: { id: string; aliasOf: string; note: string; references: string[] }[];
  additions?: {
    family: string;
    number: string;
    name: string;
    hex: string | null;
    hexEstimated?: boolean;
    note: string;
    references: string[];
  }[];
}

export interface DerivedCatalog {
  /** IDs retirados → ID vigente. Se usan para migrar inventarios y backups. */
  aliases: Record<string, string>;
  colors: TouchColor[];
}

/**
 * Parsea el CSV fuente. El archivo es CSV simple (sin comillas); ante cualquier
 * estructura no soportada se lanza un error en vez de adivinar.
 */
export function parseSourceCsv(text: string): SourceRow[] {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/);
  if (lines.at(-1) === '') lines.pop();

  const header = (lines[0] ?? '').split(',');
  if (header.join(',') !== SOURCE_HEADER.join(',')) {
    throw new Error(`Cabecera inesperada: "${lines[0] ?? ''}"`);
  }

  return lines.slice(1).map((raw, index) => {
    const line = index + 2;
    if (raw.includes('"')) throw new Error(`Línea ${line}: comillas no soportadas`);
    const fields = raw.split(',');
    if (fields.length !== SOURCE_HEADER.length) {
      throw new Error(`Línea ${line}: se esperaban ${SOURCE_HEADER.length} campos y hay ${fields.length}`);
    }
    const [nombre, letra, numero, hex] = fields as [string, string, string, string];
    return { line, nombre, letra, numero, hex };
  });
}

/**
 * Construye el catálogo derivado. Las correcciones quedan registradas en cada
 * registro (`note`, `references`, `verificationStatus`); el CSV no se altera.
 */
export function buildCatalog(rows: readonly SourceRow[], corrections: CatalogCorrections = {}): DerivedCatalog {
  let colors: TouchColor[] = rows.map((row) => ({
    id: row.letra + row.numero,
    family: row.letra,
    number: row.numero,
    name: row.nombre,
    hex: row.hex,
    source: 'user-csv',
    sourceLine: row.line,
    verificationStatus: 'provided',
  }));

  const find = (id: string): TouchColor => {
    const color = colors.find((c) => c.id === id);
    if (!color) throw new Error(`Corrección para un código inexistente: ${id}`);
    return color;
  };

  const aliases: Record<string, string> = {};
  for (const exclusion of corrections.exclusions ?? []) {
    find(exclusion.id);
    colors = colors.filter((c) => c.id !== exclusion.id);
    aliases[exclusion.id] = exclusion.aliasOf;
  }

  for (const change of corrections.changes ?? []) {
    const color = find(change.id);
    color[change.field] = change.value;
    if (change.field === 'hex' && change.hexEstimated) color.hexEstimated = true;
    const newId = color.family + color.number;
    if (newId !== change.id) aliases[change.id] = newId;
    color.id = newId;
    color.verificationStatus = 'cross-checked';
    color.note = change.note;
    color.references = change.references;
  }

  for (const addition of corrections.additions ?? []) {
    colors.push({
      id: addition.family + addition.number,
      family: addition.family,
      number: addition.number,
      name: addition.name,
      hex: addition.hex,
      ...(addition.hexEstimated ? { hexEstimated: true } : {}),
      source: 'verified-reference',
      sourceLine: null,
      verificationStatus: 'cross-checked',
      note: addition.note,
      references: addition.references,
    });
  }

  for (const annotation of corrections.annotations ?? []) {
    const color = find(annotation.id);
    color.verificationStatus = annotation.verificationStatus;
    color.note = annotation.note;
    if (annotation.references) color.references = annotation.references;
  }

  for (const target of Object.values(aliases)) find(target);
  return { aliases, colors: sortCatalog(colors) };
}

/**
 * Agrupa por familia (en orden de primera aparición) y ordena por número dentro de cada una.
 * Con el CSV actual sin correcciones reproduce el orden original; los códigos sin familia van al final.
 */
export function sortCatalog(colors: readonly TouchColor[]): TouchColor[] {
  const familyOrder = new Map<string, number>();
  for (const c of colors) if (c.family !== '' && !familyOrder.has(c.family)) familyOrder.set(c.family, familyOrder.size);
  const rank = (c: TouchColor) => (c.family === '' ? familyOrder.size : familyOrder.get(c.family)!);
  return [...colors].sort((a, b) => {
    const byFamily = rank(a) - rank(b);
    if (byFamily !== 0 || a.family === '') return byFamily;
    return Number.parseFloat(a.number) - Number.parseFloat(b.number);
  });
}

/** Devuelve la lista de problemas encontrados; vacía si el catálogo es válido. */
export function validateCatalog(colors: readonly TouchColor[]): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();

  colors.forEach((color, index) => {
    const where = `Registro ${index + 1} (${color.id || 'sin código'})`;
    if (typeof color.name !== 'string' || color.name.trim() === '') errors.push(`${where}: nombre vacío`);
    if (typeof color.number !== 'string' || color.number.trim() === '') errors.push(`${where}: número vacío`);
    if (typeof color.family !== 'string') errors.push(`${where}: familia inválida`);
    if (color.hex !== null && (typeof color.hex !== 'string' || !HEX_PATTERN.test(color.hex))) {
      errors.push(`${where}: HEX inválido "${color.hex}"`);
    }
    if (color.hex === null && color.source === 'user-csv') errors.push(`${where}: falta el HEX de la fuente`);
    if (color.hexEstimated && (color.hex === null || (color.source === 'user-csv' && !color.references))) {
      errors.push(`${where}: HEX estimado solo vale para registros agregados o corregidos con un HEX`);
    }
    if (color.id !== color.family + color.number) errors.push(`${where}: el código no coincide con familia + número`);
    if (seen.has(color.id)) errors.push(`${where}: código duplicado`);
    seen.add(color.id);
  });

  return errors;
}

/** Familias presentes, en orden de primera aparición. Excluye los códigos sin familia. */
export function deriveFamilies(colors: readonly TouchColor[]): string[] {
  return [...new Set(colors.map((c) => c.family).filter((f) => f !== ''))];
}
