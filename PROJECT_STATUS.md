# Monitor Cashea — seguimiento del proyecto

**Revisión:** 18 de octubre de 2026 · **Fase:** V2.2, calculadora interactiva · **Alcance:** sitio comunitario y no oficial.

| Área | Estado y límite |
|---|---|
| Diseño | Página responsive implementada. Pendiente revisión visual manual en dispositivos reales. |
| Calculadora | Principal, Cotidiana, Más Cuotas y comparación hipotética con intereses, con pruebas matemáticas. |
| Intereses | Los planes Cashea muestran 0 %; los intereses son solo comparación de otro financiamiento hipotético. |
| Atrasos | Simulación basada en cargo US$4 tras 2 días de gracia, según centro de ayuda. |
| Directorio | 21 marcas y 6 referencias externas; no verificación por sucursal. |
| Fuentes | Verificación de estructura, fecha y URL; no equivale a comprobación comercial actual. |
| Monitoreo | Solicitud automática desde GitHub. Un error de red se clasifica indeterminado, no caída. |
| CI | Pruebas de cálculo, estado y calidad editorial; quedan pendientes pruebas visuales E2E. |
| Seguridad GitHub | Sin protección de main confirmada; gestionar en Settings y considerar rama de datos separada. |

## Riesgos y tareas abiertas

1. **Alta:** estudiar corroboración de estado web desde más de una red antes de afirmar incidentes o crear alertas.
2. **Alta:** umbrales mínimos contradictorios en dos páginas oficiales del Modo Más Cuotas. Mantener advertencia y revisar sus cambios periódicamente.
3. **Media:** inspección visual, navegación por teclado, contraste y comportamiento de formularios en dispositivos reales.
4. **Media:** validar vigencia de marcas por sucursal y mantener evidencia con fecha; no ampliar la lista automáticamente sin fuentes.
5. **Media:** proteger `main` y mover el JSON de estado a una rama separada para evitar conflictos con las reglas de protección.
6. **Posterior:** historial y alertas solo después de mejorar la certeza del monitor.

## Calidad antes de publicar

- `npm test` pasa.
- `npm run validate:data` pasa.
- Workflows de GitHub Actions terminan en éxito.
- No se anuncia afiliación con Cashea ni cobertura de la app y pagos.

## V2.2 — Experiencia de cálculo

- Calculadora con sección protagonista, vista de cuota próxima, reparto inicial / saldo y cambios en tiempo real.
- Campo numérico manual entre 1 y 12, +/- y accesos rápidos 1, 3, 6, 9, 12.
- La edición manual de una modalidad Cashea cambia a escenario personalizado y evita atribuir cuotas libres a la oferta oficial.
- Persiste la advertencia sobre diferentes condiciones vigentes publicadas para Modo Más Cuotas.
- Pendiente de inspección visual manual de móviles y contraste real (Issue #8).

## V2.3 — Mobile responsive

Corrección del orden de cascada CSS que invalidaba el breakpoint de dos columnas. Se añadió navegación móvil y un test de navegador Chromium que comprueba anchos y funcionalidad en 320–1280 px. Una compilación correcta no sustituye comprobar visualmente Safari/iOS en un dispositivo real.

## V2.4 — Calculadora principal sin bloques redundantes

La calculadora es el primer contenido de la web y ocupa toda la superficie verde oscura; no existe una portada ni una tarjeta decorativa ficticia. El formulario y el resumen viven en el mismo módulo, con diseño responsive y un único aviso de uso orientativo. Las fuentes se agrupan en un desplegable. Pruebas unitarias y Chromium de 320–1280 px.

## V2.5 — Simplificación de la interfaz

Orden: Monitoreo → Calculadora → Comercios. Sin panel secundario «Resumen de tu compra». Cuota, inicial, total, intereses y avisos condicionales se muestran junto a los controles, sin repetir el desglose del calendario. Pruebas responsive preservadas.

## V2.6 — Incidencia Safari/iOS

El usuario reportó flechas triangulares grandes y barras superpuestas sobre dos selectores en un iPhone. Se normalizan todos los desplegables (tipo, nivel, ciudad, categoría) con apariencia nativa desactivada, una única flecha CSS y contraste controlado. Se añade verificación programática de selectores en Chromium y WebKit, navegación y vista de móviles; no afirmar que una emulación equivale a Safari en iPhone físico.

## P1 · Criterio de corroboración (18-10-2026)

Se añadió motor de consenso de dos proveedores independientes y pruebas. La interfaz ya no confunde un único chequeo GitHub con estado global. Hasta provisionar una segunda señal independiente y autorizada, el veredicto permanece **sin corroboración**. No cerrar el Issue #6 hasta prueba con tráfico real y procedencia verificable.
