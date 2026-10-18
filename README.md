# Monitor Cashea — guía comunitaria independiente

Sitio web estático publicado mediante GitHub Pages. **No tiene relación con Cashea**. Tres módulos: observación del sitio público, simulador de pagos y directorio orientativo de comercios con fuentes.

## Qué hace y qué no hace

- **Estado de la web:** GitHub Actions consulta la URL HTTPS oficial con `www` de `targets.json` cada 15 minutos y publica `status.json`. Un HTTP 2xx/3xx indica que el sitio respondió. Un 401/403/429 indica que el monitor fue restringido, **no** una caída global. Otros errores HTTP se muestran como respuesta no satisfactoria; los fallos de red se presentan como «No se pudo comprobar» (no indican una caída global). **No comprueba la app ni los pagos.**
- **Calculadora Cashea:** modelos de Línea Principal, Cotidiana y Más Cuotas con tasa 0 %. El porcentaje inicial es editable y los niveles son orientativos. El usuario debe validar elegibilidad y condiciones en la app oficial.
- **Comparación con intereses:** préstamo **hipotético y no Cashea**; permite editar tasa nominal anual y calendario. Calcula intereses sobre saldo pendiente con períodos de días/365, redondeo a centavos y ajuste en la última cuota. Una tasa de ejemplo no debe confundirse con condiciones de Cashea.
- **Atrasos:** estimación basada en un cargo de US$4 por cuota si se superan dos días de gracia, según su centro de ayuda al 18/10/2026. Puede cambiar. No constituye una factura.
- **Comercios:** `comercios.json` contiene 21 marcas mencionadas por terceros. Cada `fuentes` es una clave de `fuentes.json`. No garantiza aceptación en todas las sucursales ni vigencia actual.

## Fuentes primarias

- https://www.cashea.app/preguntas-frecuentes/c/que-es-cashea-y-como-funciona
- https://www.cashea.app/preguntas-frecuentes/c/linea-cotidiana
- https://www.cashea.app/preguntas-frecuentes/c/modo-mas-cuotas
- https://intercom.help/cashea/es/articles/8526833-atraso-y-periodo-de-gracia

## Desarrollo y pruebas

Se necesita Node.js 22 o superior. No hay dependencias de producción ni build:

```bash
npm test
node scripts/check.mjs
python3 -m http.server 8000
```

Abrir http://localhost:8000 (no abrir el HTML directamente como archivo).

La carpeta `tests/` verifica centavos, fechas, intereses hipotéticos, recargos y clasificación de respuestas HTTP. `.github/workflows/test.yml` ejecuta las pruebas en cada PR y en cambios de `main`.

## Primera puesta en marcha del monitor

1. Fusionar el PR en `main` — los cambios del workflow disparan el primer chequeo por `push`.
2. Revisar **Actions → Comprobar sitio público** para confirmar el resultado.
3. Comprobar que aparece `status.json` en la rama `main`.
4. Los chequeos programados pueden retrasarse respecto a los 15 minutos previstos.

El workflow necesita permiso de escritura de contenidos en Actions para publicar el JSON. Si la política del repositorio bloquea `GITHUB_TOKEN`, revisa Settings → Actions → General. La rama `main` no debe exigir una regla que impida el commit del bot al archivo de estado, a menos que se cambie la arquitectura.

## Seguridad y privacidad

El proyecto no solicita credenciales, no gestiona dinero y no instala analítica de terceros. Los enlaces externos usan `noopener noreferrer`. Para cambios, abre un issue o PR. Evita incorporar datos personales, información de transacciones o logos que sugieran afiliación oficial.

## Versiones

- **V2.0:** rediseño responsivo, simulación financiera comparativa, calendario por fecha, cargos por atraso, estados de monitoreo conservadores y pruebas.
- **V1.0:** MVP del monitor y directorio inicial.

## Contradicción en límites de Modo Más Cuotas

Las páginas oficiales consultadas el 18/10/2026 no concuerdan: preguntas frecuentes (300/450/600 USD para 6/9/12 cuotas) y página específica (700/850/1000 USD). **No hay verificación de elegibilidad por precio** en este proyecto: el usuario debe comprobar el producto y su nivel dentro de la app. La selección del nivel sirve para estimar la inicial, no autoriza ni garantiza una compra.

