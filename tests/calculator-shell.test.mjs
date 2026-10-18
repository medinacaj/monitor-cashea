import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
test('monitoreo primero, calculadora funcional integrada y comercios al final',async()=>{
 const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
 assert.ok(html.indexOf('id="estado"') < html.indexOf('id="simulador"'));
 assert.ok(html.indexOf('id="simulador"') < html.indexOf('id="directorio"'));
 assert.ok(html.indexOf('href="#estado"') < html.indexOf('href="#simulador"'));
 assert.ok(!html.includes('class="hero"'));
 assert.ok(!html.includes('calc-arte-tarjeta'));
 const start=html.indexOf('class="calculadora-shell"');
 const contenido=html.slice(start,html.indexOf('</section>',start));
 for(const id of ['form-sim','monto','cuotas','cuotas-menos','cuotas-mas','inicial','resultado','plan-nota']) assert.ok(contenido.includes('id="'+id+'"'),id);
 assert.ok(contenido.includes('id="resultado" class="resultado calc-resultados"'));
 assert.ok(!contenido.includes('class="panel-resultado"'));
 assert.ok(!html.includes('RESUMEN DE TU COMPRA'));
});
test('solo un título principal y fuentes accesibles sin bloques redundantes',async()=>{
 const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
 assert.equal((html.match(/<h1\b/g)||[]).length,1);
 assert.match(html,/<details class="calc-fuentes">/);
 assert.match(html,/publican importes mínimos distintos/);
 assert.match(html,/no es una tasa de Cashea/);
});
