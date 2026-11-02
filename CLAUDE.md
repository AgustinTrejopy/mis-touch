# CLAUDE.md — Mis Touch

## Rol y objetivo
Actuá como un **Senior Frontend Engineer con criterio fuerte de producto, UX y performance**. Construí una aplicación pequeña, extremadamente simple, rápida y visualmente cuidada para que una persona pueda marcar qué marcadores TOUCH tiene y cuáles le faltan.

El producto se llama **Mis Touch**. Es un proyecto open source (MIT) publicado en GitHub. El catálogo tiene 204 colores: 203 de la lista de origen más correcciones trazables (ver `docs/DATA_CATALOG.md`).

## Leer antes de tocar código
1. `README.md`
2. `CONTRIBUTING.md`
3. `docs/PRODUCT_SPEC.md`
4. `docs/ARCHITECTURE.md`
5. `docs/DATA_CATALOG.md`
6. `docs/UX_UI.md`
7. `docs/TESTING.md`
8. `docs/DEPLOYMENT.md`
9. `docs/DECISIONS.md`
10. `docs/ROADMAP.md` y `CHANGELOG.md`

Si una instrucción parece contradecir otra, prevalece este orden: `CLAUDE.md` → `docs/DECISIONS.md` → `docs/PRODUCT_SPEC.md` → resto de documentación. Documentá cualquier nueva decisión en `docs/DECISIONS.md`.

## Restricciones no negociables
- **PWA-first.** No usar Capacitor, Android Studio, Android SDK, Kotlin, Java, React Native ni Expo.
  - Excepción aprobada por el usuario (D-016): se permite un `.apk` opcional generado online con PWABuilder (Trusted Web Activity) que envuelve la misma PWA publicada. No agrega código nativo al repositorio; solo `public/.well-known/assetlinks.json`.
- **Sin backend.** No usar FastAPI, Node server, SQL, SQLite, Firebase, Supabase ni servicios de autenticación.
- **Sin framework de UI.** Usar Vite + TypeScript + HTML semántico + CSS. No incorporar Angular, React, Vue ni Svelte.
- **Sin dependencias runtime innecesarias.** La aplicación debe ser estática y ejecutarse en el navegador.
- **Sin telemetría, analytics, trackers, publicidad ni llamadas a APIs externas.** No cargar fuentes, íconos ni librerías desde CDN.
- **Offline después de una primera carga correcta.** No prometer que la primera visita funcionará sin conexión.
- **Persistencia local y privada.** El inventario se guarda en el navegador/dispositivo. No hay sincronización entre dispositivos.
- No inventar nombres, códigos, cantidades, HEX ni datos de marcadores.
- No modificar `data/source/touch-colors-original.csv`. Es una fuente inmutable.
- No reemplazar, normalizar ni corregir silenciosamente valores originales. Toda corrección debe quedar trazada y justificada en la capa derivada del catálogo.
- No fijar `204` como denominador de progreso si el catálogo activo no contiene exactamente 204 registros validados. Usar siempre `catalog.length`.
- No confundir valores HEX repetidos con marcadores duplicados: cada código identifica un marcador y dos marcadores pueden compartir el mismo HEX.
- Conservar `numero` como string. Hay valores como `0` y `0.5` que no deben convertirse a enteros.
- Respetar los nombres originales en inglés; no traducirlos automáticamente.

## Stack aprobado
- Node.js LTS compatible con la versión actual de Vite.
- Vite.
- TypeScript.
- CSS moderno, sin framework CSS obligatorio.
- `vite-plugin-pwa` para manifiesto y service worker/Workbox.
- Vitest solo para pruebas unitarias si resulta necesario; no agregar herramientas pesadas sin una razón concreta.
- Hosting estático HTTPS (Netlify o Cloudflare Pages; no requiere backend).

Antes de fijar versiones, revisar la documentación oficial vigente y respetar compatibilidades. No inventar versiones.

## Principios de implementación
1. **Menos código, menos dependencias, menos estados.** Elegí la solución más sencilla que cumpla el producto.
2. Separar catálogo (datos inmutables) de inventario (selección del usuario).
3. Una única fuente de verdad para el estado de propiedad.
4. Derivar contadores, filtros y porcentaje desde el estado; no guardar valores calculados.
5. Mantener la aplicación usable con 203/204/otro número de registros sin cambios de código.
6. Mantener el orden de catálogo en la vista `Todos`, salvo que el usuario aplique un orden explícito.
7. Búsqueda y filtros deben combinarse; limpiar un filtro no debe borrar los demás.
8. No usar `innerHTML` con datos no confiables. Preferir creación segura de nodos y `textContent`.
9. Implementar manejo de errores para almacenamiento e importación/exportación.
10. Accesibilidad: controles semánticos, foco visible, labels, estados accesibles y contraste legible sobre los HEX.
11. Diseño mobile-first, touch targets cómodos y soporte para safe areas.
12. Evitar animaciones que afecten rendimiento o accesibilidad; respetar `prefers-reduced-motion`.

