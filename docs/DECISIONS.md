# Registro de decisiones — Mis Touch

Las decisiones aceptadas se mantienen aquí. Para cambiar una decisión, agregar una nueva entrada explicando motivo, impacto y qué reemplaza.

## D-001 — PWA como único formato de V1

- **Estado:** Aceptada.
- **Decisión:** distribuir mediante web estática HTTPS e instalación PWA en Android.
- **Motivo:** el caso de uso no necesita APIs nativas; evita Android Studio, SDK, Capacitor y compilaciones APK.
- **Consecuencia:** la instalación se hace desde el navegador y la distribución es por enlace. No se publica un APK en V1.

## D-002 — Vite + TypeScript + DOM/CSS nativo

- **Estado:** Aceptada.
- **Decisión:** usar Vite, TypeScript, HTML y CSS, sin framework de UI.
- **Motivo:** aplicación pequeña con una pantalla y una interacción principal; minimiza bundle, dependencias y complejidad.

## D-003 — Sin backend ni base de datos

- **Estado:** Aceptada.
- **Decisión:** catálogo estático y selección local en LocalStorage.
- **Motivo:** 204 registros y un estado binario por marcador no justifican backend ni SQL.
- **Consecuencia:** los datos no sincronizan entre dispositivos. Se proporciona backup JSON manual.

## D-004 — Fuente CSV original inmutable

- **Estado:** Aceptada.
- **Decisión:** mantener el archivo recibido bajo `data/source/` sin cambios y generar catálogo derivado.
- **Motivo:** trazabilidad y posibilidad de auditar cualquier corrección.

## D-005 — No asumir que el catálogo ya contiene 204 filas

- **Estado:** Aceptada.
- **Decisión:** el CSV contiene 203 registros; la app usa `catalog.length` hasta terminar la reconciliación.
- **Motivo:** no inventar o duplicar un marcador para completar un número.

## D-006 — Sincronización cloud fuera de V1

- **Estado:** Aceptada.
- **Decisión:** no cuentas, Firebase ni sincronización automática.
- **Motivo:** hay un único inventario personal y backup manual suficiente para el primer alcance.

## D-007 — Versiones del stack

- **Estado:** Aceptada (2026-11-01).
- **Decisión:** Vite `^8.3.5`, TypeScript `~7.0.2`, vite-plugin-pwa `^2.0.0`, Vitest `^5.0.5`. Node `^22.18.0 || >=24.0.0`.
- **Motivo:** versiones vigentes según `npm view` y la plantilla oficial `create-vite@9.3.3 --template vanilla-ts`. vite-plugin-pwa 2 declara compatibilidad con Vite 8; Vitest 5 requiere Node ≥ 22.12. Node ≥ 22.18 se exige porque `npm run catalog` ejecuta TypeScript directamente con el soporte nativo de Node.
- **Consecuencia:** no hay dependencias runtime propias; `workbox-window` (≈2 kB gzip) llega al navegador como parte del registro del service worker. `npm audit` reporta avisos moderados en la cadena de build de Workbox (`workbox-build` → `glob`, `minimatch`, `deepmerge`); afectan solo al build local, no al sitio publicado. La "solución" propuesta por npm es bajar a vite-plugin-pwa 1.1, que no es compatible con Vite 8; se acepta el aviso y se revisará en futuras versiones del plugin.

## D-008 — Catálogo derivado generado y verificado (archivo de anotaciones reemplazado por D-014)

- **Estado:** Aceptada.
- **Decisión:** `scripts/build-catalog.mjs` genera `src/data/touch-colors.json` desde el CSV y `data/catalog-annotations.json`. Cada registro lleva `source`, `sourceLine`, `verificationStatus` y, si corresponde, `note`. Un test compara el JSON con lo que produciría el generador.
- **Motivo:** trazabilidad sin tocar la fuente; imposible desincronizar sin que fallen los tests.
- **Consecuencia:** el catálogo se incluye en el bundle JS (≈11 kB gzip en total), por lo que queda precacheado junto con la app sin un fetch aparte.

