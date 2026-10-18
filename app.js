import { calcularPlan } from './finance.js';
import { construirHistorial, svgHistorial } from './monitor-chart.js';
import { CUOTAS_MIN, CUOTAS_MAX, modoTrasEditarCuotas, ajustarCuotas } from './calculator-options.js';

const $ = id => document.getElementById(id);
const fmt = n => new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'USD' }).format(n / 100);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
const norm = s => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const fechas = s => {
  const [y, m, d] = s.split('-').map(Number);
  return new Intl.DateTimeFormat('es-VE', { day:'2-digit', month:'short', year:'numeric' }).format(new Date(y, m - 1, d));
};
const notas = {
  principal: 'Línea Principal: referencia de 3 cuotas sin interés. La inicial elegida es ilustrativa; confirma las condiciones en Cashea.',
  cotidiana: 'Línea Cotidiana: una cuota sin interés a 14 días. Comprueba en la app tu línea disponible y los comercios participantes.',
  mas: 'Modo Más Cuotas: referencia de 6, 9 o 12 cuotas para productos elegibles. Comprueba tu oferta en Cashea; sus páginas publican importes mínimos distintos.',
  personalizada: 'Simulación libre: las cuotas elegidas son orientativas y no una oferta oficial.',
  comparar: 'Comparador de un préstamo hipotético: la tasa anual es editable y NO corresponde a Cashea. Los resultados no constituyen oferta financiera.'
};
function hoy() {
  const d = new Date();
  return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
}
$('fecha').value = hoy();

