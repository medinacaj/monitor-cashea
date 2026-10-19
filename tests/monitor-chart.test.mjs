import test from 'node:test';
import assert from 'node:assert/strict';
import { construirHistorial, estadoMuestra, svgHistorial, COLORES, coberturaSuficiente, etiquetasEje } from '../monitor-chart.js';
const ahora=Date.parse('2026-10-18T12:00:00Z');
const row=(h,attrs)=>({t:new Date(ahora-h*3_600_000).toISOString(),...attrs});
test('los bloqueos 403 y errores de red nunca figuran como caída',()=>{
 assert.equal(estadoMuestra({code:403,state:'down',up:false}),'restricted');
 assert.equal(estadoMuestra({code:429,up:false}),'restricted');
 assert.equal(estadoMuestra({code:0,state:'down',up:false}),'unknown');
 assert.equal(estadoMuestra({code:200,up:true}),'up');
 assert.equal(estadoMuestra({code:503,state:'down'}),'down');
});
test('muestras reales, intervalos sin datos y porcentaje sobre verificables',()=>{
 const s=construirHistorial([
   row(1,{state:'up',up:true,code:200}),
   row(2,{state:'restricted',up:false,code:403}),
   row(3,{state:'unknown',code:0}),
   row(4,{state:'down',code:503}),
   row(50,{state:'down',code:500}), // fuera de 24 horas
 ],24,ahora);
 assert.equal(s.barras.length,24);
 assert.deepEqual(s.cuentas,{up:1,down:1,restricted:1,unknown:1});
 assert.equal(s.evaluables,2);
 assert.equal(s.muestras,4);
 assert.equal(s.porcentaje,50);
 assert.equal(s.vacios,20);
 const svg=svgHistorial(s);
 assert.match(svg,/viewBox="0 0 900 124"/);
 assert.doesNotMatch(svg,/<text/,'las etiquetas del eje viven en HTML');
 assert.match(svg,/sin verificaciones/);
});
test('solo accesos restringidos no producen falsa tasa de estabilidad ni caídas',()=>{
 const s=construirHistorial([row(1,{code:403,state:'restricted',up:false})],24,ahora);
 assert.equal(s.cuentas.down,0);
 assert.equal(s.evaluables,0);
 assert.equal(s.porcentaje,null);
 assert.match(svgHistorial(s),/Acceso restringido/);
});
test('rango de 72 horas y limitaciones de fechas',()=>{
 const s=construirHistorial([row(50,{code:200,up:true}),row(75,{state:'down',code:500})],72,ahora);
 assert.equal(s.barras.length,72);
 assert.equal(s.muestras,1);
 assert.equal(s.cuentas.up,1);
 assert.throws(()=>construirHistorial([],7,ahora),RangeError);
});

const contraste=(a,b)=>{
 const L=h=>{const c=[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255).map(v=>v<=.03928?v/12.92:((v+.055)/1.055)**2.4);return .2126*c[0]+.7152*c[1]+.0722*c[2];};
 const x=L(a),y=L(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);
};
test('la paleta del gráfico cumple contraste no textual 3:1 y no depende solo del color',()=>{
 for(const [k,c] of Object.entries(COLORES)) assert.ok(contraste(c,'#f7faf8')>=3,k+' '+c+' por debajo de 3:1');
 const s=construirHistorial([row(1,{state:'down',code:503})],24,ahora);
 const svg=svgHistorial(s);
 assert.match(svg,/fill="url\(#trama-down\)"/);
 assert.match(svg,/stroke-dasharray/,'las horas vacías se dibujan con contorno');
});
test('cobertura y etiquetas del eje',()=>{
 const pocas=construirHistorial([row(1,{code:403,state:'restricted'})],24,ahora);
 assert.equal(coberturaSuficiente(pocas),false);
 const filas=Array.from({length:96},(_,i)=>row((i+.5)/4,{code:200,up:true}));
 assert.equal(coberturaSuficiente(construirHistorial(filas,24,ahora)),true);
 assert.deepEqual(etiquetasEje(24),['−24 h','−18 h','−12 h','−6 h','Ahora']);
 assert.equal(etiquetasEje(72).length,5);
});
