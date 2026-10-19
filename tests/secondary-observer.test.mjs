import test from 'node:test';
import assert from 'node:assert/strict';
import {validarObservacionExterna,obtenerObservacionExterna} from '../scripts/secondary-observer.mjs';
const now=Date.parse('2026-10-18T22:00:00Z');
const url='https://www.cashea.app',networkId='monitor-red-independiente';
const payload={target_url:url,network_id:networkId,checked_at:new Date(now-60_000).toISOString(),state:'up',http_code:200};
test('solo considera otra red mediante configuración explícita',async()=>{
 assert.equal(await obtenerObservacionExterna(url,{env:{},ahora:now}),null);
 assert.equal(await obtenerObservacionExterna(url,{env:{SECONDARY_OBSERVER_AUTHORIZED:'true'},ahora:now}),null);
 const env={SECONDARY_OBSERVER_FEED_URL:'https://monitor.example.org/status',
   SECONDARY_OBSERVER_NETWORK_ID:networkId,SECONDARY_OBSERVER_TOKEN:'opaque',SECONDARY_OBSERVER_AUTHORIZED:'true'};
 const result=await obtenerObservacionExterna(url,{env,ahora:now,fetchImpl:async()=>({ok:true,text:async()=>JSON.stringify(payload)})});
 assert.equal(result.provider,networkId);assert.equal(result.state,'up');assert.equal(result.authorized,true);
});
test('descarta muestras antiguas, falsos destinos y misma red',()=>{
 assert.throws(()=>validarObservacionExterna({...payload,target_url:'https://otro.example.org'},{targetUrl:url,networkId,ahora:now}));
 assert.throws(()=>validarObservacionExterna({...payload,checked_at:new Date(now-20*60_000).toISOString()},{targetUrl:url,networkId,ahora:now}));
 assert.throws(()=>validarObservacionExterna({...payload,network_id:'github-actions'},{targetUrl:url,networkId:'github-actions',ahora:now}));
});
test('bloqueo del proveedor no se convierte en respuesta satisfactoria',()=>{
 const r=validarObservacionExterna({...payload,state:'restricted',http_code:403},{targetUrl:url,networkId,ahora:now});
 assert.equal(r.state,'restricted');assert.equal(r.up,false);
});
test('fallos de red no crean segunda fuente',async()=>{
 const env={SECONDARY_OBSERVER_FEED_URL:'https://www.cashea.app/test',SECONDARY_OBSERVER_NETWORK_ID:networkId,
 SECONDARY_OBSERVER_TOKEN:'a',SECONDARY_OBSERVER_AUTHORIZED:'true'};
 await assert.rejects(obtenerObservacionExterna(url,{env,ahora:now}));
});
