# Publicación e instalación

Mis Touch es un **sitio estático**: no hay servidor ni base de datos que desplegar. Se publica la carpeta `dist/` que genera el build en cualquier hosting con HTTPS. HTTPS es obligatorio para que funcionen el service worker, la instalación y el uso sin conexión.

## Build

```bash
npm install
npm run test
npm run build   # incluye el typecheck
```

El resultado queda en `dist/`. Para revisarlo localmente:

```bash
npm run preview            # http://localhost:4173
npm run preview -- --host  # también accesible desde otro dispositivo de la misma red
```

> Por HTTP en la red local se puede ver y usar la interfaz, pero la instalación y el modo sin conexión necesitan HTTPS.

## Netlify

### Opción A: arrastrar la carpeta (Netlify Drop)

1. Creá una cuenta en [netlify.com](https://app.netlify.com/signup).
2. **Sites → Add new site → Deploy manually** y arrastrá la carpeta `dist`.
3. En **Site configuration → Change site name** elegí el nombre definitivo. Si usás el paquete Android, el nombre queda atado a él.
4. Para actualizar: pestaña **Deploys** → arrastrá la nueva `dist`.

> **Ojo:** al arrastrar una carpeta, el navegador omite las carpetas que empiezan con punto (como `.well-known`). Por eso el proyecto incluye `public/assetlinks.json` y una regla en `public/_redirects` que lo sirve en `/.well-known/assetlinks.json`.

### Opción B: conectar el repositorio (recomendado)

1. **Add new site → Import an existing project** y elegí el repositorio de GitHub.
2. Build command: `npm run build` · Publish directory: `dist`.
3. Cada push a la rama principal publica una versión nueva.

En esta opción `.well-known/` sí se publica, y la regla de `_redirects` no molesta.

## Cloudflare Pages

1. **Workers & Pages → Create → Pages → Connect to Git** y elegí el repositorio.
2. Build command: `npm run build` · Build output directory: `dist`.
3. Si hace falta, configurá la variable de entorno `NODE_VERSION=24`.

Cloudflare Pages también lee `public/_headers` y `public/_redirects`.

## GitHub Pages u otros hosts

Funciona igual, con dos salvedades:

- Si la app se sirve en un subdirectorio (`usuario.github.io/repo/`), configurá `base: '/repo/'` en `vite.config.ts`. El manifiesto y el service worker se ajustan solos.
- GitHub Pages no lee `_headers` ni `_redirects`: el manifiesto puede servirse con un tipo genérico (Chrome lo acepta igual), y `assetlinks.json` tiene que estar en `/.well-known/` del dominio raíz para el paquete Android.

## Archivos especiales de `public/`

| Archivo | Para qué |
|---|---|
| `_headers` | Tipo correcto para el manifiesto y `assetlinks.json`; `no-cache` para `sw.js` e `index.html`, así las actualizaciones llegan. |
| `_redirects` | Sirve `/assetlinks.json` en `/.well-known/assetlinks.json` (ver la nota sobre Netlify Drop). |
| `assetlinks.json`, `.well-known/assetlinks.json` | Verificación del paquete Android. Públicos por diseño. |

## Instalar la app

### Android (Chrome)

1. Abrí la URL en Chrome y esperá el aviso *"Listo: Mis Touch ya funciona sin conexión"*.
2. Tocá **Instalar app** en el aviso o en el menú **⋮ → Instalar aplicación**.
3. Abrila desde el ícono. Para probar el modo sin conexión: activá el modo avión, cerrá la app y volvé a abrirla.

### iPhone / iPad (Safari)

**Compartir → Agregar a pantalla de inicio.** Sin probar todavía en dispositivos iOS reales.

## Actualizaciones

- El service worker (Workbox, vía `vite-plugin-pwa`) precachea HTML, JS (que incluye el catálogo), CSS, íconos y manifiesto.
- Cuando hay una versión nueva publicada, la app muestra *"Hay una versión nueva de Mis Touch"* con el botón **Actualizar**. **Nunca se recarga sola** (ver D-011).
- La colección se guarda en cada toque, así que actualizar no pierde nada.
- Las cachés de versiones anteriores se limpian automáticamente.

## Paquete Android (APK) opcional

Además de instalarla desde Chrome, se puede generar un `.apk` que envuelve la misma app web (Trusted Web Activity), **sin Android Studio** (ver D-016).

1. Publicá la app y elegí el nombre definitivo del sitio.
2. En [pwabuilder.com](https://www.pwabuilder.com) pegá la URL → **Package for stores → Android → Generate Package**.
3. El `.zip` descargado trae el `.apk`, un `.aab` (solo para Play Store), una **clave de firma** con su archivo de contraseñas y un `assetlinks.json`.
4. **Guardá la clave de firma y sus contraseñas fuera del repositorio**, en un lugar seguro. Sin ellas no se pueden publicar versiones nuevas del paquete. El `.gitignore` excluye `*.keystore` y `*.jks`.
5. Copiá el `assetlinks.json` generado a `public/assetlinks.json` **y** a `public/.well-known/assetlinks.json`, y volvé a publicar.
6. Comprobá la verificación:
   ```text
   https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://TU-SITIO&relation=delegate_permission/common.handle_all_urls
   ```
   Tiene que responder sin `errorCode`.
7. Instalá el `.apk` en el teléfono (Android pide permitir "orígenes desconocidos").

**Si aparece una barra del navegador arriba**, Android no pudo verificar `assetlinks.json`. Revisá el paso 6 y reinstalá el `.apk`, porque Android guarda el resultado de la verificación fallida. El paquete abre con el navegador predeterminado del teléfono si es compatible; está mejor probado con Chrome.

El contenido de la app se actualiza desde el hosting. Solo hace falta regenerar el `.apk` si cambian el nombre, el ícono, los colores o el dominio.

## Datos de las personas usuarias

La colección vive en el `localStorage` del navegador que abre la app. Borrar los datos del navegador, cambiar de navegador o de dispositivo la deja atrás. La app recomienda exportar una copia de seguridad (JSON) y permite importarla en otro lado.
