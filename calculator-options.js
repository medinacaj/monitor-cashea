// Lógica independiente de la interfaz: personalización explícita de cuotas.
export const CUOTAS_MIN = 1;
export const CUOTAS_MAX = 12;
export const CUOTAS_RAPIDAS = Object.freeze([1, 3, 6, 9, 12]);
export function ajustarCuotas(n) {
  return Math.max(CUOTAS_MIN, Math.min(CUOTAS_MAX, Number.isFinite(n) ? Math.round(n) : 3));
}
export function modoTrasEditarCuotas(modo) {
  return modo === 'comparar' ? 'comparar' : 'personalizada';
}
// Validación por campo, coherente con los límites de calcularPlan, para señalar el control exacto.
const entero = v => Number.isInteger(Number(v));
const fechaValida = s => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s ?? ''));
  if (!m) return false;
  const d = new Date(+m[1], +m[2] - 1, +m[3]);
  return d.getFullYear() === +m[1] && d.getMonth() === +m[2] - 1 && d.getDate() === +m[3];
};
export function validarSimulacion(v, modo) {
  const errores = {};
  const vacio = id => String(v[id] ?? '').trim() === '';
  const num = id => Number(v[id]);
  const regla = (id, ok, mensaje) => {
    if (vacio(id)) errores[id] = 'Campo obligatorio.';
    else if (!Number.isFinite(num(id)) || !ok(num(id))) errores[id] = mensaje;
  };
  regla('monto', n => n > 0 && n <= 1_000_000, 'Introduce un precio mayor que 0 y de hasta 1.000.000.');
  regla('inicial', n => n >= 0 && n <= 100, 'El pago inicial debe estar entre 0 y 100 %.');
  regla('cuotas', n => entero(n) && n >= CUOTAS_MIN && n <= CUOTAS_MAX, 'Elige un número entero de cuotas entre 1 y 12.');
  regla('dias', n => entero(n) && n >= 1 && n <= 90, 'Usa un número entero de días entre 1 y 90.');
  if (vacio('fecha')) errores.fecha = 'Campo obligatorio.';
  else if (!fechaValida(v.fecha)) errores.fecha = 'Indica una fecha válida.';
  if (modo === 'comparar') regla('tasa', n => n >= 0 && n <= 200, 'La tasa anual debe estar entre 0 y 200 %.');
  if (['principal','cotidiana','mas'].includes(modo)) {
    regla('atraso-dias', n => entero(n) && n >= 0 && n <= 365, 'Usa un número entero de días entre 0 y 365.');
    const maximo = errores.cuotas ? CUOTAS_MAX : num('cuotas');
    regla('cuotas-vencidas', n => entero(n) && n >= 0 && n <= maximo, 'No puede superar el número de cuotas (' + maximo + ').');
  }
  return errores;
}
