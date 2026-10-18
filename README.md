# Monitor Cashea (no oficial)

Sitio estático independiente: estado del sitio de Cashea, simulador de cuotas y directorio de comercios. No está afiliado a Cashea.

## Cómo editar
- **Comercios:** edita `comercios.json` (campos: nombre, categoria, ciudades, fuentes). Cada fuente es un id definido en `fuentes.json` (título y enlace). La lista sale de prensa y portales públicos, no de Cashea.
- **Condiciones del simulador:** los valores por defecto están en `index.html` (inicial 40 %, 3 cuotas, 14 días). Son de ejemplo; verifícalos en la app oficial.

## Publicar
Settings → Pages → Deploy from a branch → `main` / root.

## Estado del servicio
- `targets.json` lista las URLs a revisar. El workflow `.github/workflows/check.yml` corre cada 15 min, ejecuta `scripts/check.mjs` y guarda el resultado en `status.json`.
- Mide solo si el sitio responde (código menor a 500). No mide la app ni los pagos.
- Para probarlo de inmediato: pestaña Actions → "Chequeo de disponibilidad" → Run workflow.
