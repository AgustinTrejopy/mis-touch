# Catálogo de colores

Mis Touch muestra los **204 colores** de la línea ShinHan TOUCH Twin. Este documento explica de dónde salen los datos, qué correcciones se aplicaron y cómo proponer nuevas.

## Cómo se arma

```text
data/source/touch-colors-original.csv   ──┐
                                          ├─► npm run catalog ─► src/data/touch-colors.json ─► app
data/catalog-corrections.json            ──┘
```

1. **Lista de origen** (`data/source/touch-colors-original.csv`): 203 registros con nombre, familia, número y HEX. **Es inmutable**: nunca se edita, aunque tenga errores. Su SHA-256 es `8775aa57b9d98ac94b325aaedc07755646d545d80c42dcc0d363858028e2566f`.
2. **Correcciones** (`data/catalog-corrections.json`): exclusiones, cambios, agregados y anotaciones. Cada entrada cita una o más fuentes.
3. **Catálogo generado** (`src/data/touch-colors.json`): lo produce `npm run catalog` y es lo que usa la app. No se edita a mano; un test falla si no coincide con lo que generaría el script.

### Formato de la lista de origen

```csv
nombre,letra,numero,hex
Wine Red,R,1,#8B0021
Black,,120,#000000
```

| Campo | Contenido |
|---|---|
| `nombre` | Nombre del color en inglés, como en el producto. |
| `letra` | Familia (`R`, `GY`, `CG`…). Puede estar vacía: `120 Black` y `0 Colorless Blender`. |
| `numero` | Número como texto. Puede tener decimales (`0.5`) y se conserva siempre como string. |
| `hex` | Color aproximado para pantalla, en formato `#RRGGBB`. |

El código de cada marcador es `letra + numero` (`R1`, `CG0.5`, `120`) y es su identificador único. **Dos códigos pueden compartir el mismo HEX** sin ser el mismo marcador.

### Registro generado

```ts
interface TouchColor {
  id: string;                 // código: family + number
  family: string;             // '' para los códigos sin familia
  number: string;
  name: string;
  hex: string | null;         // null solo si ninguna fuente respalda un color
  hexEstimated?: boolean;     // true si el HEX se estimó desde una imagen
  source: 'user-csv' | 'verified-reference';
  sourceLine: number | null;  // línea en el CSV de origen
  verificationStatus: 'provided' | 'cross-checked' | 'unresolved';
  note?: string;              // explicación de la corrección
  references?: string[];      // claves de `references` en las correcciones
}
```

El archivo generado también incluye `aliases`: códigos retirados → código vigente. La app los usa para que las colecciones guardadas y las copias de seguridad no pierdan marcas cuando un código cambia.

## Correcciones aplicadas

La lista de origen tenía 203 registros. Se contrastó con dos listas comerciales de 204 colores que coinciden entre sí:

