import { calcularPlan } from './finance.js';
import { construirHistorial, svgHistorial, coberturaSuficiente, etiquetasEje } from './monitor-chart.js';
import { CUOTAS_MIN, CUOTAS_MAX, modoTrasEditarCuotas, ajustarCuotas, validarSimulacion } from './calculator-options.js';

const $ = id => document.getElementById(id);
const fmt = n => new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'USD' }).format(n / 100);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
const norm = s => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
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
const CAMPOS = ['monto','inicial','cuotas','dias','fecha','tasa','atraso-dias','cuotas-vencidas'];
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
// Cada error se anuncia junto a su campo y se enlaza con aria-describedby.
function marcarErrores(errores) {
  for (const id of CAMPOS) {
    const input = $(id), errorId = 'error-' + id;
    let nodo = $(errorId);
    const descritos = (input.getAttribute('aria-describedby') || '').split(' ').filter(x => x && x !== errorId);
    if (errores[id]) {
      if (!nodo) {
        nodo = document.createElement('p');
        nodo.id = errorId;
        nodo.className = 'campo-error';
        input.closest('.campo').appendChild(nodo);
      }
      nodo.textContent = errores[id];
      input.setAttribute('aria-invalid', 'true');
      descritos.push(errorId);
    } else {
      nodo?.remove();
      input.removeAttribute('aria-invalid');
    }
    if (descritos.length) input.setAttribute('aria-describedby', descritos.join(' '));
    else input.removeAttribute('aria-describedby');
  }
}
function pintarCalendario(plan) {
  // Las columnas de capital e interés solo aportan cuando existe algún coste adicional.
  // Roles explícitos: el apilado móvil con CSS no debe borrar la semántica de tabla.
  const desglose = plan.interesesC > 0 || plan.recargosC > 0;
  const cabeceras = desglose ? ['Fecha','Concepto','Capital','Interés / cargo','Total'] : ['Fecha','Concepto','Total'];
  const fila = (fecha, concepto, capital, interes, total) => {
    const celdas = desglose ? [esc(fecha), esc(concepto), fmt(capital), fmt(interes), '<strong>' + fmt(total) + '</strong>']
      : [esc(fecha), esc(concepto), '<strong>' + fmt(total) + '</strong>'];
    return '<tr role="row">' + celdas.map((c, i) => '<td role="cell" data-label="' + cabeceras[i] + '">' + c + '</td>').join('') + '</tr>';
  };
  let html = fila(fechas(plan.fechaCompra),'Inicial',plan.inicialC,0,plan.inicialC);
  html += plan.filas.map(f => fila(fechas(f.fecha), 'Cuota ' + f.numero, f.capitalC, f.interesC, f.totalC)).join('');
  if (plan.recargosC) html += fila('Atraso estimado','Cargo adicional',0,plan.recargosC,plan.recargosC);
  $('calendario').innerHTML = '<table role="table" class="' + (desglose ? 'con-desglose' : 'sin-desglose') + '"><thead role="rowgroup"><tr role="row">' +
    cabeceras.map(c => '<th role="columnheader" scope="col">' + c + '</th>').join('') + '</tr></thead><tbody role="rowgroup">' + html + '</tbody></table>';
}
function simular() {
  const m = $('modalidad').value, monto = Number($('monto').value),
    cuotas = Number($('cuotas').value);
  const valores = Object.fromEntries(CAMPOS.map(id => [id, $(id).value]));
  const errores = validarSimulacion(valores, m);
  marcarErrores(errores);
  const total = Object.keys(errores).length;
  if (total) {
    $('resultado').innerHTML = '<p class="advertencia">' + (total === 1 ? 'Revisa el campo marcado' : 'Revisa los ' + total + ' campos marcados') + ' para ver tu cuota.</p>';
    $('calendario').innerHTML = '';
    $('cuota-flotante-monto').textContent = '—';
    return;
  }
  try {
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
    // Sin intereses basta un distintivo; el importe solo aparece cuando aporta información.
    const intereses = m === 'comparar' || plan.interesesC
      ? '<p class="calc-resultado-extra"><span>Intereses ' + (m === 'comparar' ? '(hipotéticos)' : '') + '</span><strong>' + fmt(plan.interesesC) + '</strong></p>'
      : '<p class="calc-resultado-sello"><span>0 % interés</span></p>';
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
      ${intereses}
      ${plan.recargosC ? '<p class="calc-resultado-extra"><span>Recargo estimado por atraso</span><strong>' + fmt(plan.recargosC) + '</strong></p>' : ''}
      ${costoAdicional ? '<p class="calc-resultado-extra calc-resultado-costo"><span>Costo adicional total</span><strong>' + fmt(costoAdicional) + '</strong></p>' : ''}
      ${m === 'comparar' ? '<p class="calc-resultado-aviso">Tasa anual hipotética de ' + esc($('tasa').value) + ' %. No corresponde a Cashea.</p>' : ''}
      ${elegible ? '<p class="advertencia">' + esc(elegible) + '</p>' : ''}
    `;
    $('cuota-flotante-monto').textContent = fmt(primerPago.totalC);
    pintarCalendario(plan);
  } catch (e) {
    $('resultado').innerHTML = '<p role="alert" class="advertencia">' + esc(e.message) + '</p>';
    $('calendario').innerHTML = '';
    $('cuota-flotante-monto').textContent = '—';
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

// Cuota flotante en móvil: visible mientras se usan los controles y el resultado queda fuera de pantalla.
// Se oculta con el teclado abierto para no tapar el campo que se edita.
{
  const flotante = $('cuota-flotante');
  const visible = { resultado: true, formulario: false };
  const movil = window.matchMedia('(max-width:760px)');
  const escribiendo = () => document.activeElement?.matches?.('input,select');
  const actualizar = () => {
    flotante.hidden = !(movil.matches && visible.formulario && !visible.resultado && !escribiendo());
  };
  if ('IntersectionObserver' in window) {
    const observar = (el, clave) => new IntersectionObserver(([e]) => { visible[clave] = e.isIntersecting; actualizar(); }).observe(el);
    observar($('resultado'), 'resultado');
    observar($('form-sim'), 'formulario');
  }
  document.addEventListener('focusin', actualizar);
  document.addEventListener('focusout', () => setTimeout(actualizar, 0));
  movil.addEventListener?.('change', actualizar);
}

// Directorio de fuentes externas. Nunca interpretarlo como censo oficial por sucursal.
let comercios = [], fuentes = {}, ciudadActiva = '';
function enlaces(ids) {
  return (ids || []).map(id => {
    const f = fuentes[id];
    if (!f || typeof f.url !== 'string' || !/^https:\/\/[^\s"'<>]+$/.test(f.url)) return '';
    return '<li><a href="' + esc(f.url) + '" target="_blank" rel="noopener noreferrer">' + esc(f.titulo || 'Fuente') + ' ↗</a></li>';
  }).filter(Boolean).join('');
}
function poblar(id, xs) {
  const el = $(id);
  xs.forEach(x => { const o = document.createElement('option'); o.value = x; o.textContent = x; el.appendChild(o); });
}
function poblarCiudades(xs) {
  const grupo = $('ciudad-chips');
  xs.forEach(x => {
    const b = document.createElement('button');
    b.type = 'button'; b.dataset.ciudad = x; b.textContent = x; b.setAttribute('aria-pressed', 'false');
    grupo.appendChild(b);
  });
  grupo.querySelectorAll('[data-ciudad]').forEach(b => b.addEventListener('click', () => {
    ciudadActiva = b.dataset.ciudad;
    grupo.querySelectorAll('[data-ciudad]').forEach(o => o.setAttribute('aria-pressed', String(o === b)));
    pintarComercios();
  }));
}
function tarjetaComercio(x) {
  const ciudades = (x.ciudades || []).length
    ? '<ul class="comercio-ciudades" aria-label="Ciudades citadas">' + x.ciudades.map(c => '<li>' + esc(c) + '</li>').join('') + '</ul>'
    : '<p class="comercio-sin-ciudad">Ciudad sin confirmar</p>';
  const lista = enlaces(x.fuentes);
  const n = (x.fuentes || []).length;
  const fuentesHtml = lista
    ? '<details class="comercio-fuentes"><summary>' + n + (n === 1 ? ' fuente externa' : ' fuentes externas') + '</summary><ul>' + lista + '</ul></details>'
    : '<p class="comercio-sin-ciudad">Fuente no disponible</p>';
  return '<li class="comercio"><div class="comercio-arriba"><span class="comercio-icono" aria-hidden="true">' + esc(String(x.nombre || '?').charAt(0)) +
    '</span><div><h3>' + esc(x.nombre) + '</h3><span class="comercio-categoria">' + esc(x.categoria) + '</span></div></div>' +
    ciudades + fuentesHtml + '</li>';
}
function pintarComercios() {
  const q = norm($('q').value), c = ciudadActiva, cat = $('categoria').value;
  const res = comercios.filter(x => (!q || norm(x.nombre).includes(q)) &&
    (!c || (x.ciudades || []).includes(c)) && (!cat || x.categoria === cat));
  $('contador').textContent = res.length + ' de ' + comercios.length + ' marcas registradas';
  $('lista').innerHTML = res.length ? res.map(tarjetaComercio).join('') : '<li class="vacio">No hay coincidencias para estos filtros.</li>';
}
Promise.all([
  fetch('comercios.json', {cache:'no-store'}).then(r => {if(!r.ok)throw Error('comercios');return r.json();}),
  fetch('fuentes.json', {cache:'no-store'}).then(r => r.ok ? r.json() : {})
]).then(([data, src]) => {
  if (!Array.isArray(data)) throw new Error('Formato inválido');
  comercios = data; fuentes = src || {};
  poblarCiudades([...new Set(data.flatMap(x => x.ciudades || []))].sort((a,b) => a.localeCompare(b,'es')));
  poblar('categoria', [...new Set(data.map(x => x.categoria).filter(Boolean))].sort((a,b) => a.localeCompare(b,'es')));
  $('nota-datos').textContent = 'Revisión de fuentes: 18 oct 2026 · Verifica en la app oficial';
  pintarComercios();
}).catch(() => {
  $('contador').textContent = 'Directorio no disponible';
  $('lista').innerHTML = '<li class="vacio">No se pudieron cargar los comercios. Actualiza la página o vuelve a intentarlo.</li>';
});
['q','categoria'].forEach(id => $(id).addEventListener('input', pintarComercios));

// La gráfica muestra observaciones del monitor; no extrapola el servicio Cashea.
let periodoHistorial = 24;
let ultimoEstado = null;
function pintarGraficaEstado(data) {
  const target = Array.isArray(data?.targets) ? data.targets.find(t => Array.isArray(t?.history)) : null;
  const serie = construirHistorial(target?.history || [], periodoHistorial);
  const total = serie.muestras;
  const suficiente = coberturaSuficiente(serie);
  $('grafica-resumen').textContent = !total
    ? 'Sin verificaciones en las últimas ' + periodoHistorial + ' horas'
    : suficiente
      ? total + ' verificaciones registradas · ' + serie.vacios + ' horas sin registros'
      : 'Datos insuficientes para valorar la estabilidad: ' + total + ' verificaciones y ' + serie.vacios + ' de ' + periodoHistorial + ' horas sin registros';
  $('estado-grafica').classList.toggle('escasa', !suficiente);
  $('estado-grafica').innerHTML = svgHistorial(serie);
  $('grafica-eje').innerHTML = etiquetasEje(periodoHistorial).map(t => '<span>' + t + '</span>').join('');
  $('estado-grafica').setAttribute('aria-label',
    'Historial de ' + periodoHistorial + ' horas. ' + serie.cuentas.up +
    ' respuestas satisfactorias, ' + serie.cuentas.down +
    ' no satisfactorias, ' + serie.cuentas.restricted +
    ' accesos restringidos, ' + serie.cuentas.unknown +
    ' sin comprobar y ' + serie.vacios + ' intervalos sin muestras');
  $('grafica-nota').textContent =
    'Cada barra agrupa verificaciones por hora. HTTP 403 significa acceso restringido, no una caída confirmada.';
}
document.querySelectorAll('[data-periodo]').forEach(btn => btn.addEventListener('click', () => {
  periodoHistorial = Number(btn.dataset.periodo);
  document.querySelectorAll('[data-periodo]').forEach(b =>
    b.setAttribute('aria-pressed', String(Number(b.dataset.periodo) === periodoHistorial)));
  pintarGraficaEstado(ultimoEstado);
}));

// Franja compacta sobre la calculadora: resume el estado sin repetir el historial.
function pintarFranja(estado, texto) {
  $('estado-franja').className = 'estado-franja ' + estado;
  $('estado-franja-detalle').textContent = texto;
}
// Chequeo remoto: mide sitio web observable, no transacciones ni la app.
function pintarEstado(data) {
  ultimoEstado = data;
  pintarGraficaEstado(data);
  const targets = Array.isArray(data?.targets) ? data.targets : [];
  if (!targets.length) {
    pintarFranja('unknown', 'monitoreo pendiente de primera ejecución');
    $('estado-lista').innerHTML = '<div class="estado-espera"><strong>Monitoreo pendiente de primera ejecución</strong><p>La tarea automatizada aún no ha publicado resultados. Puedes revisar GitHub Actions para activarla.</p></div>';
    return;
  }
  const ahora = Date.now();
  const actualizado = Date.parse(data.updated);
  const desactualizado = !Number.isFinite(actualizado) || ahora - actualizado > 60 * 60 * 1000 || actualizado > ahora + 5 * 60 * 1000;
  const titulos = {stale:'Información desactualizada',unknown:'Sin corroboración independiente',up:'Dos redes confirman respuesta',down:'Dos redes no obtienen respuesta'};
  const resumen = [];
  $('estado-lista').innerHTML = targets.map(t => {
    const h = Array.isArray(t.history) ? t.history : [];
    const c = t.current || h.at(-1) || {};
    const decision = t.corroboration?.verdict === 'responding' ? 'up' : t.corroboration?.verdict === 'unresponsive' ? 'down' : 'unknown';
    const estado = desactualizado ? 'stale' : decision;
    const titulo = titulos[estado];
    const fecha = Date.parse(c.t || data.updated);
    const ultima = Number.isFinite(fecha) ? new Date(fecha).toLocaleString('es-VE') : 'sin fecha válida';
    resumen.push({estado, titulo, fecha});
    return '<article class="estado-card ' + estado + '"><div class="estado-card-top"><div><p class="estado-label">SITIO SUPERVISADO</p><h3>' + esc(t.name) + '</h3></div><span class="estado-indicador"><i aria-hidden="true"></i>' + titulo + '</span></div>' +
      '<p class="estado-ultima"><span>Última comprobación</span><strong>' + esc(ultima) + '</strong></p>' +
      '<p class="estado-detalle">HTTP ' + esc(c.code ?? '—') + ' · ' + esc(c.ms ?? '—') + ' ms · Resultado de la última solicitud web.</p></article>';
  }).join('');
  const primero = resumen[0];
  const hora = Number.isFinite(primero.fecha) ? ' · ' + new Date(primero.fecha).toLocaleString('es-VE', {day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit'}) : '';
  pintarFranja(primero.estado, primero.titulo.toLowerCase() + hora);
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
    pintarFranja('unknown', 'datos todavía no disponibles');
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
