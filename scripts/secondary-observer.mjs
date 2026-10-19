// Optional authorized observer on a genuinely independent network.
const MAX_AGE_MS=15*60_000;
export function validarObservacionExterna(payload,{targetUrl,networkId,ahora=Date.now()}) {
  if(!payload || typeof payload!=='object' || !['up','down','restricted','unknown'].includes(payload.state))
    throw new Error('Formato de señal externa inválido');
  if(payload.target_url!==targetUrl || payload.network_id!==networkId ||
      networkId==='github-actions'|| !/^[a-zA-Z0-9][a-zA-Z0-9_.-]{2,63}$/.test(networkId))
    throw new Error('Origen o destino de red no verificable');
  const t=Date.parse(payload.checked_at);
  if(!Number.isFinite(t) || t>ahora+60_000 || ahora-t>MAX_AGE_MS)
    throw new Error('Muestra externa desactualizada');
  return {provider:networkId,authorized:true,t:new Date(t).toISOString(),
    state:payload.state,code:typeof payload.http_code==='number'?payload.http_code:0,
    up:payload.state==='up'};
}
export async function obtenerObservacionExterna(targetUrl,{env=process.env,fetchImpl=fetch,ahora=Date.now()}={}) {
  const feed=env.SECONDARY_OBSERVER_FEED_URL, networkId=env.SECONDARY_OBSERVER_NETWORK_ID;
  const token=env.SECONDARY_OBSERVER_TOKEN;
  // Fail closed: an unconfigured provider NEVER counts as another network.
  if(env.SECONDARY_OBSERVER_AUTHORIZED!=='true'||!feed||!networkId||!token) return null;
  const url=new URL(feed);
  const target=new URL(targetUrl);
  if(url.protocol!=='https:'||url.username||url.password||url.hostname===target.hostname)
    throw new Error('El observador externo debe utilizar un endpoint HTTPS distinto');
  const response=await fetchImpl(url.toString(),{redirect:'error',
    signal:AbortSignal.timeout(8_000),
    headers:{Authorization:'Bearer '+token,Accept:'application/json'}});
  if(!response.ok) throw new Error('Observador externo HTTP '+response.status);
  const raw=await response.text();
  if(raw.length>8_192) throw new Error('Respuesta externa demasiado grande');
  return validarObservacionExterna(JSON.parse(raw),{targetUrl,networkId,ahora});
}
