# Cómo contribuir a Mis Touch

¡Gracias por querer ayudar! Mis Touch es intencionalmente chica y simple, así que las contribuciones que mejor encajan son las que mantienen eso.

## Formas de contribuir

- **Reportar un error** en la app: abrí un issue con la plantilla *Reporte de error*.
- **Corregir el catálogo** (un nombre, código o color equivocado, o un color que falta): abrí un issue con la plantilla *Corrección del catálogo*. **Siempre hace falta una fuente.**
- **Mejorar la accesibilidad, el diseño o la documentación.**
- **Probar en dispositivos reales** (sobre todo Android e iOS) y contar cómo te fue.

Antes de encarar un cambio grande, abrí un issue para charlarlo.

## Principios del proyecto

Leé [docs/DECISIONS.md](docs/DECISIONS.md) antes de proponer cambios de arquitectura. En resumen:

- **Sin backend ni cuentas.** Todo corre en el navegador y los datos quedan en el dispositivo.
- **Sin frameworks de UI ni dependencias en tiempo de ejecución** innecesarias: Vite + TypeScript + DOM nativo + CSS.
- **Sin telemetría, analíticas, publicidad ni recursos de CDN** (fuentes, íconos o scripts externos).
- **No inventar datos del catálogo.** Cada corrección necesita una fuente verificable.
- **No modificar `data/source/touch-colors-original.csv`.** Las correcciones van en `data/catalog-corrections.json`.
- **Accesibilidad:** controles semánticos, foco visible, contraste suficiente y respeto por `prefers-reduced-motion`.

## Preparar el entorno

```bash
npm install
npm run dev
```

Requiere Node.js `22.18+` o `24+`.

## Antes de abrir un pull request

```bash
npm run typecheck
npm run test
npm run build
```

Los tres tienen que pasar. La integración continua los vuelve a correr en cada pull request.

Checklist:

- [ ] El cambio es chico y enfocado (un tema por pull request).
- [ ] Agregaste o actualizaste pruebas si cambiaste lógica de `src/catalog.ts`, `src/filter.ts`, `src/inventory.ts` o `src/contrast.ts`.
- [ ] Probaste la interfaz en un ancho de móvil (320–430 px) si tocaste estilos o la pantalla.
- [ ] Actualizaste la documentación afectada y [CHANGELOG.md](CHANGELOG.md) (sección *Sin publicar*).
- [ ] Si es una decisión de diseño nueva, la agregaste a [docs/DECISIONS.md](docs/DECISIONS.md).

## Corregir el catálogo

1. Encontrá una fuente verificable: carta de colores del fabricante, página de producto de un minorista o foto propia de la tapa del marcador.
2. Agregá la corrección en `data/catalog-corrections.json`:
   - definí la fuente en `references`,
   - usá `exclusions`, `changes`, `additions` o `annotations` según el caso (ver [docs/DATA_CATALOG.md](docs/DATA_CATALOG.md#cómo-proponer-una-corrección)).
3. Ejecutá `npm run catalog` para regenerar `src/data/touch-colors.json`.
4. Ejecutá `npm run test`: las pruebas verifican que cada cambio cite fuentes y que el JSON generado esté sincronizado.

Si un código cambia o desaparece, el generador crea un **alias** para que las colecciones guardadas no pierdan esa marca.

## Estilo de código

- TypeScript estricto. Funciones puras siempre que se pueda; la manipulación del DOM queda en `src/main.ts`.
- Nada de `innerHTML` con datos: usá `textContent` y creación de nodos.
- Comentarios solo donde explican un *porqué* que no es obvio.
- Textos de la interfaz en español rioplatense neutro (vos). Los nombres de los colores quedan en inglés, como en el producto.

## Mensajes de commit

Breves y en modo imperativo, por ejemplo `Corregir nombre de GY174` o `Agregar filtro por familia sin código`. Se aceptan en español o inglés.

## Código de conducta

Este proyecto sigue el [Código de conducta](CODE_OF_CONDUCT.md). Al participar, aceptás respetarlo.