## UX acordada
- Nombre: **Mis Touch**.
- Estética: muestrario físico premium, minimalista, cálido y ordenado; no parecer un dashboard SaaS.
- Fondo cálido claro, tipografía oscura, bordes discretos y sombras sutiles.
- Cuadrícula de cuatro columnas en móviles comunes; cada tarjeta es cuadrada (`aspect-ratio: 1 / 1`) y todas tienen dimensiones iguales.
- Cada cuadrado representa una tapa de marcador y muestra familia/letra, número y nombre.
- El HEX original es el fondo de la tarjeta. Elegir texto negro o blanco según contraste calculado.
- Estados `Lo tengo` / `Me falta` deben distinguirse sin atenuar ni desaturar el color. Usar check/indicador, borde o señal visual clara.
- Cabecera con progreso, búsqueda, filtros `Todos`, `Los tengo`, `Me faltan`, filtros por familia y cuadrícula.
- Familias iniciales según el catálogo: `R, RP, YR, Y, GY, G, BG, B, PB, P, BR, CG, WG, GG, F`. La interfaz debe derivarlas de los datos, no asumir que esta lista será siempre completa. Incluir una opción para códigos sin familia.
- Búsqueda insensible a mayúsculas y acentos; buscar por código, número y nombre.
- La acción principal es tocar un cuadrado para alternar su propiedad. No abrir un modal obligatorio para esta acción.
- El estado inicial será vacío. No usar 24 como cantidad inicial: fue un dato de ejemplo visual, no inventario real.

## Datos y catálogo
- Fuente original: `data/source/touch-colors-original.csv` (copia exacta del TXT CSV proporcionado).
- Columnas originales: `nombre,letra,numero,hex`.
- El archivo contiene 203 registros. Tiene dos códigos sin letra: `120` (Black) y `0` (Colorless Blender). Preservarlos.
- Las correcciones viven en `data/catalog-corrections.json` (exclusiones con alias, cambios, agregados, anotaciones) y cada una cita fuentes. `npm run catalog` genera `src/data/touch-colors.json`; nunca editarlo a mano.
- Correcciones vigentes: se excluye `GY243` (alias → `G243`), `GY242` → `G242`, nombres de `GY174`, `GY233` y `Y44` (D-018), y se agregan `GY172`/`GY173`. Todos los HEX salen de la carta de colores de 204 (`chartHex`, D-019). Detalle en `docs/DATA_CATALOG.md`.
- Los HEX son la versión digital de la carta de colores, no mediciones de la tinta.
- Una corrección nueva necesita una fuente verificable. Si no hay HEX respaldado, usar `hex: null` o una estimación documentada con `hexEstimated: true`.

## Persistencia y backup
- Guardar únicamente los IDs de marcadores adquiridos en `localStorage`.
- Definir una clave namespaced y versionada, por ejemplo `mis-touch:inventory:v1`.
- Leer con validación y `try/catch`; tolerar storage bloqueado, JSON corrupto y IDs obsoletos.
- Incluir exportación e importación de JSON como backup manual.
- El importador debe validar estructura, versión y códigos existentes antes de modificar el inventario. Confirmar antes de reemplazar la selección actual.
- Incluir acción de limpiar inventario con confirmación.
- Aclarar dentro de la app o su ayuda que los datos viven en ese navegador/dispositivo y que conviene exportar una copia.

## Workflow obligatorio
- Antes de implementar una fase: revisar tareas, identificar entregable y riesgos.
- Trabajar en fases pequeñas y verificables. No hacer refactors globales no solicitados.
- Registrar decisiones relevantes en `docs/DECISIONS.md`.
- Registrar cambios visibles en `CHANGELOG.md` (sección *Sin publicar*) y actualizar `docs/ROADMAP.md` si cambia el estado.
- Mantener la documentación orientada a quien usa o contribuye al proyecto: nada de datos personales, rutas locales ni material de terceros sin permiso.
- Después de cada bloque de trabajo: ejecutar build, typecheck y pruebas disponibles; reportar exactamente qué pasó.
- No afirmar que algo fue probado en Android real si solo se verificó en desktop/responsive mode.
- No crear commits salvo pedido explícito. **Nunca** agregar `Co-Authored-By`, firmas ni menciones de IA en commits, pull requests o tags.
- Si hay una ambigüedad de datos, conservar la fuente y registrar el bloqueo; no interrumpir innecesariamente el desarrollo visual.

## Definition of Done global
- `npm run build` finaliza correctamente.
- `npm run typecheck` finaliza correctamente.
- Pruebas unitarias existentes pasan.
- La app se sirve como sitio estático HTTPS.
- Se puede instalar como PWA en un navegador Android compatible.
- Tras una primera carga completa, el shell, el catálogo y la funcionalidad principal están disponibles offline.
- Marcar/desmarcar sobrevive a recargar la página.
- Buscar y filtrar no mutan el catálogo ni pierden el inventario.
- La exportación/importación de backup funciona y valida datos inválidos.
- No hay backend, Capacitor ni dependencias nativas.