| Clave | Fuente |
|---|---|
| `city-stationery` | [City Stationery Group — ShinHan TOUCH Twin Tip Marker](https://www.citystationerygroup.com/product/shinhan-touch-twin-tip-marker/) (selector con 204 colores) |
| `asphalt-kreatorz` | [Asphalt Kreatorz — TOUCH Twin Markers by ShinHan Art](https://asphaltkreatorz.com/en/collections/touch-twin-markers-by-shinhan-art-materials) (un producto por color) |

| Código de origen | Corrección | Motivo |
|---|---|---|
| `GY243` | Se excluye; alias → `G243` | Duplicado: `G243 Green Deep` ya estaba, con el mismo HEX. Ambas fuentes listan solo `G243`. |
| `GY242` | Familia `GY` → `G` (`G242`); alias | Ambas fuentes: `G242 Cobalt Green Pale`. |
| `GY174` | Nombre `Dim Lime` → `Spring Dim Green` | Ambas fuentes coinciden. |
| `GY233` | Nombre `Grayish Olive` → `Grayish Olive Green` | Ambas fuentes coinciden. |
| — | Se agrega `GY172 Spectrum Green` (`#BDDEB3`, estimado) | Ausente en el origen, presente en ambas fuentes. |
| — | Se agrega `GY173 Dim Green` (`#F2F6D5`, estimado) | Ausente en el origen, presente en ambas fuentes. |
| `G243`, `Y44`, `YR133` | Sin cambios; `cross-checked` | Ambas fuentes confirman el dato de origen. |

Cuenta: 203 − 1 + 2 = **204**.

**Diferencias detectadas que no se aplicaron**, porque las fuentes no coinciden entre sí o es solo ortografía: `PB145` frente a `P145`, `Forest Blue` frente a `B182 Frost Blue`, `Vermillion`, `Terracotta`, `Ultra Marine`, `Oliva Green`, `Blue Grey`. Se mantiene la lista de origen.

### HEX estimados

Ninguna fuente publica un HEX para `GY172` y `GY173`. Sus colores se estimaron promediando tres zonas sin texto de la muestra de color en imágenes de producto de tiendas:

| Código | Lecturas | HEX usado |
|---|---|---|
| GY172 Spectrum Green | `#BDDEB3`, `#BEDDB3`, `#BCDFB3` | `#BDDEB3` |
| GY173 Dim Green | `#F2F6D5` (×3) | `#F2F6D5` |

Quedan marcados con `hexEstimated: true`, y la app lo aclara en la sección "Sobre el catálogo". Las imágenes no se incluyen en el repositorio porque pertenecen a terceros.

## Limitaciones conocidas

- **Los HEX son aproximaciones digitales**, no mediciones del fabricante. No reproducen exactamente la tinta, la tapa física ni la calibración de cada pantalla.
- **Las fuentes son minoristas**, no una carta oficial de ShinHan Art con fecha de edición. Si conseguís una carta oficial, es la mejor contribución posible.
- **Blue Gray (BG1–BG9) y Green Gray (GG1–GG9)** comparten exactamente los mismos HEX en la lista de origen. Probablemente sean poco precisos; se aceptan correcciones con fuente.
- **Existen marcadores de otras marcas** que también se venden como "Touch", con otra numeración y otros colores (por ejemplo, tapas que muestran solo el número, sin la letra de familia). Este catálogo corresponde a **ShinHan TOUCH Twin**.

## Cómo proponer una corrección

Abrí un issue con la plantilla **Corrección del catálogo**, o mandá un pull request:

1. **Conseguí una fuente verificable**: una carta de colores, una página de producto o una foto propia de la tapa. Sin fuente, la corrección no se acepta.
2. **Definí la fuente** en `references` dentro de `data/catalog-corrections.json`:
   ```json
   "mi-fuente": { "url": "https://…", "description": "Qué es y qué muestra.", "accessed": "AAAA-MM-DD" }
   ```
3. **Agregá la corrección** en la sección correspondiente:

   | Sección | Para qué | Campos |
   |---|---|---|
   | `exclusions` | Quitar un registro (duplicado o inexistente) | `id`, `aliasOf`, `note`, `references` |
   | `changes` | Cambiar `family` o `name` de un registro | `id`, `field`, `value`, `note`, `references` |
   | `additions` | Agregar un color que falta | `family`, `number`, `name`, `hex`, `hexEstimated?`, `note`, `references` |
   | `annotations` | Marcar un registro como verificado o dudoso, sin cambiar valores | `id`, `verificationStatus`, `note`, `references?` |

4. **Regenerá y probá:**
   ```bash
   npm run catalog
   npm run test
   ```
   El generador falla si una corrección apunta a un código inexistente o cita una fuente no definida. Si un cambio altera un código (por ejemplo, de familia), se crea un alias automáticamente.

**No inventes HEX.** Si no hay un valor publicado, usá `hex: null` (la tarjeta se muestra rayada, con la etiqueta "sin muestra") o una estimación documentada con `hexEstimated: true` que explique de dónde sale.
