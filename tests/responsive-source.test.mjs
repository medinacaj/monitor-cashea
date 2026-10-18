import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('el diseño final no revierte la calculadora móvil a dos columnas',async()=>{
  const css=await readFile(new URL('../styles.css',import.meta.url),'utf8');
  assert.match(css,/\.calc-section \.sim-grid\{display:block/);
  assert.match(css,/\.calc-section \.calc-resultados\{/);
  assert.match(css,/\.calc-section \.panel-controles\{/);
  assert.match(css,/@media\(max-width:1050px\)/);
  assert.match(css,/@media\(max-width:620px\)/);
});
test('menú móvil y tabla accesible por teclado',async()=>{
  const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
  assert.match(html,/class="mobile-nav"/);
  assert.match(html,/aria-label="Navegación móvil"/);
  assert.match(html,/id="calendario"[^>]*tabindex="0"/);
  assert.match(html,/id="cuotas"[^>]*type="number"/);
});

test('los cuatro desplegables usan el mismo control normalizado en Safari',async()=>{
 const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
 const css=await readFile(new URL('../styles.css',import.meta.url),'utf8');
 for(const id of ['modalidad','nivel','ciudad','categoria']){
   const patt=new RegExp('<div class="select-control"><select id="'+id+'"');
   assert.match(html,patt,'falta wrapper en '+id);
 }
 assert.match(css,/-webkit-appearance:none!important/);
 assert.match(css,/background-image:none!important/);
 assert.match(css,/\.select-control::after/);
 assert.match(css,/-webkit-text-fill-color:#123b30!important/);
});
