import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
test('calculadora primero, monitoreo después y comercios al final (V2.11)',async()=>{
 const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
 assert.ok(html.indexOf('<section id="simulador"') < html.indexOf('<section id="estado"'));
 assert.ok(html.indexOf('<section id="estado"') < html.indexOf('<section id="directorio"'));
 const nav=html.split('<nav aria-label="Navegación principal">')[1].split('</nav>')[0];
 assert.ok(nav.indexOf('href="#simulador"') < nav.indexOf('href="#estado"'));
 assert.ok(nav.indexOf('href="#estado"') < nav.indexOf('href="#directorio"'));
 // Franja compacta de estado antes de la calculadora, enlazada al historial.
 assert.ok(html.indexOf('id="estado-franja"') < html.indexOf('<section id="simulador"'));
 assert.match(html,/<a href="#estado" id="estado-franja"/);
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
 // El h1 es el primer encabezado del contenido principal.
 const main=html.slice(html.indexOf('<main'));
 assert.ok(main.indexOf('<h1')<main.indexOf('<h2'),'un h2 precede al h1');
 assert.match(html,/<details class="calc-fuentes">/);
 assert.match(html,/publican importes mínimos distintos/);
 assert.match(html,/no es una tasa de Cashea/);
});
