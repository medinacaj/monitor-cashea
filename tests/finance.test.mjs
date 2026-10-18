import test from 'node:test';
import assert from 'node:assert/strict';
import { calcularPlan } from '../finance.js';
const base = { monto:300, inicialPct:40, cuotas:3, dias:14, fecha:'2026-10-18' };
test('tres cuotas sin intereses mantienen el precio y fechas correctas', () => {
  const x = calcularPlan(base);
  assert.equal(x.montoC,30000);
  assert.equal(x.inicialC,12000);
  assert.equal(x.financiadoC,18000);
  assert.equal(x.interesesC,0);
  assert.equal(x.recargosC,0);
  assert.equal(x.totalC,30000);
  assert.deepEqual(x.filas.map(f=>f.totalC),[6000,6000,6000]);
  assert.equal(x.filas[0].fecha,'2026-11-01');
});
test('residuo de redondeo se asigna a la última cuota', () => {
  const x = calcularPlan({...base,monto:100,inicialPct:0});
  assert.deepEqual(x.filas.map(f=>f.totalC),[3333,3333,3334]);
  assert.equal(x.totalC,10000);
});
test('un interés anual ilustrativo aumenta el total y reparte capital e interés', () => {
  const x = calcularPlan({...base,tasaAnual:24});
  assert.ok(x.interesesC>0);
  assert.equal(x.totalC,30000+x.interesesC);
  assert.equal(x.filas.reduce((a,f)=>a+f.capitalC,0),18000);
  assert.equal(x.filas.reduce((a,f)=>a+f.interesC,0),x.interesesC);
});
test('Línea Cotidiana puede simular una cuota sin interés', () => {
  const x = calcularPlan({...base,cuotas:1});
  assert.equal(x.filas.length,1);
  assert.equal(x.filas[0].totalC,18000);
});
test('un atraso de 2 días no genera recargo y 3 días sí', () => {
  const p = {...base,cuotasAtrasadas:2,diasAtraso:2};
  assert.equal(calcularPlan(p).recargosC,0);
  assert.equal(calcularPlan({...p,diasAtraso:3}).recargosC,800);
  assert.equal(calcularPlan({...p,diasAtraso:3}).totalC,30800);
});
test('los datos inválidos no generan simulación', () => {
  for (const valores of [{monto:0},{inicialPct:101},{cuotas:0},{cuotas:2.5},{dias:0},{tasaAnual:300},{fecha:'2026-02-30'},{cuotasAtrasadas:4}]) {
    assert.throws(()=>calcularPlan({...base,...valores}),RangeError);
  }
});
