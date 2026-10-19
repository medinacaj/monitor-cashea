// Health of this observer, NOT availability of Cashea. No synthetic observations.
export const MINUTOS_PREVISTOS = 15;
export function calcularCobertura(history=[], horas=24, ahora=Date.now(), minutos=MINUTOS_PREVISTOS) {
  if (![24,72].includes(horas) || !Number.isInteger(minutos) || minutos<1) throw new RangeError('Ventana inválida');
  const inicio=ahora-horas*3_600_000, previsto=Math.ceil(horas*60/minutos);
  const timestamps=[...new Set((Array.isArray(history)?history:[])
    .map(h=>Date.parse(h?.t))
    .filter(t=>Number.isFinite(t) && t>=inicio && t<=ahora+300_000))].sort((a,b)=>a-b);
  const registradas=timestamps.length;
  const cobertura=Math.round(Math.min(100,registradas/previsto*100));
  const ultima=timestamps.length?timestamps.at(-1):null;
  const edadMin=ultima===null?null:Math.max(0,Math.floor((ahora-ultima)/60_000));
  const retrasado=edadMin===null || edadMin>minutos*3;
  const tramos=[inicio,...timestamps,ahora];
  const huecoMaxMin=Math.round(Math.max(...tramos.slice(1).map((t,i)=>(t-tramos[i])/60_000)));
  return {horas,previsto,registradas,cobertura,ultima,edadMin,retrasado,huecoMaxMin,
    suficiente:registradas>=Math.ceil(previsto*.5) && !retrasado};
}
