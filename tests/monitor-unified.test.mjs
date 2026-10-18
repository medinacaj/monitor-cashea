import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('Monitoreo presenta estado e historial en un único módulo',async()=>{
  const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
  const start=html.indexOf('class="monitor-unificado"');
  const end=html.indexOf('</section>',start);
  assert.ok(start>0&&end>start,'no se encontró la tarjeta');
  const block=html.slice(start,end);
  for(const id of ['estado-lista','estado-grafica','grafica-titulo','grafica-resumen','refrescar']){
    assert.ok(block.includes('id="'+id+'"'),id+' no está dentro del mismo módulo');
  }
  assert.ok(block.indexOf('id="estado-lista"')<block.indexOf('id="estado-grafica"'),'estado debe preceder al gráfico');
  assert.equal((html.match(/class="monitor-unificado"/g)||[]).length,1);
  assert.equal((html.match(/id="estado-grafica"/g)||[]).length,1);
  assert.equal((html.match(/data-periodo="24"/g)||[]).length,1);
  assert.equal((html.match(/data-periodo="72"/g)||[]).length,1);
});
test('No dibujar dos veces el historial y mantener estados HTTP honestos',async()=>{
  const js=await readFile(new URL('../app.js',import.meta.url),'utf8');
  assert.doesNotMatch(js,/class="historial" aria-label="Últimos chequeos"/);
  assert.doesNotMatch(js,/const barras = ult24/);
  assert.match(js,/pintarGraficaEstado\(data\)/);
  assert.match(js,/HTTP 403 significa acceso restringido/);
});
