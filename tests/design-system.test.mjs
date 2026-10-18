import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';

const leer=f=>readFile(new URL('../'+f,import.meta.url),'utf8');

test('tipografías alojadas en el sitio con su licencia, sin Google Fonts',async()=>{
  const css=await leer('styles.css'), html=await leer('index.html');
  assert.doesNotMatch(css+html,/fonts\.googleapis|fonts\.gstatic/);
  for (const f of ['fonts/dm-sans-latin.woff2','fonts/space-grotesk-latin.woff2','fonts/OFL-DMSans.txt','fonts/OFL-SpaceGrotesk.txt'])
    assert.ok((await stat(new URL('../'+f,import.meta.url))).size>0,f);
  assert.match(css,/@font-face\{font-family:'DM Sans'/);
});
test('tokens de diseño y tamaño de letra mínimo de 12px',async()=>{
  const css=await leer('styles.css');
  for (const t of ['--muted','--surface','--ok','--bad','--warn','--unk','--stale','--r-sm','--r-md','--r-lg','--fs-xs'])
    assert.match(css,new RegExp(t+':'),'falta token '+t);
  const pequenos=[...css.matchAll(/font(?:-size)?:[^;}]*?\b(\d+)px/g)].map(m=>+m[1]).filter(n=>n<12);
  assert.deepEqual(pequenos,[],'tamaños por debajo de 12px');
  // El ámbar queda reservado a «acceso restringido»; desactualizado usa su propio color.
  assert.match(css,/\.estado-card\.stale \.estado-indicador\{background:var\(--stale-bg\)/);
});
test('sin restos de la portada eliminada en V2.4',async()=>{
  const css=await leer('styles.css');
  assert.doesNotMatch(css,/\.hero|moneda-ficticia|tarjeta-flotante|panel-resultado|res-tarjetas/);
});
test('metadatos y navegación coherentes',async()=>{
  const html=await leer('index.html');
  assert.match(html,/<meta name="theme-color" content="#f5f7f4">/);
  assert.match(html,/class="saltar" href="#simulador"/);
  // ↗ indica enlace externo: no se usa en anclas internas.
  for (const m of html.matchAll(/<a [^>]*href="#[^"]*"[^>]*>([\s\S]*?)<\/a>/g)) assert.doesNotMatch(m[1],/↗/);
});
test('el calendario oculta columnas de interés vacías y apila en móvil',async()=>{
  const js=await leer('app.js'), css=await leer('styles.css');
  assert.match(js,/const desglose = plan\.interesesC > 0 \|\| plan\.recargosC > 0/);
  assert.match(js,/data-label="/);
  assert.match(css,/td\[data-label="Total"\]/);
  assert.match(js,/0 % interés/);
});
