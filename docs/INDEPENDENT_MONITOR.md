# Integración de segundo observador (inactiva hasta su configuración)

El monitor publicado utiliza una sola red: GitHub Actions. Dos sistemas operativos, dos URLs
o un proxy desde ese mismo runner no constituyen observadores independientes.

Para conectar un proveedor real, se necesita una cuenta con supervisión desde otra red,
autorización para acceder al servicio y evidencia de que la medición es efectivamente independiente.
No se recomienda eludir protecciones ni bloqueos de Cashea.

## Contrato HTTPS de la fuente

El endpoint del proveedor debe devolver JSON:
```json
{"target_url":"https://www.cashea.app","network_id":"proveedor-red-2",
 "checked_at":"2026-10-18T22:00:00Z","state":"up","http_code":200}
```
`state` admite `up`, `down`, `restricted`, `unknown`. La muestra debe tener <=15 minutos;
las restricciones y errores de red no cuentan como disponibilidad ni caída corroborada.
La observación es sobre el sitio web, no sobre pagos, compras o la aplicación.

Configurar en GitHub **Settings → Secrets and variables → Actions**:
- Secrets: `SECONDARY_OBSERVER_FEED_URL` y `SECONDARY_OBSERVER_TOKEN`.
- Variables: `SECONDARY_OBSERVER_NETWORK_ID` y `SECONDARY_OBSERVER_AUTHORIZED=true` solo tras
  verificar el control de la otra red, condiciones de uso, permisos de consulta y evidencia reproducible.

El workflow lee el JSON por HTTPS con `Authorization: Bearer`, sin redirecciones.
Los tokens nunca se escriben en los resultados. Si la fuente falla, es vieja o no está autorizada,
el sistema continúa con una única señal y `verdict=insufficient`.
El usuario debe validar proveedor, frecuencia, coste, privacidad, limitaciones y jurisdicción.

**No activar la variable como verdadera sin comprobar independencia real.**