function actualizarSeleccionCuotas() {
  const n = Number($('cuotas').value);
  document.querySelectorAll('[data-cuotas]').forEach(b => {
    const activo = n === Number(b.dataset.cuotas);
    b.setAttribute('aria-pressed', String(activo));
    b.classList.toggle('activo', activo);
  });
  $('cuotas-menos').disabled = !Number.isInteger(n) || n <= CUOTAS_MIN;
  $('cuotas-mas').disabled = !Number.isInteger(n) || n >= CUOTAS_MAX;
}
function cambiarModo(preservarCuotas = false) {
  const m = $('modalidad').value;
  $('comparar-extra').hidden = m !== 'comparar';
  $('atrasos').hidden = m === 'comparar' || m === 'personalizada';
  $('dias').readOnly = !['personalizada','comparar'].includes(m);
  // La cantidad siempre se puede editar. Al editar un preset oficial pasa a "Personalizado".
  $('cuotas').readOnly = false;
  if (!preservarCuotas) {
    if (m === 'principal') $('cuotas').value = 3;
    if (m === 'cotidiana') $('cuotas').value = 1;
    if (m === 'mas') $('cuotas').value = 6;
    if (m === 'personalizada' && !Number.isInteger(Number($('cuotas').value))) $('cuotas').value = 3;
  }
  if (!preservarCuotas && m !== 'comparar') $('dias').value = 14;
  $('plan-nota').textContent = notas[m];
  actualizarSeleccionCuotas();
  simular();
}
function cuotasIntroducidas() {
  const actual = $('modalidad').value;
  const siguiente = modoTrasEditarCuotas(actual);
  if (actual !== siguiente) {
    $('modalidad').value = siguiente;
    cambiarModo(true);
  } else {
    actualizarSeleccionCuotas();
    simular();
  }
}
function establecerCuotas(numero) {
  $('cuotas').value = ajustarCuotas(numero);
  cuotasIntroducidas();
}
function comprobarElegibilidad(m, n) {
  if (m !== 'mas') return '';
  if (![6,9,12].includes(n)) return 'Modo Más Cuotas: selecciona 6, 9 o 12 cuotas.';
  return 'Los importes mínimos de Más Cuotas publicados por Cashea no coinciden entre páginas. Esta simulación no confirma elegibilidad.';
}
function simular() {
  const m = $('modalidad').value, monto = Number($('monto').value),
    cuotas = Number($('cuotas').value);
  try {
    const requeridos = ['monto','inicial','cuotas','dias','fecha'];
    if (m === 'comparar') requeridos.push('tasa');
    if (requeridos.some(id => $(id).value.trim() === '')) throw new RangeError('Completa todos los campos de la simulación.');
    const plan = calcularPlan({
      monto, inicialPct: Number($('inicial').value),
      cuotas, dias: Number($('dias').value),
      tasaAnual: m === 'comparar' ? Number($('tasa').value) : 0,
      diasAtraso: ['comparar','personalizada'].includes(m) ? 0 : Number($('atraso-dias').value),
      cuotasAtrasadas: ['comparar','personalizada'].includes(m) ? 0 : Number($('cuotas-vencidas').value),
      fecha: $('fecha').value
    });
    const elegible = comprobarElegibilidad(m, cuotas);
    const primerPago = plan.filas[0];
    const costoAdicional = plan.interesesC + plan.recargosC;
    $('resultado').innerHTML = `
      <div class="calc-resultado-principal">
        <span>Tu cuota estimada</span>
        <strong class="res-cuota-monto">${fmt(primerPago.totalC)}</strong>
        <small>Cuota 1 de ${plan.filas.length} · ${esc(fechas(primerPago.fecha))}</small>
      </div>
      <div class="calc-resultado-datos">
        <div><span>Pago inicial</span><strong>${fmt(plan.inicialC)}</strong></div>
        <div><span>Total a pagar</span><strong>${fmt(plan.totalC)}</strong></div>
      </div>
      <p class="calc-resultado-extra"><span>Intereses ${m === 'comparar' ? '(hipotéticos)' : ''}</span><strong>${fmt(plan.interesesC)}</strong></p>
      ${plan.recargosC ? '<p class="calc-resultado-extra"><span>Recargo estimado por atraso</span><strong>' + fmt(plan.recargosC) + '</strong></p>' : ''}
      ${costoAdicional ? '<p class="calc-resultado-extra calc-resultado-costo"><span>Costo adicional total</span><strong>' + fmt(costoAdicional) + '</strong></p>' : ''}
      ${m === 'comparar' ? '<p class="calc-resultado-aviso">Tasa anual hipotética de ' + esc($('tasa').value) + ' %. No corresponde a Cashea.</p>' : ''}
      ${elegible ? '<p class="advertencia">' + esc(elegible) + '</p>' : ''}
    `;
    const fila = (fecha, concepto, capital, interes, total) =>
      `<tr><td>${esc(fecha)}</td><td>${esc(concepto)}</td><td>${fmt(capital)}</td><td>${fmt(interes)}</td><td><strong>${fmt(total)}</strong></td></tr>`;
    let html = fila(fechas(plan.fechaCompra),'Inicial',plan.inicialC,0,plan.inicialC);
    html += plan.filas.map(f => fila(fechas(f.fecha), 'Cuota ' + f.numero, f.capitalC, f.interesC, f.totalC)).join('');
    if (plan.recargosC) html += fila('Atraso estimado','Cargo adicional',0,plan.recargosC,plan.recargosC);
    $('calendario').innerHTML = '<table><thead><tr><th>Fecha</th><th>Concepto</th><th>Capital</th><th>Interés / cargo</th><th>Total</th></tr></thead><tbody>' + html + '</tbody></table>';
  } catch (e) {
    $('resultado').innerHTML = '<p role="alert" class="advertencia">' + esc(e.message) + '</p>';
    $('calendario').innerHTML = '';
  }
}
$('modalidad').addEventListener('change', () => cambiarModo());
$('cuotas').addEventListener('input', cuotasIntroducidas);
$('cuotas-menos').addEventListener('click', () => establecerCuotas(Number($('cuotas').value) - 1));
$('cuotas-mas').addEventListener('click', () => establecerCuotas(Number($('cuotas').value) + 1));
document.querySelectorAll('[data-cuotas]').forEach(b => b.addEventListener('click', () => establecerCuotas(Number(b.dataset.cuotas))));
['monto','inicial','dias','fecha','tasa','atraso-dias','cuotas-vencidas'].forEach(id => $(id).addEventListener('input', simular));
$('form-sim').addEventListener('submit', e => { e.preventDefault(); simular(); });
cambiarModo();