## Gobierno de datos

El archivo `fuentes.json` incluye `fecha_publicacion` para cada referencia. La fecha corresponde al artículo de terceros, **no** a verificación contemporánea de afiliación. Ejecuta `npm run validate:data` antes de modificar el directorio. Consulta `CONTRIBUTING.md` y `PROJECT_STATUS.md`.

## V2.2 — Calculadora interactiva

- **Cuotas manuales:** permite escribir cualquier valor entero de **1 a 12** directamente, utilizar botones +/− o escoger 1, 3, 6, 9 o 12 como atajos.
- **Transparencia del modo:** editar la cantidad de cuotas de una modalidad predefinida cambia automáticamente el selector a **Personalizado (no oficial)**. El modo de comparación de intereses conserva su identificación hipotética.
- **Resumen inmediato:** primera cuota estimada, calendario, total, inicial, parte financiada y representación visual del reparto de la compra.
- **Validez:** Modo Personalizado no certifica elegibilidad ni número de cuotas disponibles en Cashea. La app oficial determina los plazos definitivos. La simulación personalizada no incorpora cargos de atraso atribuidos a Cashea.
- **Accesibilidad:** controles con etiquetas, estado de los accesos rápidos y avisos de validación. Pruebas unitarias de los 12 valores posibles.

## V2.3 — Corrección responsive móvil

El archivo CSS de V2.2 tenía un selector de dos columnas para `.sim-grid` **después** de los media queries originales, por lo que sobrescribía el apilamiento móvil. La V2.3 incorpora reglas de ancho y columnas al final del CSS y valida el resultado en un navegador Chromium real.

- Hasta 1050 px, calculadora en una única columna; formulario y resultado nunca quedan lado a lado.
- Por debajo de 620 px, campos de ancho completo; botones de cuotas de tamaño táctil, entradas de al menos 16 px para evitar zoom automático de iOS, importes largos que pueden partirse sin desbordar.
- Tabla de calendario con desplazamiento horizontal **dentro** de la tarjeta, sin ampliar la anchura de toda la web.
- Navegación móvil desplegable accesible.
- Pruebas de diseño en viewports de 320, 360, 375, 390, 430, 600, 768, 1024 y 1280 píxeles con Playwright + Chromium en GitHub Actions (requieren descargar Chromium en CI).

## V2.4 — Calculadora como experiencia principal

Se eliminó la portada decorativa y el falso panel verde de la calculadora. El formulario real con número de cuotas manual y el resultado comparten ahora un único contenedor verde oscuro que aparece al inicio del sitio. Se redujeron avisos duplicados y el calendario se mantiene debajo. La simulación personalizada continúa sin representar las modalidades oficiales; las tasas de comparación no pertenecen a Cashea.

## V2.5 — Orden editorial y resultado compacto

Las tres secciones aparecen en el orden **Monitoreo → Calculadora → Comercios**, tanto en navegación como en el contenido. Se eliminó por completo el panel «Resumen de tu compra»; la misma calculadora muestra en un bloque integrado la primera cuota estimada, inicial, total e intereses, con cargos solo cuando correspondan. El calendario de pagos permanece debajo. La simulación de intereses sigue identificada como hipotética y no oficial.

## V2.6 — Corrección Safari/iPhone de menús desplegables

Los controles **Tipo de simulación**, **Nivel orientativo**, **Ciudad** y **Categoría** usan ahora una envoltura y una única flecha vectorial CSS. El elemento nativo conserva su semántica y apertura accesible, pero su apariencia gráfica (incluyendo indicadores superpuestos de iOS) se desactiva explícitamente con `-webkit-appearance: none`; el fondo claro y texto oscuro se fuerzan incluso en Safari/WebView. La página también revisa foco, tamaños táctiles y anchos de filtros. Se invalida caché del CSS y JS con versión 2.6.0.

