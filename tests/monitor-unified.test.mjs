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
  assert.match(js,/HTTP 403[^\n]*no (?:confirma|demuestra|implica|significa)[^\n]*caída/i, 'la interfaz debe advertir que un 403 no prueba una caída');
});

test('la gráfica sustituye la métrica duplicada de 24 horas',async()=>{
  const js=await readFile(new URL('../app.js',import.meta.url),'utf8');
  assert.doesNotMatch(js,/Respuestas satisfactorias en 24 h/);
  assert.doesNotMatch(js,/Sin muestra['"]/);
  assert.doesNotMatch(js,/Muestras evaluables/);
  assert.doesNotMatch(js,/class="estado-metricas"/);
  assert.doesNotMatch(js,/\*Porcentaje de muestras del monitor/);
  assert.match(js,/class="estado-ultima"/);
  assert.match(js,/Última comprobación/);
  assert.match(js,/pintarGraficaEstado\(data\)/);
});

test('título, explicación, estado, gráfico y botón viven en una sola tarjeta',async()=>{
  const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
  const a=html.indexOf('<section id="estado"');
  const b=html.indexOf('</section>',a);
  const section=html.slice(a,b);
  const cardStart=section.indexOf('<div class="monitor-unificado"');
  const card=section.slice(cardStart);
  assert.ok(cardStart>0);
  for (const id of ['estado-titulo','estado-lista','grafica-titulo','grafica-resumen','estado-grafica','grafica-nota','refrescar'])
    assert.ok(card.includes('id="'+id+'"'),'Falta '+id+' dentro de la tarjeta');
  assert.match(card,/Estado y <span>estabilidad\.<\/span>/);
  assert.match(card,/Verificamos el sitio web público de Cashea/);
  assert.ok(card.indexOf('id="estado-titulo"')<card.indexOf('id="estado-lista"'));
  assert.ok(card.indexOf('id="estado-lista"')<card.indexOf('id="estado-grafica"'));
  assert.equal((section.match(/class="monitor-unificado"/g)||[]).length,1);
  assert.doesNotMatch(section,/\?La web/);
});
test('el texto legal no se repite en el encabezado y la gráfica',async()=>{
  const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
  const js=await readFile(new URL('../app.js',import.meta.url),'utf8');
  assert.doesNotMatch(html,/WEB STATUS \/ 24H/);
  assert.doesNotMatch(js,/No mide la app ni los pagos/);
  assert.doesNotMatch(js,/Solo observación HTTP; no verifica app o pagos/);
  assert.doesNotMatch(js,/Sin datos evaluables/);
  assert.match(js,/HTTP 403[^\n]*no (?:confirma|demuestra|implica|significa)[^\n]*caída/i, 'la interfaz debe advertir que un 403 no prueba una caída');
});
