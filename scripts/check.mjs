// Comprueba exclusivamente si el sitio web público responde. NO certifica la app ni los pagos.
import { readFile, writeFile } from 'node:fs/promises';
import { clasificarHttp, corroborarSitio } from './status-core.mjs';
import { obtenerObservacionExterna } from './secondary-observer.mjs';
const TARGETS_FILE = process.env.TARGETS_FILE || 'targets.json';
const STATUS_FILE = process.env.STATUS_FILE || 'status.json';
const MAX_HISTORY = 288; // 72 h máximo a la cadencia nominal de 15 min
const MAX_AGE_MS = 72*3_600_000;
const TIMEOUT_MS = 10000;
async function readJson(path, fallback) {
  try { return JSON.parse(await readFile(path, 'utf8')); } catch { return fallback; }
}
async function probe(url) {
  const t0 = Date.now();
  try {
    if (!/^https:\/\//i.test(url)) throw Error('Destino no HTTPS');
    const response = await fetch(url, {
      method:'GET', redirect:'follow', signal:AbortSignal.timeout(TIMEOUT_MS),
      headers:{'User-Agent':'MonitorCashea/2.0 (observación no oficial del sitio público)'}
    });
    const state = clasificarHttp(response.status);
    return {t:new Date().toISOString(),state,up:state==='up',code:response.status,ms:Date.now()-t0};
  } catch (e) {
    return {t:new Date().toISOString(),state:'unknown',up:false,code:0,ms:Date.now()-t0,err:e.name === 'TimeoutError' ? 'timeout' : 'network'};
  }
}
const targets = await readJson(TARGETS_FILE, []);
if (!Array.isArray(targets) || targets.length > 10) throw Error('targets.json debe contener hasta 10 objetivos');
const previous = await readJson(STATUS_FILE, {targets:[]});
const result = {updated:new Date().toISOString(),targets:[]};
for (const target of targets) {
  if (!target || typeof target.url !== 'string' || typeof target.name !== 'string') throw Error('Objetivo inválido');
  const old = (previous.targets || []).find(x => x.url === target.url);
  const current = await probe(target.url);
  const ahora=Date.parse(current.t);
  const history=(old && Array.isArray(old.history) ? old.history : []).filter(h=>{
    const t=Date.parse(h?.t);
    return Number.isFinite(t)&&t>=ahora-MAX_AGE_MS&&t<=ahora;
  });
  history.push(current);
  const trimmed=history.slice(-MAX_HISTORY);
  const primary={provider:'github-actions',authorized:true,...current};
  let secondary=null;
  try {secondary=await obtenerObservacionExterna(target.url);}
  catch(e){console.warn('Observador independiente no disponible: '+e.message);}
  const signals=secondary?[primary,secondary]:[primary];
  const corroboration=corroborarSitio(signals);
  const observers=signals.map(x=>({provider:x.provider,t:x.t,state:x.state}));
  result.targets.push({name:target.name,url:target.url,current,history:trimmed,corroboration,observers});
  console.log(`${target.url} -> ${current.state.toUpperCase()} (HTTP ${current.code}) ${current.ms}ms`);
}
await writeFile(STATUS_FILE, JSON.stringify(result,null,2) + '\n');
