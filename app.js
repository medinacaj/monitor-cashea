(function () {
  'use strict';

  // ---------- Simulador ----------
  var $ = function (id) { return document.getElementById(id); };
  var fmt = new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'USD' });

  function num(el) {
    var v = parseFloat(String(el.value).replace(',', '.'));
    return isFinite(v) ? v : NaN;
  }

  function simular() {
    var monto = num($('monto'));
    var inicialPct = num($('inicial'));
    var n = Math.round(num($('cuotas')));
    var dias = Math.round(num($('dias')));
    var out = $('resultado');
    var cal = $('calendario');

    if (!(monto > 0) || !(inicialPct >= 0 && inicialPct <= 100) || !(n >= 1 && n <= 12) || !(dias >= 1)) {
      out.innerHTML = '<span class="err">Revisa los datos: monto mayor a 0, inicial entre 0 y 100, cuotas entre 1 y 12.</span>';
      cal.innerHTML = '';
      return;
    }

    // Trabajamos en centavos para evitar errores de redondeo.
    var totalC = Math.round(monto * 100);
    var inicialC = Math.round(totalC * inicialPct / 100);
    var restoC = totalC - inicialC;
    var baseC = Math.floor(restoC / n);
    var sobra = restoC - baseC * n; // se suma a la última cuota

    out.innerHTML =
      'Pagas hoy: <strong>' + fmt.format(inicialC / 100) + '</strong><br>' +
      'Luego: <strong>' + n + ' cuota(s)</strong> de ' + fmt.format(baseC / 100) +
      ' cada ' + dias + ' días (sin intereses en este cálculo).<br>' +
      'Total: ' + fmt.format(totalC / 100);

    var filas = '<tr><td>Hoy</td><td>Inicial</td><td>' + fmt.format(inicialC / 100) + '</td></tr>';
    for (var i = 1; i <= n; i++) {
      var c = baseC + (i === n ? sobra : 0);
      filas += '<tr><td>Día ' + (i * dias) + '</td><td>Cuota ' + i + '</td><td>' + fmt.format(c / 100) + '</td></tr>';
    }
    cal.innerHTML = '<table><thead><tr><th>Cuándo</th><th>Concepto</th><th>Monto</th></tr></thead><tbody>' + filas + '</tbody></table>';
  }

  ['monto', 'inicial', 'cuotas', 'dias'].forEach(function (id) {
    $(id).addEventListener('input', simular);
  });
  $('form-sim').addEventListener('submit', function (e) { e.preventDefault(); simular(); });
  simular();

  // ---------- Directorio ----------
  var comercios = [];

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function norm(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  function llenarSelect(id, valores) {
    var sel = $(id);
    valores.forEach(function (v) {
      var o = document.createElement('option');
      o.value = v; o.textContent = v;
      sel.appendChild(o);
    });
  }

  var fuentes = {};

  function enlaces(ids) {
    return (ids || []).map(function (id) {
      var f = fuentes[id];
      if (!f || String(f.url).indexOf('https://') !== 0) return '';
      return '<a href="' + esc(f.url) + '" target="_blank" rel="noopener noreferrer">' + esc(f.titulo) + '</a>';
    }).filter(Boolean).join(' · ');
  }

  function pintar() {
    var q = norm($('q').value);
    var ciudad = $('ciudad').value;
    var cat = $('categoria').value;
    var res = comercios.filter(function (c) {
      return (!q || norm(c.nombre).indexOf(q) !== -1) &&
             (!ciudad || (c.ciudades || []).indexOf(ciudad) !== -1) &&
             (!cat || c.categoria === cat);
    });
    $('contador').textContent = res.length + ' comercio(s) encontrado(s)';
    $('lista').innerHTML = res.map(function (c) {
      var ciu = (c.ciudades || []).length ? esc(c.ciudades.join(', ')) : 'sin confirmar';
      var n = (c.fuentes || []).length;
      return '<li><h3>' + esc(c.nombre) + (n < 2 ? '<span class="badge">1 fuente</span>' : '') + '</h3>' +
        '<div class="meta">' + esc(c.categoria) + ' · Ciudades (según terceros): ' + ciu + '</div>' +
        '<div class="meta fuentes">Fuentes: ' + enlaces(c.fuentes) + '</div></li>';
    }).join('');
  }

  Promise.all([
    fetch('comercios.json', { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }),
    fetch('fuentes.json', { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; })
  ])
    .then(function (res) {
      var data = res[0];
      fuentes = res[1] || {};
      comercios = Array.isArray(data) ? data : [];
      $('nota-datos').textContent = 'Marcas que aparecen como aliadas de Cashea en prensa y portales (revisado el 18 oct 2026). No es una lista oficial ni completa: Cashea tiene cientos de comercios. Confirma en la app oficial antes de comprar.';
      var todas = [];
      comercios.forEach(function (c) { (c.ciudades || []).forEach(function (x) { todas.push(x); }); });
      var ciudades = Array.from(new Set(todas)).sort();
      var cats = Array.from(new Set(comercios.map(function (c) { return c.categoria; }))).sort();
      llenarSelect('ciudad', ciudades);
      llenarSelect('categoria', cats);
      pintar();
    })
    .catch(function () {
      $('nota-datos').innerHTML = '<span class="err">No se pudo cargar el directorio. Si abriste el archivo directamente, usa un servidor local o la versión publicada.</span>';
    });

  ['q', 'ciudad', 'categoria'].forEach(function (id) {
    $(id).addEventListener('input', pintar);
  });

  // ---------- Estado del servicio ----------
  var ESTADO_VIEJO_MIN = 60; // más de 60 min sin actualizar = dato desactualizado

  function pintarEstado(data) {
    var cont = $('estado-lista');
    var targets = data && Array.isArray(data.targets) ? data.targets : [];
    if (!targets.length) {
      cont.innerHTML = '<p class="meta">Sin datos todavía. El primer chequeo aparece en cuanto corra el proceso automático.</p>';
      return;
    }
    var edadMin = (Date.now() - new Date(data.updated).getTime()) / 60000;
    var viejo = !isFinite(edadMin) || edadMin > ESTADO_VIEJO_MIN;

    cont.innerHTML = targets.map(function (t) {
      var h = Array.isArray(t.history) ? t.history : [];
      var cur = t.current || h[h.length - 1] || {};
      var ult24 = h.slice(-96);
      var ups = ult24.filter(function (x) { return x.up; }).length;
      var pct = ult24.length ? (ups / ult24.length * 100).toFixed(1) : '—';
      var cls = viejo ? 'viejo' : (cur.up ? 'ok' : 'mal');
      var txt = viejo ? 'Dato desactualizado' : (cur.up ? 'El sitio responde' : 'El sitio no responde');
      var barras = h.slice(-48).map(function (x) {
        return '<span class="b ' + (x.up ? 'ok' : 'mal') + '" title="' + esc(new Date(x.t).toLocaleString('es-VE')) + '"></span>';
      }).join('');
      return '<div class="estado ' + cls + '">' +
        '<div class="estado-fila"><span class="punto" aria-hidden="true"></span><strong>' + esc(t.name) + '</strong>: ' + txt + '</div>' +
        '<div class="meta">Último chequeo: ' + esc(new Date(cur.t || data.updated).toLocaleString('es-VE')) +
        (cur.ms ? ' · ' + cur.ms + ' ms' : '') + ' · Disponibilidad (últimas 24 h): ' + pct + (pct === '—' ? '' : ' %') + '</div>' +
        '<div class="barras" aria-label="Últimos chequeos">' + barras + '</div></div>';
    }).join('');
  }

  fetch('status.json', { cache: 'no-cache' })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(pintarEstado)
    .catch(function () {
      $('estado-lista').innerHTML = '<p class="meta">Sin datos todavía. El primer chequeo aparece en cuanto corra el proceso automático.</p>';
    });
})();
