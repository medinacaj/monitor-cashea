// Clasificación deliberadamente conservadora: un código 403 no demuestra una caída de Cashea.
export function clasificarHttp(code) {
  if (code === 0) return 'unknown';
  if (code >= 200 && code < 400) return 'up';
  if ([401, 403, 429].includes(code)) return 'restricted';
  return 'down';
}
export function calcularMuestra24h(history, ahora = Date.now()) {
  const muestras = (Array.isArray(history) ? history : []).filter(x => {
    const t = Date.parse(x.t);
    return Number.isFinite(t) && t >= ahora - 86_400_000 && t <= ahora + 300_000;
  });
  const evaluables = muestras.filter(x => x.state !== 'restricted' && x.state !== 'unknown' && x.code !== 0);
  const correctos = evaluables.filter(x => x.state === 'up' || (!x.state && x.up === true)).length;
  return { correctos, evaluables: evaluables.length, porcentaje: evaluables.length ? Math.round(1000 * correctos / evaluables.length) / 10 : null };
}

/**
 * Veredicto público sobre el sitio: exige dos proveedores DE RED independientes.
 * Dos URLs, reintentos o sistemas operativos en el mismo runner NO cuentan
 * como dos proveedores. Una señal no equivale a disponibilidad de app/pagos.
 */
export function corroborarSitio(signals, ahora = Date.now()) {
  const recientes = (Array.isArray(signals) ? signals : []).filter(s => {
    const fecha = Date.parse(s?.t || '');
    return s && typeof s.provider === 'string' && s.provider.trim() &&
      Number.isFinite(fecha) && Math.abs(ahora - fecha) <= 15 * 60_000 &&
      ['up','down'].includes(s.state) && s.authorized === true;
  });
  const independientes = new Map();
  for (const s of recientes) {
    const prev = independientes.get(s.provider);
    if (!prev || Date.parse(s.t) > Date.parse(prev.t)) independientes.set(s.provider,s);
  }
  const evaluables = [...independientes.values()];
  const up = evaluables.filter(s => s.state === 'up').length;
  const down = evaluables.filter(s => s.state === 'down').length;
  const verdict = up >= 2 && down === 0 ? 'responding' :
    down >= 2 && up === 0 ? 'unresponsive' : 'insufficient';
  return {verdict, providers: evaluables.length, up, down};
}