// Directorio de fuentes externas. Nunca interpretarlo como censo oficial por sucursal.
let comercios = [], fuentes = {};
function enlaces(ids) {
  return (ids || []).map(id => {
    const f = fuentes[id];
    if (!f || typeof f.url !== 'string' || !/^https:\/\/[^\s"'<>]+$/.test(f.url)) return '';
    return '<a href="' + esc(f.url) + '" target="_blank" rel="noopener noreferrer">' + esc(f.titulo || 'Fuente') + ' ↗</a>';
  }).filter(Boolean).join(' · ');
}
function poblar(id, xs) {
  const el = $(id);
  xs.forEach(x => { const o = document.createElement('option'); o.value = x; o.textContent = x; el.appendChild(o); });
}
function pintarComercios() {
  const q = norm($('q').value), c = $('ciudad').value, cat = $('categoria').value;
  const res = comercios.filter(x => (!q || norm(x.nombre).includes(q)) &&
    (!c || (x.ciudades || []).includes(c)) && (!cat || x.categoria === cat));
  $('contador').textContent = res.length + ' de ' + comercios.length + ' marcas registradas';
  $('lista').innerHTML = res.length ? res.map(x =>
    '<li class="comercio"><div class="comercio-arriba"><span class="comercio-icono" aria-hidden="true">' + esc(String(x.nombre || '?').charAt(0)) +
    '</span><div><h3>' + esc(x.nombre) + '</h3><span class="comercio-categoria">' + esc(x.categoria) + '</span></div></div>' +
    '<p class="ciudades"><strong>Ciudades citadas:</strong> ' + ((x.ciudades || []).length ? esc(x.ciudades.join(', ')) : 'sin confirmar') + '</p>' +
    '<div class="enlaces-fuentes">' + '<small class="fuentes-metadata">' + ((x.fuentes || []).length) + ' referencias externas · sin verificar por sucursal</small>' + (enlaces(x.fuentes) || 'Fuente no disponible') + '</div></li>'
  ).join('') : '<li class="vacio">No hay coincidencias para estos filtros.</li>';
}
Promise.all([
  fetch('comercios.json', {cache:'no-store'}).then(r => {if(!r.ok)throw Error('comercios');return r.json();}),
  fetch('fuentes.json', {cache:'no-store'}).then(r => r.ok ? r.json() : {})
]).then(([data, src]) => {
  if (!Array.isArray(data)) throw new Error('Formato inválido');
  comercios = data; fuentes = src || {};
  poblar('ciudad', [...new Set(data.flatMap(x => x.ciudades || []))].sort((a,b) => a.localeCompare(b,'es')));
  poblar('categoria', [...new Set(data.map(x => x.categoria).filter(Boolean))].sort((a,b) => a.localeCompare(b,'es')));
  $('nota-datos').textContent = 'Revisión de fuentes: 18 oct 2026 · Verifica en la app oficial';
  pintarComercios();
}).catch(() => {
  $('contador').textContent = 'Directorio no disponible';
  $('lista').innerHTML = '<li class="vacio">No se pudieron cargar los comercios. Actualiza la página o vuelve a intentarlo.</li>';
});
['q','ciudad','categoria'].forEach(id => $(id).addEventListener('input', pintarComercios));

// La gráfica muestra observaciones del monitor; no extrapola el servicio Cashea.
let periodoHistorial = 24;
let ultimoEstado = null;
function pintarGraficaEstado(data) {
  const target = Array.isArray(data?.targets) ? data.targets.find(t => Array.isArray(t?.history)) : null;
  const serie = construirHistorial(target?.history || [], periodoHistorial);
  const actualizado = Date.parse(data?.updated);
  const datosVencidos = !Number.isFinite(actualizado) ||
    Date.now() - actualizado > 3_600_000 || actualizado > Date.now() + 300_000;
  const total = serie.muestras;
  const respuesta = serie.evaluables ? serie.porcentaje.toFixed(1) + ' %' : 'Sin datos evaluables';
  $('grafica-resumen').textContent = total
    ? respuesta + ' de respuestas satisfactorias evaluables · ' + total + ' verificaciones'
    : 'Sin verificaciones en las últimas ' + periodoHistorial + ' horas';
  $('estado-grafica').innerHTML = svgHistorial(serie);
  $('estado-grafica').setAttribute('aria-label',
    'Historial de ' + periodoHistorial + ' horas. ' + serie.cuentas.up +
    ' respuestas satisfactorias, ' + serie.cuentas.down +
    ' no satisfactorias, ' + serie.cuentas.restricted +
    ' accesos restringidos, ' + serie.cuentas.unknown +
    ' sin comprobar y ' + serie.vacios + ' intervalos sin muestras');
  $('grafica-nota').textContent = (datosVencidos ? 'Datos desactualizados. ' : '') +
    'Cada barra representa una hora; el color refleja las verificaciones registradas en ella. ' +
    'HTTP 403 significa acceso restringido, no una caída confirmada. No mide la app ni los pagos.';
}
document.querySelectorAll('[data-periodo]').forEach(btn => btn.addEventListener('click', () => {
  periodoHistorial = Number(btn.dataset.periodo);
  document.querySelectorAll('[data-periodo]').forEach(b =>
    b.setAttribute('aria-pressed', String(Number(b.dataset.periodo) === periodoHistorial)));
  pintarGraficaEstado(ultimoEstado);
}));

// Chequeo remoto: mide sitio web observable, no transacciones ni la app.
function pintarEstado(data) {
  ultimoEstado = data;
  pintarGraficaEstado(data);
  const targets = Array.isArray(data?.targets) ? data.targets : [];
  if (!targets.length) {
    $('estado-lista').innerHTML = '<div class="estado-espera"><strong>Monitoreo pendiente de primera ejecución</strong><p>La tarea automatizada aún no ha publicado resultados. Puedes revisar GitHub Actions para activarla.</p></div>';
    return;
  }
  const ahora = Date.now();
  const actualizado = Date.parse(data.updated);
  const desactualizado = !Number.isFinite(actualizado) || ahora - actualizado > 60 * 60 * 1000 || actualizado > ahora + 5 * 60 * 1000;
  $('estado-lista').innerHTML = targets.map(t => {
    const h = Array.isArray(t.history) ? t.history : [];
    const ult24 = h.filter(x => {
      const tm = Date.parse(x.t);
      return Number.isFinite(tm) && tm >= ahora - 86_400_000 && tm <= ahora + 300_000;
    });
    const exitos = ult24.filter(x => x.state === 'up' || (!x.state && x.up === true)).length;
    const evaluables = ult24.filter(x => !['restricted','unknown'].includes(x.state) && x.code !== 0).length;
    const pct = evaluables ? (100 * exitos / evaluables).toFixed(1) + ' %' : 'Sin muestra';
    const c = t.current || h.at(-1) || {};
    const estado = desactualizado ? 'stale' : c.state === 'restricted' ? 'restricted' : (c.state === 'unknown' || c.code === 0) ? 'unknown' : c.up ? 'up' : 'down';
    const titulo = ({stale:'Información desactualizada',restricted:'Acceso del monitor restringido',unknown:'No se pudo comprobar',up:'El sitio web responde',down:'Respuesta no satisfactoria'})[estado];
    const fecha = Date.parse(c.t || data.updated);
    const ultima = Number.isFinite(fecha) ? new Date(fecha).toLocaleString('es-VE') : 'sin fecha válida';
    const barras = ult24.slice(-48).map(x =>
      '<span title="' + esc(new Date(x.t).toLocaleString('es-VE')) +
      '" class="barra ' + (x.state === 'restricted' ? 'restricted' : (x.state === 'unknown' || x.code === 0) ? 'unknown' : x.up ? 'up' : 'down') + '"></span>'
    ).join('');
    return '<article class="estado-card ' + estado + '"><div class="estado-card-top"><div><p class="estado-label">MONITOREO EXTERNO</p><h3>' + esc(t.name) + '</h3></div><span class="estado-indicador"><i></i>' + titulo + '</span></div>' +
      '<div class="estado-metricas"><div><span>Respuestas satisfactorias en 24 h*</span><strong>' + pct + '</strong></div><div><span>Muestras evaluables</span><strong>' + evaluables + '</strong></div><div><span>Última comprobación</span><strong class="dato-hora">' + esc(ultima) + '</strong></div></div>' +
      '<div class="historial" aria-label="Últimos chequeos">' + (barras || '<span class="historial-vacio">Aún sin historial de las últimas 24 horas</span>') + '</div><p class="estado-detalle">HTTP ' + esc(c.code ?? '—') + ' · ' + esc(c.ms ?? '—') + ' ms · Solo observación externa del sitio. *Porcentaje sobre muestras evaluables.</p></article>';
  }).join('');
}
async function actualizarEstado() {
  const b = $('refrescar');
  b.disabled = true; b.textContent = 'Consultando…';
  try {
    const r = await fetch('status.json?nocache=' + Date.now(), {cache:'no-store'});
    if (!r.ok) throw Error('No hay estado publicado');
    const data = await r.json();
    pintarEstado(data);
  } catch {
    ultimoEstado = null;
    pintarGraficaEstado(null);
    $('estado-lista').innerHTML = '<div class="estado-espera"><strong>Datos todavía no disponibles</strong><p>El chequeo automático debe ejecutarse por primera vez en GitHub Actions. Esto no indica que Cashea esté caído.</p></div>';
  } finally {
    b.disabled = false; b.textContent = 'Actualizar datos ↻';
  }
}
// El menú móvil se cierra al navegar sin bloquear el desplazamiento hasta las secciones.
document.querySelectorAll('#mobile-nav a').forEach(enlace => enlace.addEventListener('click', () => {
  $('mobile-nav').open = false;
}));
$('refrescar').addEventListener('click', actualizarEstado);
actualizarEstado();
setInterval(actualizarEstado, 5 * 60 * 1000);
