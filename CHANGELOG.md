# Changelog

Todos los cambios relevantes del proyecto se registran acá. El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y el proyecto usa [versionado semántico](https://semver.org/lang/es/).

## [Sin publicar]

## [0.1.0] — 2026-11-01

Primera versión pública.

### Agregado

- Pantalla única con progreso de la colección, búsqueda, filtros por estado y por familia, y cuadrícula de cuatro columnas en móviles.
- Marcar y desmarcar con un toque, con "Deshacer" cuando la tarjeta sale de la vista filtrada.
- Persistencia local versionada (`mis-touch:inventory:v1`), tolerante a almacenamiento bloqueado o datos dañados.
- Exportar, importar (con validación y confirmación) y vaciar la colección.
- PWA instalable y uso sin conexión con Workbox; aviso cuando hay una versión nueva, sin recargas forzadas.
- Catálogo de 204 colores generado desde una lista de origen inmutable más correcciones con fuentes (`data/catalog-corrections.json`).
- Alias para migrar códigos corregidos (`GY242 → G242`, `GY243 → G243`) en colecciones guardadas y copias de seguridad.
- Contraste de texto WCAG calculado para cada color (mínimo 4.5:1).
- Íconos generados sin dependencias, cabeceras para Netlify/Cloudflare Pages y `assetlinks.json` para el paquete Android opcional.
- 61 pruebas unitarias (catálogo, contraste, filtros, persistencia y copias de seguridad).

### Catálogo

- Se agregaron `GY172 Spectrum Green` y `GY173 Dim Green` (color estimado a partir de imágenes de producto).
- Se quitó el duplicado `GY243` (queda `G243 Green Deep`).
- `GY242` pasó a `G242 Cobalt Green Pale`.
- Nombres corregidos: `GY174 Spring Dim Green`, `GY233 Grayish Olive Green`.

[Sin publicar]: https://github.com/OWNER/REPO/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/OWNER/REPO/releases/tag/v0.1.0
