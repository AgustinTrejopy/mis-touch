# Arquitectura

## Resumen

Mis Touch es una aplicación de **una sola pantalla**, construida con Vite + TypeScript y DOM nativo, sin framework de UI. No tiene servidor: el catálogo viaja dentro del bundle de JavaScript y la colección de cada persona vive en el `localStorage` de su navegador. Un service worker generado por Workbox deja todo disponible sin conexión.

```text
                 Hosting estático (HTTPS)
                            │
           index.html · JS (incluye catálogo) · CSS · íconos
                            │
                     Service worker (Workbox)
                            │
   ┌────────────────────────┼─────────────────────────┐
   │                        │                         │
catálogo (inmutable)   estado de la UI          localStorage
touch-colors.json      owned · filtros   ◄──►   mis-touch:inventory:v2
   │                        │
   └──────────► vista derivada: tarjetas visibles, progreso
```

## Módulos

| Archivo | Responsabilidad | ¿Toca el DOM? |
|---|---|---|
| `src/catalog.ts` | Parsear el CSV de origen, aplicar correcciones, ordenar y validar el catálogo. También lo usa `scripts/build-catalog.mjs` desde Node. | No |
| `src/filter.ts` | Normalizar texto, decidir si un color cumple los filtros y calcular el progreso. | No |
| `src/inventory.ts` | Leer y guardar la colección en `localStorage`; crear y validar copias de seguridad; migrar alias. | No |
| `src/contrast.ts` | Luminancia y contraste WCAG; elegir texto negro o blanco para cada color. | No |
| `src/main.ts` | Construir la interfaz, manejar eventos, avisos y diálogos, y registrar el service worker. | Sí |
| `src/style.css` | Tokens de diseño y estilos. | — |

Todo lo que no es `main.ts` son funciones puras, cubiertas por pruebas unitarias en `tests/`.

## Datos

### Catálogo

`src/data/touch-colors.json` se **genera** con `npm run catalog` a partir de `data/source/touch-colors-original.csv` (inmutable) y `data/catalog-corrections.json`. Tiene la forma `{ aliases, colors }`. El modelo completo y las reglas de corrección están en [DATA_CATALOG.md](DATA_CATALOG.md).

Reglas clave:

- El `id` de cada color es su código (`family + number`) y es único; el HEX no tiene por qué serlo.
- `number` es siempre un string (`"0"`, `"0.5"`).
- El total de la colección es `catalog.length`; nunca un número fijo.
- El catálogo se valida al generarse, en las pruebas y otra vez al iniciar la app. Si es inválido, la app muestra un error y no toca la colección guardada.

### Estado de la interfaz

```ts
const state = {
  owned: Map<string, number>,    // código → unidades (1–99); única fuente de verdad de "lo tengo"
  orphans: Map<string, number>,  // códigos guardados que no existen en el catálogo actual
  filters: { status: 'all' | 'owned' | 'missing', family: string | null, query: string },
};
```

Contadores, porcentaje, total de marcadores y tarjetas visibles **se derivan** en cada render; no se guardan. Las tarjetas se crean una sola vez al iniciar y después solo se actualizan `hidden`, `aria-pressed`, las etiquetas y el control de cantidad. Para unos 200 elementos no hace falta virtualización ni librerías de estado.

### Persistencia

```json
{ "version": 2, "counts": { "R1": 3, "CG0.5": 1, "120": 1 } }
```

- Clave: `mis-touch:inventory:v2`. Se guarda en cada toque. Cada cantidad es un entero entre 1 y 99; un color sin entrada no se tiene.
- Migración: si no existe `v2`, se lee `mis-touch:inventory:v1` (`{ "version": 1, "ownedIds": [...] }`) y cada código pasa a tener 1 unidad. La clave `v1` no se borra, así una versión vieja abierta en otra pestaña no pierde datos.
- Lectura tolerante:
  - almacenamiento bloqueado → la app funciona en memoria y avisa;
  - JSON dañado → se copia en `…:corrupt` y se empieza vacío, con aviso;
  - IDs desconocidos → se conservan como huérfanos sin mostrarse (D-010);
  - IDs retirados → se migran mediante `aliases`; si el viejo y el vigente aparecen juntos, queda la cantidad mayor.

### Copias de seguridad

```json
{ "app": "mis-touch", "backupVersion": 2, "exportedAt": "2026-01-01T12:00:00.000Z", "counts": { "R1": 3, "120": 1 } }
```

También se aceptan copias `backupVersion: 1` (con `ownedIds`, sin cantidades): cada color entra con 1 unidad.

Al exportar se descarga un `Blob`. Al importar se valida el archivo completo (tamaño, JSON, `app`, versión, tipos) **antes** de tocar la colección. Después se pide confirmación, y los códigos desconocidos se informan en ese diálogo.

## PWA

- `vite-plugin-pwa` en modo `generateSW` con `registerType: 'prompt'`: genera el manifiesto y `sw.js`, y precachea HTML, JS, CSS, íconos y manifiesto.
- `src/main.ts` usa `virtual:pwa-register` para avisar cuando la app ya funciona sin conexión y cuando hay una versión nueva. La actualización solo se aplica cuando la persona toca **Actualizar**.
- Los íconos se generan con `scripts/generate-icons.mjs`, que dibuja y codifica los PNG sin dependencias, usando `zlib` de Node.

## Seguridad y privacidad

- Sin pedidos de red a terceros: ni CDN, ni fuentes externas, ni analíticas.
- Los datos del catálogo se insertan con `textContent` y creación de nodos, nunca con `innerHTML`.
- Los colores se aplican como propiedades CSS (`--swatch`, `--ink`) solo después de validar el formato `#RRGGBB`.
- Lo único que se guarda son códigos de marcadores y cuántas unidades tenés de cada uno.

## Accesibilidad

- Cada tarjeta es un `<button>` con `aria-pressed` y un `aria-label` con código, nombre y, si hay repetidos, la cantidad. Los nombres llevan `lang="en"`.
- El control de cantidad está junto al botón (no dentro) y sus botones tienen etiquetas propias.
- El estado "lo tengo" se comunica con un check y un borde, no solo con color.
- El texto sobre cada color supera 4.5:1 de contraste (verificado por test).
- Foco visible, objetivos táctiles de 36–44 px y respeto por `prefers-reduced-motion`.

## Rendimiento

- JS de unos 46 kB sin comprimir (≈12 kB con gzip), incluido el catálogo. CSS de ≈3 kB con gzip.
- Sin dependencias en tiempo de ejecución, salvo `workbox-window` (≈2 kB con gzip) para registrar el service worker.
