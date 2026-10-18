// Chequeo de disponibilidad. Hace UNA petición GET por objetivo y guarda el resultado en status.json.
// "Disponible" = el servidor respondió con un código menor a 500. Mide alcanzabilidad, no funcionalidad.
import { readFile, writeFile } from 'node:fs/promises';

const TARGETS_FILE = process.env.TARGETS_FILE || 'targets.json';
const STATUS_FILE = process.env.STATUS_FILE || 'status.json';
const MAX_HISTORY = 288; // 3 días a razón de un chequeo cada 15 min
const TIMEOUT_MS = 10000;

async function readJson(path, fallback) {
  try { return JSON.parse(await readFile(path, 'utf8')); } catch { return fallback; }
}

async function probe(url) {
  const t0 = Date.now();
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { 'User-Agent': 'MonitorCashea/1.0 (chequeo de disponibilidad independiente)' }
    });
    return { t: new Date().toISOString(), up: res.status < 500, code: res.status, ms: Date.now() - t0 };
  } catch (e) {
    return { t: new Date().toISOString(), up: false, code: 0, ms: Date.now() - t0, err: e.name === 'TimeoutError' ? 'timeout' : 'red' };
  }
}

const targets = await readJson(TARGETS_FILE, []);
const prev = await readJson(STATUS_FILE, { targets: [] });
const out = { updated: new Date().toISOString(), targets: [] };

for (const tg of targets) {
  const old = (prev.targets || []).find((x) => x.url === tg.url);
  const history = old && Array.isArray(old.history) ? old.history : [];
  const r = await probe(tg.url);
  history.push(r);
  out.targets.push({ name: tg.name, url: tg.url, current: r, history: history.slice(-MAX_HISTORY) });
  console.log(`${tg.url} -> ${r.up ? 'UP' : 'DOWN'} (${r.code}) ${r.ms} ms`);
}

await writeFile(STATUS_FILE, JSON.stringify(out, null, 1) + '\n');
