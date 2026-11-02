# Roadmap

## Estado actual (v0.1.0)

| Área | Estado |
|---|---|
| Catálogo de 204 colores con correcciones trazables | ✅ |
| Cuadrícula, marcar/desmarcar, progreso | ✅ |
| Búsqueda y filtros combinables | ✅ |
| Persistencia local tolerante a errores | ✅ |
| Copias de seguridad (exportar/importar/vaciar) | ✅ |
| PWA instalable y uso sin conexión | ✅ (probado en navegador de escritorio con emulación móvil) |
| Publicación en hosting estático | ✅ |
| Paquete Android opcional (PWABuilder) | ✅ generado; verificación en dispositivos pendiente |

## Pendiente de validar

Ayuda muy bienvenida, sobre todo pruebas en dispositivos reales:

- [ ] Instalación y uso sin conexión en **Chrome Android** real.
- [ ] Apertura del `.apk` sin barra del navegador (verificación de `assetlinks.json`), con Chrome y con otros navegadores predeterminados (Brave, Samsung Internet).
- [ ] Ícono adaptable (*maskable*) en distintos launchers.
- [ ] Márgenes seguros (*safe areas*) en teléfonos con notch.
- [ ] Instalación en **iOS/Safari**.
- [ ] Recorrido con lectores de pantalla (TalkBack, VoiceOver).

## Ideas a futuro

No comprometidas: se discuten en issues antes de implementarlas, y siempre respetando los principios del proyecto (sin backend, sin dependencias innecesarias).

- **Carta oficial del fabricante** como fuente del catálogo, en lugar de listas de minoristas.
- **Mejores HEX** para colores estimados o dudosos (GY172, GY173, Blue Gray y Green Gray).
- **Lista de compras**: compartir o copiar los códigos que faltan.
- **Orden alternativo** (por número o por tono) como opción explícita, sin cambiar el orden por defecto.
- **Otros catálogos** (TOUCH Brush u otras líneas), si se puede hacer sin complicar la app.
- **Interfaz en inglés.**

## Fuera de alcance

- Cuentas, inicio de sesión o sincronización en la nube.
- Backend propio o base de datos.
- Precios, tiendas o recomendaciones de compra.
- Reconocimiento de marcadores por cámara.
- Apps nativas (Capacitor, React Native, Android Studio).
