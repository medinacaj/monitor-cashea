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
