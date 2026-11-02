// Genera src/data/touch-colors.json a partir del CSV fuente (que nunca se modifica)
// y de las correcciones trazables. Uso: npm run catalog
import { readFileSync, writeFileSync } from 'node:fs';
import { buildCatalog, parseSourceCsv, validateCatalog } from '../src/catalog.ts';

const root = new URL('../', import.meta.url);
const csv = readFileSync(new URL('data/source/touch-colors-original.csv', root), 'utf8');
const corrections = JSON.parse(readFileSync(new URL('data/catalog-corrections.json', root), 'utf8'));

const unknownRefs = [
  ...(corrections.exclusions ?? []),
  ...(corrections.changes ?? []),
  ...(corrections.additions ?? []),
  ...(corrections.annotations ?? []),
].flatMap((c) => c.references ?? []).filter((ref) => !corrections.references[ref]);
if (unknownRefs.length > 0) {
  console.error(`Referencias no definidas: ${[...new Set(unknownRefs)].join(', ')}`);
  process.exit(1);
}

const catalog = buildCatalog(parseSourceCsv(csv), corrections);
const errors = validateCatalog(catalog.colors);
if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

writeFileSync(new URL('src/data/touch-colors.json', root), JSON.stringify(catalog, null, 2) + '\n');

const list = (filter) => catalog.colors.filter(filter).map((c) => c.id).join(', ') || 'ninguno';
console.log(`Catálogo generado: ${catalog.colors.length} registros`);
console.log(`Sin familia: ${list((c) => c.family === '')}`);
console.log(`Sin HEX: ${list((c) => c.hex === null)}`);
console.log(`HEX estimado desde imagen: ${list((c) => c.hexEstimated)}`);
console.log(`Pendientes de verificación: ${list((c) => c.verificationStatus === 'unresolved')}`);
console.log(`Alias: ${JSON.stringify(catalog.aliases)}`);
