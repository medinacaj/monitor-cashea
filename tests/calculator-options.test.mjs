import test from 'node:test';
import assert from 'node:assert/strict';
import { CUOTAS_RAPIDAS, ajustarCuotas, modoTrasEditarCuotas, validarSimulacion } from '../calculator-options.js';
import { calcularPlan } from '../finance.js';

test('la cantidad se puede establecer manualmente del 1 al 12', () => {
  for (let n = 1; n <= 12; n++) {
    assert.equal(ajustarCuotas(n),n);
    const plan=calcularPlan({monto:300,inicialPct:40,cuotas:n,dias:14,fecha:'2026-10-18'});
    assert.equal(plan.filas.length,n);
    assert.equal(plan.totalC,30000);
  }
});
test('controles nunca exceden los límites', () => {
  assert.equal(ajustarCuotas(0),1);
  assert.equal(ajustarCuotas(13),12);
  assert.equal(ajustarCuotas(4.8),5);
  assert.deepEqual(CUOTAS_RAPIDAS,[1,3,6,9,12]);
});
test('editar cualquier preset Cashea convierte a simulación libre', () => {
  for (const m of ['principal','cotidiana','mas','personalizada']) {
    assert.equal(modoTrasEditarCuotas(m),'personalizada');
  }
  assert.equal(modoTrasEditarCuotas('comparar'),'comparar');
});
test('el diseño expone campo numérico editable y accesos rápidos', async () => {
  const {readFile}=await import('node:fs/promises');
  const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
  const app=await readFile(new URL('../app.js',import.meta.url),'utf8');
  assert.match(html,/id="cuotas"[^>]*type="number"[^>]*min="1"[^>]*max="12"/);
  assert.doesNotMatch(html,/id="cuotas"[^>]*readonly/);
  for (const n of CUOTAS_RAPIDAS) assert.ok(html.includes('data-cuotas="'+n+'"'));
  assert.ok(html.includes('id="cuotas-menos"'));
  assert.ok(html.includes('id="cuotas-mas"'));
  assert.match(app,/modoTrasEditarCuotas/);
  assert.match(app,/\$\('cuotas'\)\.readOnly = false/);
});

const base={monto:'300',inicial:'40',cuotas:'3',dias:'14',fecha:'2026-10-18',tasa:'24','atraso-dias':'0','cuotas-vencidas':'0'};
test('la validación señala exactamente el campo incorrecto', () => {
  assert.deepEqual(validarSimulacion(base,'personalizada'),{});
  assert.deepEqual(Object.keys(validarSimulacion({...base,inicial:'150'},'personalizada')),['inicial']);
  assert.equal(validarSimulacion({...base,monto:''},'personalizada').monto,'Campo obligatorio.');
  assert.ok(validarSimulacion({...base,cuotas:'2.5'},'personalizada').cuotas);
  assert.ok(validarSimulacion({...base,fecha:'2026-02-30'},'personalizada').fecha);
  assert.ok(validarSimulacion({...base,dias:'0'},'comparar').dias);
});
test('los campos ocultos no bloquean la simulación', () => {
  assert.deepEqual(validarSimulacion({...base,tasa:'',['cuotas-vencidas']:'9'},'personalizada'),{});
  assert.ok(validarSimulacion({...base,tasa:'300'},'comparar').tasa);
  assert.ok(validarSimulacion({...base,['cuotas-vencidas']:'4'},'principal')['cuotas-vencidas']);
});
test('validación coherente con el motor de cálculo', () => {
  const casos=[{...base},{...base,inicial:'100'},{...base,cuotas:'12'},{...base,monto:'1000000'}];
  for (const c of casos) {
    assert.deepEqual(validarSimulacion(c,'personalizada'),{});
    assert.doesNotThrow(()=>calcularPlan({monto:+c.monto,inicialPct:+c.inicial,cuotas:+c.cuotas,dias:+c.dias,fecha:c.fecha}));
  }
});
