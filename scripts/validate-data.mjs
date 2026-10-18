// Verifica integridad editorial del directorio, no afiliación actual.
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root = new URL('../', import.meta.url);
export async function validarDirectorio() {
  const [marcas, fuentes] = await Promise.all([
    readFile(new URL('comercios.json',root),'utf8').then(JSON.parse),
    readFile(new URL('fuentes.json',root),'utf8').then(JSON.parse)
  ]);
  const errores = [];
  if (!Array.isArray(marcas) || !marcas.length) errores.push('comercios.json debe contener marcas');
  if (!fuentes || typeof fuentes !== 'object' || Array.isArray(fuentes)) errores.push('fuentes.json inválido');
  const vistos = new Set();
  for (const item of Array.isArray(marcas) ? marcas : []) {
    if (typeof item.nombre !== 'string' || !item.nombre.trim()) errores.push('Marca sin nombre');
    const key = String(item.nombre || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
    if (vistos.has(key)) errores.push('Duplicada: '+item.nombre); else vistos.add(key);
    if (!item.categoria || typeof item.categoria !== 'string') errores.push('Categoría inválida: '+item.nombre);
    if (!Array.isArray(item.ciudades) || !item.ciudades.every(x => typeof x === 'string' && x.trim())) errores.push('Ciudades inválidas: '+item.nombre);
    if (!Array.isArray(item.fuentes) || !item.fuentes.length) errores.push('Sin referencias: '+item.nombre);
    else for (const id of item.fuentes) if (!Object.hasOwn(fuentes,id)) errores.push('Fuente sin registro: '+id+' en '+item.nombre);
  }
  for (const [id, f] of Object.entries(fuentes || {})) {
    if (!f || typeof f.titulo !== 'string' || !f.titulo.trim()) errores.push('Título de fuente inválido: '+id);
    try {
      const u=new URL(f.url);
      if (u.protocol !== 'https:') throw Error('HTTPS obligatorio');
    } catch { errores.push('URL inválida: '+id); }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(f.fecha_publicacion || '') ||
        Number.isNaN(Date.parse(f.fecha_publicacion))) errores.push('Fecha inválida: '+id);
  }
  return {errores,total:marcas.length,fuentes:Object.keys(fuentes).length};
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const r=await validarDirectorio();
  if (r.errores.length) { console.error(r.errores.join('\n')); process.exitCode=1; }
  else console.log('Directorio válido: '+r.total+' marcas y '+r.fuentes+' fuentes');
}
