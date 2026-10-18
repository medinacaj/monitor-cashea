import test from 'node:test';
import assert from 'node:assert/strict';
import { clasificarHttp, calcularMuestra24h } from '../scripts/status-core.mjs';
test('las respuestas 403/429 son restringidas, no caídas', () => {
  assert.equal(clasificarHttp(0),'unknown');
  assert.equal(clasificarHttp(200),'up');
  assert.equal(clasificarHttp(301),'up');
  assert.equal(clasificarHttp(403),'restricted');
  assert.equal(clasificarHttp(429),'restricted');
  assert.equal(clasificarHttp(404),'down');
  assert.equal(clasificarHttp(503),'down');
  assert.equal(clasificarHttp(0),'unknown');
});
test('la disponibilidad ignora muestras bloqueadas y antiguas', () => {
  const now = Date.parse('2026-10-18T12:00:00Z');
  const a = calcularMuestra24h([
    {t:'2026-10-18T11:00:00Z',state:'up',up:true},
    {t:'2026-10-18T10:00:00Z',state:'down',up:false},
    {t:'2026-10-18T09:00:00Z',state:'restricted',up:false},
    {t:'2026-10-15T09:00:00Z',state:'up',up:true}
  ],now);
  assert.deepEqual(a,{correctos:1,evaluables:2,porcentaje:50});
  assert.equal(calcularMuestra24h([],now).porcentaje,null);
});

test('un error antiguo HTTP 0 no cuenta como caída evaluable', () => {
  const now=Date.parse('2026-10-18T12:00:00Z');
  const x=calcularMuestra24h([{t:'2026-10-18T11:00:00Z',state:'down',up:false,code:0}],now);
  assert.equal(x.evaluables,0);
  assert.equal(x.porcentaje,null);
});
