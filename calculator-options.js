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
