# Arquitectura — Monitor Cashea

Sitio estático sin dependencias de producción ni backend. `index.html`, `styles.css` y `app.js` muestran tres módulos: observación web, simulación financiera y directorio de comercios. `finance.js` implementa la aritmética. `scripts/check.mjs` consulta una web pública y un workflow programado actualiza estados; **no confirma estado de la aplicación ni de pagos**. `test.yml` valida JavaScript y corre `npm test` en PR. No ejecutar el comprobador externo en CI de revisión.

## Contratos a preservar
- No romper rutas públicas ni cambios de formato de datos sin actualizar consumidores y pruebas.
- Separar código de aplicación, datos, pruebas y automatización.
- Los cambios en deploy/monitorización deben verificarse con especial cuidado.
- Consultar `README.md` y el código actual como fuentes más recientes; este mapa es orientativo, no un inventario exhaustivo.


## Salud del monitoreo y observador opcional

`monitor-health.js` calcula observaciones/ventanas programadas y último dato, no disponibilidad de Cashea. `scripts/secondary-observer.mjs` acepta un feed externo autorizado y verificado; **no hay un segundo proveedor activo por defecto**. Revisar `docs/INDEPENDENT_MONITOR.md`. Las observaciones siguen almacenándose en `status.json` sobre `main` hasta migrar publicación y protección de rama conjuntamente para no interrumpir GitHub Pages.
