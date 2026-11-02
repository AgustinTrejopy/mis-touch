# Seguridad y privacidad

## Qué datos maneja la app

Mis Touch **no tiene servidor, cuentas ni analíticas**. Lo único que guarda es la lista de códigos de marcadores que marcaste, en el `localStorage` de tu navegador, bajo la clave `mis-touch:inventory:v1`. Las copias de seguridad son archivos JSON que descargás vos y no se envían a ningún lado.

La app no hace pedidos de red a terceros: todos los archivos (scripts, estilos, íconos) se sirven desde el mismo sitio.

## Versiones soportadas

Solo se mantiene la última versión publicada en la rama principal.

## Reportar una vulnerabilidad

Por favor **no abras un issue público** para problemas de seguridad. Usá un [reporte privado de vulnerabilidad en GitHub](../../security/advisories/new).

Incluí, si podés:

- una descripción del problema y su impacto,
- los pasos para reproducirlo,
- el navegador y el dispositivo donde lo viste.

Vas a recibir una respuesta lo antes posible. Una vez corregido, se reconocerá tu aporte si así lo querés.

## Para quienes mantienen el proyecto

- **Nunca** subas al repositorio la clave de firma del paquete Android (`*.keystore`, `*.jks`) ni sus contraseñas. El `.gitignore` las excluye; guardalas en un lugar seguro fuera del proyecto.
- `public/assetlinks.json` y `public/.well-known/assetlinks.json` son públicos por diseño: solo contienen el nombre del paquete y la huella pública del certificado.
