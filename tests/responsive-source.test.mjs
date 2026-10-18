import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('el diseño final no revierte la calculadora móvil a dos columnas',async()=>{
  const css=await readFile(new URL('../styles.css',import.meta.url),'utf8');
  const indexUltimo=css.lastIndexOf('.sim-grid{');
  const final=css.slice(indexUltimo,indexUltimo+130);
  assert.match(final,/grid-template-columns:minmax\(0,1fr\)/);
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
