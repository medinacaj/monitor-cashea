// Motor matemático independiente del navegador. Importes en centavos.
export function calcularPlan(datos) {
  const { monto, inicialPct, cuotas, dias, tasaAnual = 0, diasAtraso = 0, cuotasAtrasadas = 0, fecha } = datos;
  const numbers = [monto, inicialPct, cuotas, dias, tasaAnual, diasAtraso, cuotasAtrasadas].map(Number);
  const [a, p, n, d, tasa, atraso, vencidas] = numbers;
  if (numbers.some(x => !Number.isFinite(x)) || a <= 0 || a > 1_000_000 ||
      p < 0 || p > 100 || !Number.isInteger(n) || n < 1 || n > 12 ||
      !Number.isInteger(d) || d < 1 || d > 90 || tasa < 0 || tasa > 200 ||
      !Number.isInteger(atraso) || atraso < 0 || atraso > 365 ||
      !Number.isInteger(vencidas) || vencidas < 0 || vencidas > n) {
    throw new RangeError('Revisa los valores: monto positivo, inicial 0–100 %, 1–12 cuotas, plazo 1–90 días, tasa anual 0–200 %.');
  }
  const fechaBase = fecha ? parseFecha(fecha) : new Date();
  if (Number.isNaN(fechaBase.getTime())) throw new RangeError('Indica una fecha de compra válida.');
  const montoC = Math.round(a * 100);
  const inicialC = Math.round(montoC * p / 100);
  let saldoC = montoC - inicialC;
  const financiadoC = saldoC;
  const r = (tasa / 100) * (d / 365);
  const pagoTeorico = r ? saldoC * r / (1 - Math.pow(1 + r, -n)) : 0;
  const pagoC = r ? Math.round(pagoTeorico) : Math.floor(saldoC / n);
  const filas = [];
  let interesesC = 0;
  for (let i = 1; i <= n; i++) {
    const interesC = r ? Math.round(saldoC * r) : 0;
    const capitalC = i === n ? saldoC : r
      ? Math.min(saldoC, Math.max(0, pagoC - interesC))
      : pagoC;
    if (i < n && saldoC > 0 && r && capitalC === 0) {
      throw new RangeError('La tasa produce cuotas insuficientes para amortizar el capital.');
    }
    saldoC -= capitalC;
    interesesC += interesC;
    const fechaPago = new Date(fechaBase);
    fechaPago.setDate(fechaPago.getDate() + i * d);
    filas.push({
      numero: i, fecha: formatoFecha(fechaPago),
      capitalC, interesC, totalC: capitalC + interesC
    });
  }
  const recargosC = atraso > 2 ? vencidas * 400 : 0;
  const totalCuotasC = filas.reduce((s, x) => s + x.totalC, 0);
  return {
    montoC, inicialC, financiadoC, interesesC, recargosC,
    totalC: inicialC + totalCuotasC + recargosC, filas,
    tasaAnual: tasa, dias: d, fechaCompra: formatoFecha(fechaBase)
  };
}
function parseFecha(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return new Date(NaN);
  const y = +m[1], mm = +m[2], d = +m[3];
  const v = new Date(y, mm - 1, d);
  return v.getFullYear() === y && v.getMonth() === mm - 1 && v.getDate() === d ? v : new Date(NaN);
}
function formatoFecha(d) {
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
}
