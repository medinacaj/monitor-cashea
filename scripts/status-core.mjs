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
  const evaluables = muestras.filter(x => x.state !== 'restricted' && x.state !== 'unknown');
  const correctos = evaluables.filter(x => x.state === 'up' || (!x.state && x.up === true)).length;
  return { correctos, evaluables: evaluables.length, porcentaje: evaluables.length ? Math.round(1000 * correctos / evaluables.length) / 10 : null };
}