La suite responsive automatizada incorpora verificaciones en Chromium y WebKit con 320 a 1280 px. En dispositivos iOS físicos puede haber diferencias de versión del motor, por lo que una inspección de Safari en el teléfono sigue siendo la última comprobación visual.

## V2.7 — Gráfica del monitor y cálculo sin niveles asumidos

La primera sección presenta un gráfico de barras por hora para las **últimas 24 o 72 horas**, construido exclusivamente desde `status.json`. Verde: respuesta satisfactoria; rojo: respuesta HTTP no satisfactoria del monitor (no confirma una caída global); amarillo: acceso restringido (por ejemplo 403); azul gris: no comprobado; gris claro: sin muestras. La tasa publicada utiliza únicamente muestras evaluables; si no existen, se informa «Sin datos evaluables». No se extrapola uptime ni se inventan caídas, y se advierte cuando los datos están desactualizados. Como el monitor almacena un máximo aproximado de 72h y GitHub Actions puede retrasarse, pueden verse intervalos sin datos.

El campo «Nivel orientativo» se eliminó junto con las reglas automáticas de inicial atribuidas al nivel. **El porcentaje de inicial es 40 % a modo de ejemplo editable**, no una predicción de elegibilidad ni de oferta. Los límites reales se verifican en la app de Cashea.

## V2.8 — Estado e historial en una sola tarjeta

Se integraron «Sitio web público de Cashea» e «Historial de verificaciones» en un **único panel**. Primero se presenta el estado observado y las métricas, seguido de la gráfica horaria con selector 24/72h, su leyenda y el botón de actualización. Se eliminó la tira pequeña de barras duplicadas. El porcentaje de respuestas satisfactorias se mantiene únicamente en las métricas; el pie de gráfica muestra cuántas verificaciones y horas sin muestras contiene el período elegido.

## V2.9 — Eliminación del indicador duplicado

Se retira «Respuestas satisfactorias en 24 h / Sin muestra» y «Muestras evaluables» del bloque superior, porque la gráfica y su resumen ya informan sobre el historial. La cabecera muestra ahora el estado corroborado del sitio y la última fecha de comprobación, seguida del gráfico de 24/72 horas. Esto evita confundir la ausencia de muestras evaluables con la ausencia de cualquier verificación.

## V2.10 — Monitoreo en una sola sección visual

«¿La web responde?» se reemplaza por **«Estado y estabilidad.»**, dentro de la única tarjeta del monitor. Allí se incluye la explicación breve de alcance, objetivo de supervisión, estado corroborado, última comprobación, datos HTTP, gráfica 24/72h, leyenda y botón de actualización. Se eliminan textos repetidos en el historial y la leyenda no interpreta HTTP 403 como caída confirmada. El monitor sigue siendo una observación del sitio web, no de los pagos ni de la app.

## V2.11 — Interfaz, colores y accesibilidad

- **Orden:** Calculadora → Monitoreo → Comercios (revierte el orden de V2.5, ver ADR-005). Una franja compacta sobre la calculadora resume el estado del sitio web y enlaza al historial.
- **Monitoreo:** con menos del 50 % de horas con muestras, el resumen indica «Datos insuficientes» y la gráfica se reduce. Las etiquetas del eje pasan a HTML (legibles en móvil); paleta con contraste no textual ≥ 3:1, trama en «no satisfactoria» y contorno discontinuo en horas vacías. «Desactualizada» deja de compartir el ámbar de «acceso restringido».
- **Calculadora:** validación por campo con `aria-invalid`; distintivo «0 % interés» en lugar de «Intereses USD 0,00»; calendario unido a la calculadora, sin columnas de interés vacías y apilado en móvil; cuota flotante en móvil mientras el resultado queda fuera de pantalla.
- **Directorio:** ciudades como chips, fuentes plegadas por comercio; el aviso «sin verificar por sucursal» se mantiene una vez en la introducción.
- **Sistema visual:** hoja de estilos única con tokens de color, radio y tipografía; tamaño mínimo 12 px; contraste AA verificado en Chromium/WebKit. Tipografías DM Sans y Space Grotesk alojadas en `fonts/` bajo SIL Open Font License 1.1 (licencias incluidas); el sitio ya no contacta a Google Fonts.
