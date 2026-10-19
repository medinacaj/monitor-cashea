// Serie horaria exclusivamente basada en muestras reales. Los vacíos NO son caídas.
export const ESTADOS = Object.freeze(['up','down','restricted','unknown']);
export function estadoMuestra(m) {
  if (m?.code === 0) return 'unknown';
  if (m?.state === 'restricted' || [401,403,429].includes(m?.code)) return 'restricted';
  if (m?.state === 'unknown') return 'unknown';
  if (m?.state === 'up') return 'up';
  if (m?.state === 'down') return 'down';
  if (m?.up === true) return 'up';
  if (m?.up === false && Number.isInteger(m.code) && m.code >= 400) return 'down';
  return 'unknown';
}
export function construirHistorial(history=[], horas=24, ahora=Date.now()) {
  if (![24,72].includes(horas)) throw new RangeError('Período no compatible');
  const fin = ahora;
  const inicio = fin - horas * 3_600_000;
  const barras = Array.from({length:horas},(_,i)=>({
    t:inicio+i*3_600_000,up:0,down:0,restricted:0,unknown:0,
  }));
  const cuentas = {up:0,down:0,restricted:0,unknown:0};
  for(const muestra of (Array.isArray(history)?history:[])) {
    const t=Date.parse(muestra?.t);
    if(!Number.isFinite(t)||t<inicio||t>fin+300_000) continue;
    const index=Math.min(horas-1,Math.floor((t-inicio)/3_600_000));
    const estado=estadoMuestra(muestra);
    barras[index][estado]++;
    cuentas[estado]++;
  }
  const evaluables=cuentas.up+cuentas.down;
  return {
    horas,inicio,fin,barras,cuentas,
    muestras:Object.values(cuentas).reduce((s,n)=>s+n,0),
    evaluables,porcentaje:evaluables?100*cuentas.up/evaluables:null,
    vacios:barras.filter(b=>ESTADOS.every(k=>b[k]===0)).length,
  };
}
// Paleta con contraste no textual ≥ 3:1 sobre la superficie de la gráfica (#f7faf8).
export const COLORES = Object.freeze({up:'#1d8a5f',down:'#c0453d',restricted:'#b07d12',unknown:'#6f8597',vacio:'#7d9289'});
export const ETIQUETAS = Object.freeze({up:'Respondió',down:'Respuesta no satisfactoria',restricted:'Acceso restringido',unknown:'No comprobado'});
// Cobertura mínima para hablar de tendencia: al menos la mitad de las horas con muestras.
export function coberturaSuficiente(serie) {
  // Avoid claiming a meaningful trend from just one sample per observed hour.
  const observadas=serie.horas-serie.vacios;
  const previstas=serie.horas*4; // nominal 15-minute schedule
  return serie.horas>0 && observadas/serie.horas>=0.5 && serie.muestras/previstas>=0.5;
}
// Etiquetas del eje en HTML para que mantengan un tamaño legible en móviles.
export function etiquetasEje(horas) {
  return [0,Math.floor(horas/4),Math.floor(horas/2),Math.floor(horas*3/4),horas]
    .map(t => t===horas ? 'Ahora' : '−'+(horas-t)+' h');
}
export function svgHistorial(serie) {
  const {barras,horas}=serie;
  const W=900,H=124,left=12,right=12,top=14,barH=105,gap=horas===24?8:3;
  const step=(W-left-right)/barras.length;
  const width=Math.max(3,step-gap);
  const fragments=[];
  for(let i=0;i<barras.length;i++) {
    const b=barras[i],x=left+step*i+gap/2;
    const n=ESTADOS.reduce((s,k)=>s+b[k],0);
    const title=new Date(b.t).toLocaleString('es-VE',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
    if(!n) {
      // Hueco sin muestras: contorno discontinuo, nunca un color de estado.
      fragments.push(`<rect x="${(x+.75).toFixed(1)}" y="${top+.75}" width="${(width-1.5).toFixed(1)}" height="${barH-1.5}" rx="3" fill="none" stroke="${COLORES.vacio}" stroke-width="1.5" stroke-dasharray="4 3"><title>${title}: sin verificaciones</title></rect>`);
      continue;
    }
    let y=top+barH;
    // Segmentos proporcionales a la cantidad de comprobaciones de cada estado.
    for(const key of ESTADOS) {
      if(!b[key]) continue;
      const h=barH*b[key]/n;
      y-=h;
      const fill=key==='down'?'url(#trama-down)':COLORES[key];
      fragments.push(`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${width.toFixed(1)}" height="${h.toFixed(1)}" fill="${fill}" rx="2"><title>${title}: ${b[key]} × ${ETIQUETAS[key]}</title></rect>`);
    }
  }
  // La trama diagonal distingue las respuestas no satisfactorias sin depender del color.
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
    <defs><pattern id="trama-down" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0H8V8H0Z" fill="${COLORES.down}"/><path d="M0 0V8" stroke="#7a221d" stroke-width="3"/></pattern></defs>
    <line x1="12" y1="120" x2="888" y2="120" stroke="#cedbd3" stroke-width="1"/>
    ${fragments.join('')}</svg>`;
}
