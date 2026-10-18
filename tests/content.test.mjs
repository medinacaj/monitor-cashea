import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validarDirectorio } from '../scripts/validate-data.mjs';

test('directorio con datos íntegros y fuentes enlazadas', async () => {
  const resultado=await validarDirectorio();
  assert.deepEqual(resultado.errores,[]);
  assert.equal(resultado.total,21);
  assert.equal(resultado.fuentes,6);
});
test('estructura web y sección de transparencia', async () => {
  const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
  for (const id of ['inicio','estado','simulador','directorio','modalidad','monto','inicial','cuotas','dias','fecha','resultado']) {
    assert.ok(html.includes('id="'+id+'"'),'Elemento inexistente: '+id);
  }
  assert.match(html,/no afiliado/i);
  assert.match(html,/href="#simulador"/);
  assert.match(html,/publican importes mínimos distintos/i);
  assert.match(html,/intereses/i);
});
test('el modo Cashea y los intereses hipotéticos no se confunden', async () => {
  const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
  assert.match(html,/no es una tasa de Cashea/i);
  assert.match(html,/0 % de interés/i);
});
