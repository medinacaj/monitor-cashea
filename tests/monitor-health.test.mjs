import test from 'node:test';
import assert from 'node:assert/strict';
import {calcularCobertura} from '../monitor-health.js';
const now=Date.parse('2026-10-18T22:00:00Z');
const sample=m=>({t:new Date(now-m*60_000).toISOString(),code:403,state:'restricted'});
test('8 muestras restringidas jamás equivalen a 96 comprobaciones ni a estabilidad',()=>{
 const s=calcularCobertura([15,135,255,375,495,615,735,855].map(sample),24,now);
 assert.equal(s.registradas,8);assert.equal(s.previsto,96);assert.equal(s.cobertura,8);
 assert.equal(s.suficiente,false);
});
test('sin muestras y monitor retrasado se distinguen de caídas',()=>{
 const s=calcularCobertura([],24,now);
 assert.equal(s.cobertura,0);assert.equal(s.retrasado,true);assert.equal(s.edadMin,null);
 assert.equal(s.huecoMaxMin,1440);
 const t=calcularCobertura([sample(85)],24,now);
 assert.equal(t.retrasado,true);assert.equal(t.edadMin,85);
});
test('cobertura completa con intervalos regulares puede ser suficiente',()=>{
 const h=Array.from({length:96},(_,i)=>sample(7+i*15));
 const s=calcularCobertura(h,24,now);
 assert.equal(s.previsto,96);assert.equal(s.registradas,96);assert.equal(s.cobertura,100);
 assert.equal(s.suficiente,true);assert.equal(s.retrasado,false);
});
test('descarta muestras fuera del período y evita duplicados',()=>{
 const s=calcularCobertura([sample(5),sample(5),sample(1500),sample(-12),{t:'invalid'}],24,now);
 assert.equal(s.registradas,1);
 assert.equal(calcularCobertura(Array.from({length:288},(_,i)=>sample(i*15)),72,now).previsto,288);
 assert.throws(()=>calcularCobertura([],6,now),RangeError);
});
