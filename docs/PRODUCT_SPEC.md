# Especificación de producto — Mis Touch

## 1. Resumen

**Mis Touch** es una herramienta personal para visualizar y llevar el inventario de una colección de marcadores de la marca TOUCH. La persona debe poder reconocer cada marcador por su color, código y nombre, y marcarlo como adquirido o pendiente.

No es una tienda ni un sistema multiusuario. Su interfaz principal es un muestrario de colores en forma de cuadrícula.

## 2. Usuario y contexto

- Usuario principal: una persona que consulta y actualiza su colección desde un teléfono Android.
- Contexto de uso: consulta rápida mientras mira el estuche o compra marcadores.
- Interacción más frecuente: tocar una muestra para alternar `Lo tengo` / `Me falta`.
- Prioridad: comodidad con una mano, lectura instantánea y bajo consumo de recursos.

## 3. Objetivos

1. Mostrar el catálogo de marcadores disponible, con códigos, nombres y HEX.
2. Identificar rápidamente marcadores adquiridos y pendientes.
3. Encontrar un color por código, número o nombre.
4. Filtrar por estado y familia.
5. Mostrar progreso del inventario usando el tamaño real del catálogo validado.
6. Conservar la selección después de cerrar/recargar la aplicación.
7. Poder usar la aplicación sin conexión luego de la primera carga correcta.
8. Permitir respaldar y restaurar la selección manualmente.

## 4. No objetivos

- Login, cuentas o múltiples usuarios.
- Sincronización automática entre teléfonos.
- Backend, API propia o base de datos.
- E-commerce, precios, reposición o recomendaciones de compra.
- Gestión de sets o estuches múltiples en V1.
- Cámara, OCR o detección automática.
- Publicación en Play Store o runtime nativo. (Un `.apk` opcional que envuelve la PWA está permitido; ver D-016.)

## 5. Funcionalidades V1

### F-01 — Catálogo

Mostrar todos los registros validados. Cada registro incluye:
- nombre (texto original en inglés),
- letra/familia (puede estar vacía),
- número (string, puede contener decimales),
- HEX de seis dígitos.

El código visible se forma como `letra + numero`, o solo `numero` si no hay letra.

### F-02 — Cuadrícula

- Cuatro columnas en móviles comunes.
- Celdas 1:1 y de dimensiones iguales.
- Color de fondo proveniente del HEX del registro.
- Mostrar código y nombre sin truncar información esencial.
- Mantener el mismo tratamiento visual para todos los colores.

### F-03 — Inventario

- Cada muestra alterna entre adquirida y pendiente al tocarla.
- El estado adquirido se marca con check/borde/indicador accesible.
- No bajar saturación, opacidad ni alterar el color de fondo.
- El estado persiste localmente.
- **Cantidad (D-020):** cada color adquirido tiene una cantidad de unidades, entre 1 y 99. Al marcarlo empieza en 1 y aparece un control `− N +` en la tarjeta. `−` en 1 lo desmarca. Si se desmarca un color con 2 o más unidades, se ofrece deshacer.

### F-04 — Progreso

Mostrar cantidad adquirida, total del catálogo activo, cantidad pendiente y porcentaje. Todo calculado desde el catálogo y el inventario actual. No hardcodear total 204. El progreso cuenta colores distintos; si hay repetidos, se muestra además el total de marcadores.

### F-05 — Búsqueda

Buscar por código completo, letra, número o nombre. Debe ignorar mayúsculas/minúsculas y diacríticos. Actualización inmediata, sin llamada de red.

### F-06 — Filtros

- Estado: `Todos`, `Los tengo`, `Me faltan`.
- Familia: opciones derivadas de los registros presentes y una opción para códigos sin familia.
- Los filtros de estado, familia y búsqueda deben combinarse.
- Debe poder limpiarse cada filtro sin resetear los restantes.

### F-07 — Backup

Exportar un JSON con versión de formato, fecha de exportación y la cantidad de cada código adquirido. Importar con validación y confirmación antes de reemplazar la selección. Las copias anteriores, sin cantidades, se siguen pudiendo importar (cada color con 1 unidad).

### F-08 — PWA/offline

- Manifiesto, iconos y service worker.
- Instalable en navegadores Android compatibles.
- Cachear shell, estilos, scripts y catálogo.
- Mostrar un estado o mensaje claro si hubo una falla de carga inicial.
- No afirmar que la primera visita funciona offline.

## 6. Reglas de negocio

- El catálogo y el inventario son entidades separadas.
- Un HEX repetido no significa que dos registros sean el mismo marcador.
- El identificador se basa en el código exacto del fabricante presente en el catálogo validado.
- `numero` se mantiene como string; `0.5` es válido.
- `letra` vacía es válida para los códigos `120` y `0` del archivo fuente.
- El porcentaje es `ownedCount / catalog.length * 100`, con protección para catálogo vacío.
- Un ID guardado que ya no exista en el catálogo se descarta de forma segura o se conserva en el backup original, pero nunca debe romper la interfaz.

## 7. Estados de pantalla

- Catálogo cargado con inventario vacío.
- Catálogo con uno o varios elementos adquiridos.
- Resultados de búsqueda.
- Filtro sin resultados.
- Datos locales inválidos o inaccesibles.
- Backup exportado/importado con éxito o rechazado por validación.
- App funcionando offline después de una carga previa.

## 8. Métricas de aceptación

- No se pierden selecciones al recargar.
- El total se deriva del catálogo y coincide con el número real de registros.
- Búsqueda encuentra por nombre y código.
- Los filtros se pueden combinar.
- Las 4 columnas se mantienen legibles en un móvil de 360 px de ancho.
- Todas las celdas tienen la misma proporción.
- La muestra seleccionada conserva su HEX.
- La app no realiza solicitudes a APIs externas.
- La app se puede cargar como PWA desde HTTPS.
