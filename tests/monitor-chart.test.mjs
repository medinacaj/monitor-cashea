import test from 'node:test';
import assert from 'node:assert/strict';
import { construirHistorial, estadoMuestra, svgHistorial } from '../monitor-chart.js';
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
 assert.match(svg,/viewBox="0 0 900 162"/);
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
