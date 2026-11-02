# Pruebas

## Automáticas

```bash
npm run typecheck   # TypeScript estricto
npm run test        # Vitest
npm run build       # typecheck + build de producción
```

La integración continua (`.github/workflows/ci.yml`) corre los tres en cada push y en cada pull request.

| Archivo | Qué cubre |
|---|---|
| `tests/catalog.test.ts` | Parseo del CSV (cabecera, campos, CRLF/BOM); catálogo válido y sincronizado con el JSON generado; valores de origen intactos; cada corrección con nota y fuentes definidas; 204 registros; alias; orden por familia; números como string; HEX repetidos permitidos; reglas de `hex: null` y `hexEstimated`. |
| `tests/contrast.test.ts` | Fórmula de contraste WCAG y que todo color del catálogo tenga al menos 4.5:1 con su texto. |
| `tests/filter.test.ts` | Búsqueda por código, número y nombre (sin mayúsculas ni acentos, con coma decimal); filtros de estado y familia, solos y combinados; limpiar la búsqueda conserva los demás filtros; orden del catálogo; progreso con total dinámico y catálogo vacío. |
| `tests/inventory.test.ts` | Guardar y leer; solo se guardan IDs y versión; huérfanos conservados; datos dañados con copia de respaldo; almacenamiento bloqueado; migración de alias; exportar e importar copias, con rechazo de archivos inválidos. |

La interfaz (`src/main.ts`) no tiene pruebas automáticas, a propósito: es una sola pantalla y se valida con el checklist manual de abajo. Si aparece un defecto que no se pueda cubrir razonablemente así, se puede evaluar agregar pruebas de navegador.

## Checklist manual

Antes de publicar una versión, o si tu cambio toca la interfaz, recorré esta lista con `npm run build && npm run preview` (en PowerShell 5, los dos comandos por separado), en un navegador con emulación móvil o en un teléfono.

### Flujo principal

- [ ] El total muestra la cantidad real del catálogo.
- [ ] Tocar una tarjeta la marca: aparecen el check y el borde, y el color no cambia. Volver a tocarla la desmarca.
- [ ] El progreso y "Te faltan N colores" se actualizan al instante.
- [ ] Recargar la página conserva lo marcado.

### Búsqueda y filtros

- [ ] Buscar `R1`, `120`, `0,5`, `wine red` y `WÍNE` devuelve lo esperado.
- [ ] `Los tengo` y `Me faltan` muestran lo correcto.
- [ ] Filtrar por familia, y por `Sin familia` (120 y 0).
- [ ] Combinar estado + familia + búsqueda; limpiar la búsqueda conserva los otros filtros.
- [ ] En `Me faltan`, marcar un color lo saca de la vista y ofrece **Deshacer**.
- [ ] Una búsqueda sin resultados muestra un mensaje y botones para recuperar la vista.

### Copias de seguridad

- [ ] **Exportar copia** descarga un JSON con los códigos marcados.
- [ ] **Importar copia** con un archivo válido pide confirmación y reemplaza la colección.
- [ ] Importar un archivo que no es una copia de Mis Touch lo rechaza sin cambiar nada.
- [ ] **Vaciar colección** pide confirmación.

### Diseño y accesibilidad

- [ ] A 320, 360, 390 y 430 px de ancho: cuatro columnas, tarjetas cuadradas e iguales, sin scroll horizontal y con nombres legibles.
- [ ] Navegación con teclado: el foco se ve en todos los controles.
- [ ] Con *reducir movimiento* activado no hay animaciones.

### PWA y uso sin conexión (requiere HTTPS)

- [ ] Aparece el aviso *"ya funciona sin conexión"*.
- [ ] Se puede instalar desde Chrome Android.
- [ ] En modo avión, la app abre, marca colores y conserva los cambios al recargar.
- [ ] Después de publicar una versión nueva aparece *"Hay una versión nueva"*, y **Actualizar** la aplica sin perder lo marcado.
- [ ] La app no hace pedidos a otros dominios (pestaña Red de las herramientas de desarrollo).

## Cómo reportar resultados

En el pull request o el issue, indicá **dónde** probaste. No es lo mismo:

- solo pruebas automáticas,
- navegador de escritorio,
- emulación móvil del navegador,
- dispositivo real (modelo, sistema y navegador).