## D-009 — Se conservan GY243 y G243

- **Estado:** Aceptada, provisoria.
- **Decisión:** se muestran ambos registros y el total es 203. Quedan `unresolved`.
- **Motivo:** probablemente sea el mismo marcador (ver [DATA_CATALOG.md](DATA_CATALOG.md)), pero borrar uno sería corregir la fuente en silencio. Al resolverse, el inventario de la persona no se pierde gracias a D-010.

## D-010 — IDs huérfanos se conservan en el almacenamiento

- **Estado:** Aceptada.
- **Decisión:** si `localStorage` tiene IDs que no existen en el catálogo activo, no entran al inventario visible ni a los contadores, pero se vuelven a guardar. Al importar un backup, los códigos desconocidos se informan en la confirmación, no se muestran y se conservan del mismo modo. `Vaciar colección` borra también los huérfanos. La exportación contiene solo IDs activos.
- **Motivo:** el catálogo todavía puede cambiar (243, GY172/GY173). Si un código desaparece y vuelve, la selección no se pierde.
- **Extra:** si el dato guardado está dañado, se copia en `mis-touch:inventory:v1:corrupt` antes de empezar con la colección vacía.

## D-011 — Actualización del service worker con aviso

- **Estado:** Aceptada.
- **Decisión:** `registerType: 'prompt'`. Cuando hay versión nueva aparece un aviso "Hay una versión nueva" con el botón `Actualizar`; no se recarga solo. Al quedar lista para offline se muestra un aviso breve.
- **Motivo:** No hay que forzar recargas en medio de un uso (ver [DEPLOYMENT.md](DEPLOYMENT.md#actualizaciones)). El inventario se guarda en cada toque, así que actualizar nunca pierde selecciones.

## D-012 — Deshacer cuando una tarjeta sale de la vista filtrada

- **Estado:** Aceptada.
- **Decisión:** el filtro se aplica en el momento. Si al tocar una tarjeta esta deja de cumplir el filtro (por ejemplo, en `Me faltan`), aparece un aviso con `Deshacer`. En la vista `Todos` no hay aviso: alcanza con el check.
- **Motivo:** evita toques accidentales sin perder resultados derivados del estado.

## D-013 — Tratamiento visual de la tarjeta

- **Estado:** Aceptada.
- **Decisión:** el texto es negro o blanco puro según el mayor contraste WCAG 2.x con el HEX (todas las tarjetas superan 4.5:1, verificado por test). "Lo tengo" = anillo oscuro por fuera de la tarjeta + insignia circular con el color del texto y el check en el color del marcador. El fondo nunca cambia. Cuadrícula de 4 columnas hasta 559 px, 5 desde 560 px y 6 desde 700 px. Los nombres usan hasta 3 líneas (la tercera solo hace falta a 320 px) y el nombre completo está en `aria-label` y `title`.
- **Motivo:** [UX_UI.md](UX_UI.md), secciones 4 y 5.

## D-014 — Reconciliación a 204 con correcciones trazables (reemplaza a D-009)

- **Estado:** Aceptada (2026-11-01).
- **Decisión:** `data/catalog-corrections.json` reemplaza a `catalog-annotations.json` y admite exclusiones (con alias), cambios de familia o nombre, agregados y anotaciones. Cada entrada cita referencias definidas en el mismo archivo. Se excluye `GY243` (alias → `G243`), `GY242` pasa a `G242`, se corrigen los nombres de `GY174` y `GY233`, y se agregan `GY172` y `GY173` con `hex: null`. El catálogo queda en 204.
- **Motivo:** dos listas comerciales legibles e independientes coinciden (ver [DATA_CATALOG.md](DATA_CATALOG.md#correcciones-aplicadas)). Las fuentes que había sugerido un asistente de IA no se pudieron verificar y contradecían esas listas.
- **Consecuencias:**
  - El catálogo se ordena por familia (orden de aparición) y número; con el CSV puro reproduce exactamente el orden original (cubierto por test).
  - Los IDs retirados se migran automáticamente en `localStorage` y en los backups importados.
  - `TouchColor.hex` admite `null` solo en registros agregados desde referencias; esas tarjetas se muestran rayadas, sin inventar color.
  - El total se sigue derivando de `catalog.length`.

## D-015 — HEX estimados desde imagen para GY172 y GY173 (reemplazada por D-019)

- **Estado:** Aceptada (2026-11-01), a pedido del usuario.
- **Decisión:** usar el color promedio de la muestra de imágenes de producto de tiendas (no incluidas en el repositorio por ser de terceros) y marcarlos con `hexEstimated: true` y referencias a esas imágenes. Reemplaza el rayado "sin muestra" de D-014 para estos dos códigos; el soporte para `hex: null` sigue disponible para casos futuros.
- **Motivo:** ninguna fuente publica el HEX, y una muestra de producto es mejor aproximación que un rayado neutro. Queda trazado como estimación, no como dato publicado.

## D-016 — APK opcional con PWABuilder (modifica D-001)

- **Estado:** Aceptada (2026-11-01) por decisión del usuario.
- **Decisión:** además de instalar la PWA desde Chrome, se puede distribuir un `.apk` generado online con [PWABuilder](https://www.pwabuilder.com) a partir de la URL publicada en Netlify. Es una Trusted Web Activity: abre la misma PWA con el Chrome del teléfono.
- **Qué no cambia:** no se usa Android Studio, Android SDK, Java/Kotlin ni Capacitor; el repositorio no contiene código nativo. La app sigue siendo la PWA, y las actualizaciones de contenido llegan desde Netlify sin regenerar el `.apk`.
- **Qué se agrega:** `public/.well-known/assetlinks.json`, con el package name y la huella SHA-256 de la clave de firma que genere PWABuilder. Sin ese archivo, la app abre con una barra de Chrome visible.
- **Consecuencias:**
  - La clave de firma (`signing.keystore` y sus contraseñas) la guarda el usuario fuera del repositorio. Sin ella no se pueden publicar versiones nuevas del mismo paquete.
  - Instalar el `.apk` requiere permitir "orígenes desconocidos" en Android.
  - Solo hace falta regenerar el `.apk` si cambian el nombre, el ícono, los colores o el dominio.
  - Se agregaron `id: '/'` y `categories` al manifiesto.

## D-017 — Publicación open source

- **Estado:** Aceptada (2026-11-01).
- **Decisión:** el código se publica en GitHub bajo licencia **MIT**. La documentación se orienta a quien usa o contribuye al proyecto (README, CONTRIBUTING, CODE_OF_CONDUCT, SECURITY, CHANGELOG, plantillas de issues y pull requests). La integración continua corre typecheck, tests, build, verifica que el catálogo generado esté al día y que la lista de origen no haya cambiado.
- **Privacidad y derechos:**
  - No se publican datos personales: la documentación habla de "la persona usuaria".
  - Las imágenes de terceros (foto del estuche, muestras de GY172 y GY173 de tiendas) quedan fuera del repositorio; se documenta su origen sin incluirlas.
  - El material de trabajo interno (prompts, bitácora, lista de tareas) queda en `.internal/`, ignorado por git. El seguimiento público pasa a `CHANGELOG.md`, `docs/ROADMAP.md` e issues.
  - Las claves de firma del paquete Android y los `.apk`/`.aab` están en `.gitignore`.
  - El README aclara que el proyecto no está afiliado a ShinHan Art.
- **Commits:** sin firmas ni coautorías de herramientas de IA.

## D-018 — Y44 se llama "Fresh Yellow"

- **Estado:** Aceptada (2026-11-02) por decisión del mantenedor.
- **Contexto:** la lista de origen y las dos tiendas de referencia nombran al 44 `Y44 Fresh Green`. El marcador físico de la colección de la persona usuaria dice `Fresh Yellow`.
- **Decisión:** se usa `Fresh Yellow`, priorizando el marcador físico que existe en la colección. Queda como cambio trazado en `data/catalog-corrections.json`, con estado `provided` (no `cross-checked`) y una nota que deja explícita la contradicción con las tiendas.
- **Color:** primero se estimó `#E0BF00` desde una imagen de producto; desde D-019 usa el HEX de la carta de colores (`#E8CD00`). Las correcciones de tipo `changes` admiten el campo `hex` para casos puntuales.

## D-019 — Todos los HEX salen de la carta de colores (reemplaza D-015)

- **Estado:** Aceptada (2026-11-02) por decisión del mantenedor.
- **Contexto:** la persona usuaria notó que WG8 y Y44 no coincidían con sus marcadores. Con la carta "TOUCH TWIN MARKER / BRUSH MARKER — COLOR CHART 204 colors" se comprobó que la mayoría de los HEX de la lista de origen eran colores de la paleta Material Design asignados a ojo: 145 de 204 difieren de forma visible (ΔE2000 ≥ 3) y 87 son directamente otro color (ΔE ≥ 12).
- **Decisión:** `data/catalog-corrections.json` incorpora la sección `chartHex`, con el HEX medido de la carta para cada uno de los 204 códigos (promedio de una zona central de cada muestra). Se aplica después de cambios y agregados, conserva el HEX anterior en la nota de cada registro y cita la referencia `shinhan-chart`. La lista de origen no se modifica.
- **Nombres:** la carta coincide con los 204 códigos del catálogo. Los nombres corregidos se mantienen, incluido `Y44 Fresh Yellow` (D-018), aunque la carta diga `Fresh Green`.
- **Consecuencias:**
  - `GY172`, `GY173` y `Y44` dejan de tener HEX estimados desde fotos de producto; ya no hay colores con `hexEstimated`.
  - La escala WG queda ordenada de claro a oscuro (verificado por test), igual que CG y GG.
  - La imagen de la carta no se incluye en el repositorio por ser material de terceros.
  - Los HEX siguen siendo la versión digital de la carta, no mediciones de la tinta.

## D-020 — Cantidad por color (repetidos)

- **Estado:** Aceptada (2026-11-02) a pedido del usuario. Modifica la regla de CLAUDE.md "guardar únicamente los IDs".
- **Decisión:** además de marcar qué colores se tienen, cada color adquirido guarda cuántas unidades hay, entre 1 y 99.
  - **Interfaz:** al marcar, la cantidad empieza en 1 y aparece un control `− N +` en la parte inferior de la tarjeta. `−` en 1 desmarca. Tocar la tarjeta sigue alternando "lo tengo" sin modal.
  - **Datos:** el estado pasa de `Set<string>` a `Map<string, number>` y sigue siendo la única fuente de verdad. "Lo tengo" equivale a cantidad ≥ 1.
  - **Progreso:** sigue contando colores distintos. El total de marcadores se deriva y solo se muestra si hay repetidos.
- **Persistencia:**
  - La clave nueva es `mis-touch:inventory:v2`, con `{ version: 2, counts }`.
  - Si no existe, se migra desde `v1` con 1 unidad por color. La clave `v1` no se borra: una pestaña con la versión vieja (el service worker actualiza solo cuando se acepta) sigue leyendo sus datos en vez de tratarlos como dañados.
  - Una cantidad inválida (no entera, menor que 1 o mayor que 99) hace que el dato se trate como dañado, con el mismo resguardo de siempre.
- **Copias de seguridad:** `backupVersion: 2` con `counts`. Se siguen aceptando las copias `backupVersion: 1` (cada color con 1 unidad).
- **Alias:** si un código retirado y su reemplazo aparecen juntos, describen el mismo marcador. Se queda la cantidad mayor en vez de sumarlas.
- **Protección ante toques accidentales:** desmarcar tocando la tarjeta un color con 2 o más unidades muestra "Deshacer", que restaura la cantidad.
