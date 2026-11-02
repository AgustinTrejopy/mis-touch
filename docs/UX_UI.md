# UX/UI — Mis Touch

## 1. Dirección visual

**Concepto:** muestrario físico premium, como una colección organizada de tapas de marcadores. La cuadrícula de colores es el elemento central del producto.

Sensaciones buscadas:
- simple,
- íntima y personal,
- prolija,
- cálida,
- moderna sin parecer una app SaaS,
- rápida y agradable de usar.

No usar un dashboard corporativo, grandes hero banners, gráficos decorativos, gradientes llamativos, ilustraciones genéricas ni navegación excesiva.

## 2. Referencia física

Cada tarjeta se inspira en la tapa de un marcador: un bloque de color con el código bien visible y el nombre debajo. No se reproduce el estuche ni se usan fotos como fondo.

## 3. Layout de la pantalla principal

Orden recomendado:

1. Header pequeño: `Mis Touch` y subtítulo `Mi colección de colores`.
2. Resumen de colección: `adquiridos / total`, porcentaje y barra de progreso.
3. Búsqueda por código, número o nombre.
4. Filtros por estado: `Todos`, `Los tengo`, `Me faltan`.
5. Filtros de familia en chips horizontales.
6. Cuadrícula de marcadores.
7. Acciones de backup discretas en menú/parte inferior; no deben competir con la cuadrícula.

No agregar bottom navigation: una sola pantalla resuelve el producto.

## 4. Diseño de la tarjeta de color

Cada tarjeta debe:
- tener `aspect-ratio: 1 / 1`,
- ocupar exactamente el mismo tamaño que las demás,
- usar el HEX como fondo,
- mostrar familia/letra y número con jerarquía clara,
- mostrar nombre completo en hasta dos líneas,
- tener padding consistente,
- usar contraste dinámico negro/blanco basado en luminancia/contraste real (no solo una regla YIQ arbitraria),
- poder tocarse fácilmente.

Código más prominente que el nombre. Para los casos sin letra, mostrar `120` o `0` sin inventar una familia.

### Estado pendiente

- Swatch con su color original.
- Sin check de adquirido.

### Estado adquirido

- Exactamente el mismo color original.
- Check pequeño y claro en una esquina, más un borde/outline si hace falta.
- No aplicar `opacity`, grayscale, overlay opaco ni bajar saturación.
- Usar `aria-pressed` o semántica equivalente para exponer el estado.

### Cantidad (colores adquiridos)

- Control `− N +` en la parte inferior de la tarjeta, con la misma inversión que el check: fondo del color del texto y signos del color del marcador.
- Es un elemento hermano del botón de la tarjeta (no se anidan botones). Tocar el control no alterna la tarjeta.
- Mientras se ve el control, el nombre se reduce a una línea; el nombre completo sigue en la etiqueta accesible.
- Botones de al menos 24 × 24 px, incluso a 320 px de ancho, con etiquetas como "Sumar una unidad de R1 (tenés 3)".
- `−` en 1 desmarca y devuelve el foco a la tarjeta. `+` se deshabilita en 99.

## 5. Grid responsive

- Cuatro columnas en los teléfonos objetivo.
- `gap` cómodo y padding lateral compacto.
- Probar desde 320 px a 430 px de viewport.
- Las tarjetas permanecen cuadradas.
- No usar scroll horizontal para la cuadrícula; solo para los chips de familia si no entran.
- Si la tipografía del nombre no entra, ajustar tamaño/line-height o truncar visualmente con cuidado, pero el nombre completo debe estar disponible mediante etiqueta accesible o detalle sencillo.

## 6. Interacción

- Tap en swatch: alterna estado de propiedad inmediatamente.
- Feedback de toque discreto; no retrasar persistencia.
- Búsqueda instantánea, sin botón de enviar.
- Filtros combinables.
- Chip activo distinguible por contraste/borde, no solo color.
- Resumen y porcentaje actualizan inmediatamente.
- Vacío de búsqueda: texto corto y acción `Limpiar búsqueda`.
- Confirmar solo acciones destructivas (restaurar backup reemplazando inventario o limpiar todos).

## 7. Estilo y tokens sugeridos

Punto de partida; el diseñador puede ajustar con criterio:

```css
:root {
  color-scheme: light;
  --app-bg: #F7F6F2;
  --surface: #FFFFFF;
  --text: #20231F;
  --muted: #777A73;
  --border: #E7E5DE;
  --accent: #596B50;
  --radius-card: 12px;
  --radius-control: 999px;
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
}
```

Tipografía: stack de sistema (`system-ui`, `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, sans-serif). No depender de Google Fonts.

## 8. Accesibilidad

- Objetivo táctil recomendado de al menos 44×44 px.
- Foco visible para teclado.
- Botones reales para controles.
- Label accesible para cada color: código, nombre y estado.
- Contraste suficiente para texto sobre cada swatch; calcular con fórmula WCAG.
- No comunicar propiedad exclusivamente con color.
- Respetar `prefers-reduced-motion`.
- Zoom del navegador no debe romper la UI.

## 9. Contenido y tono

Usar español para interfaz:
- `Mis Touch`
- `Mi colección de colores`
- `Todos`
- `Los tengo`
- `Me faltan`
- `Buscar código o nombre…`
- `Te faltan N colores`
- `N de M colores`

Los nombres de los marcadores permanecen en inglés tal como están en la fuente.
