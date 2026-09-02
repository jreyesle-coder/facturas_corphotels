// Genera "hallazgos" legibles a partir de la comparación de cuentas.
// Se usa tanto en el cuadro en pantalla como en el informe imprimible.
import { RD, PCT, serviceLabel, lineComparison } from './compare.js';

function topDriver(a) {
  const lines = lineComparison(a.current, a.previous);
  let best = null, bestAbs = 0;
  for (const r of lines) {
    const pv = r.prev || 0, cv = r.cur || 0, d = cv - pv;
    if (Math.abs(d) > bestAbs) { bestAbs = Math.abs(d); best = { label: r.label, prev: pv, cur: cv, d }; }
  }
  return best;
}

function driverClause(driver) {
  if (!driver || Math.abs(driver.d) < 0.005) return null;
  const amt = RD(Math.abs(driver.d));
  // Es una línea de crédito/descuento solo si los valores son negativos (no por la etiqueta).
  const isCredit = driver.prev <= 0 && driver.cur <= 0 && (driver.prev < 0 || driver.cur < 0);
  if (isCredit) {
    return driver.d > 0
      ? `se redujo el crédito/descuento «${driver.label}» (${amt} menos de rebaja)`
      : `aumentó el crédito/descuento «${driver.label}» (${amt} más de rebaja)`;
  }
  return driver.d > 0
    ? `aumentó «${driver.label}» en ${amt}`
    : `disminuyó «${driver.label}» en ${amt}`;
}

export function buildFindings(accounts) {
  const comparables = accounts.filter(a => a.previous);
  const nuevas = accounts.filter(a => !a.previous);

  let prevSum = 0, curSum = 0;
  for (const a of comparables) { prevSum += a.previous.monthCharge || 0; curSum += a.current.monthCharge || 0; }
  const dAbs = curSum - prevSum;
  const dPct = prevSum ? dAbs / prevSum * 100 : null;

  const items = comparables.map(a => {
    const driver = topDriver(a);
    const verbo = a.status === 'up' ? 'subió' : a.status === 'down' ? 'bajó' : 'se mantuvo';
    let text = `${a.provider} · Cuenta ${a.account} (${serviceLabel(a.current)}): ${verbo} de ${RD(a.previous.monthCharge)} (${a.previous.periodLabel}) a ${RD(a.current.monthCharge)} (${a.current.periodLabel}), ${(a.dAbs > 0 ? '+' : '') + RD(a.dAbs)} (${PCT(a.dPct)}).`;
    const dc = driverClause(driver);
    if (dc && a.status !== 'same') text += ` Principal factor: ${dc}.`;
    return { status: a.status, account: a.account, provider: a.provider, dAbs: a.dAbs, dPct: a.dPct, text };
  }).sort((x, y) => Math.abs(y.dAbs) - Math.abs(x.dAbs));

  const nuevasItems = nuevas.map(a => ({
    account: a.account, provider: a.provider,
    text: `${a.provider} · Cuenta ${a.account} (${serviceLabel(a.current)}): cuenta nueva. Primera factura ${a.current.periodLabel} por ${RD(a.current.monthCharge)}. Aún no hay período anterior para comparar.`,
  }));

  const verbo = dAbs > 0.005 ? 'subió' : dAbs < -0.005 ? 'bajó' : 'se mantuvo';
  const summaryText = comparables.length
    ? `En conjunto, el cargo del mes de las ${comparables.length} cuenta${comparables.length !== 1 ? 's' : ''} comparable${comparables.length !== 1 ? 's' : ''} ${verbo} ${RD(Math.abs(dAbs))} (${PCT(dPct)}) frente al período anterior: de ${RD(prevSum)} a ${RD(curSum)}.`
    : 'Aún no hay cuentas con período anterior para comparar.';

  return {
    summaryText,
    summary: { prevSum, curSum, dAbs, dPct, comparables: comparables.length, nuevas: nuevasItems.length },
    subieron: items.filter(i => i.status === 'up'),
    bajaron: items.filter(i => i.status === 'down'),
    iguales: items.filter(i => i.status === 'same'),
    nuevas: nuevasItems,
  };
}

function esc(s) { return String(s == null ? '' : s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])); }

// HTML del informe imprimible (se abre en una ventana nueva y se imprime / guarda como PDF).
export function buildReportHtml(findings) {
  const fecha = new Date().toLocaleString('es-DO', { dateStyle: 'long', timeStyle: 'short' });
  const li = arr => arr.map(i => `<li>${esc(i.text)}</li>`).join('');
  const section = (title, arr, cls) => arr.length
    ? `<h2 class="${cls}">${title} <span>(${arr.length})</span></h2><ul>${li(arr)}</ul>` : '';

  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
<title>Informe de Variaciones — CORPHOTELS</title>
<style>
  @page { margin: 18mm; }
  body { font: 13px/1.5 "Segoe UI",Roboto,Arial,sans-serif; color:#16233a; margin:0; }
  .head { display:flex; align-items:center; gap:14px; border-bottom:3px solid #0F539C; padding-bottom:12px; margin-bottom:16px; }
  .head .brand { background:#0C2C54; color:#fff; font-weight:700; padding:8px 12px; border-radius:6px; letter-spacing:.5px; }
  h1 { font-size:18px; margin:0; color:#0C2C54; }
  .meta { color:#5f6b7c; font-size:12px; margin-top:2px; }
  .summary { background:#f3f5f8; border:1px solid #e2e7ef; border-left:4px solid #0F539C; border-radius:8px; padding:12px 14px; margin:14px 0 6px; font-weight:500; }
  h2 { font-size:14px; margin:18px 0 6px; padding-bottom:4px; border-bottom:1px solid #e2e7ef; }
  h2.up { color:#CE1126; } h2.down { color:#1a8f4c; } h2.same,h2.new { color:#0C2C54; }
  h2 span { font-weight:400; color:#5f6b7c; font-size:12px; }
  ul { margin:0 0 8px; padding-left:20px; } li { margin:4px 0; }
  .foot { margin-top:22px; padding-top:10px; border-top:1px solid #e2e7ef; color:#5f6b7c; font-size:11px; }
  @media print { .noprint { display:none; } }
  .noprint { text-align:center; margin:18px 0; }
  .noprint button { background:#0F539C; color:#fff; border:0; border-radius:8px; padding:10px 18px; font-size:14px; cursor:pointer; }
</style></head><body>
  <div class="head">
    <div class="brand">CORPHOTELS</div>
    <div><h1>Informe de Variaciones de Facturación</h1><div class="meta">Claro · Altice — generado el ${esc(fecha)}</div></div>
  </div>
  <div class="summary">${esc(findings.summaryText)}</div>
  ${section('Cuentas que subieron', findings.subieron, 'up')}
  ${section('Cuentas que bajaron', findings.bajaron, 'down')}
  ${section('Cuentas sin cambio', findings.iguales, 'same')}
  ${section('Cuentas nuevas (sin comparación)', findings.nuevas, 'new')}
  <div class="foot">La comparación usa el <b>cargo del mes</b> (sin arrastrar atrasos). Cada cuenta se compara con su propio período anterior. Documento generado automáticamente por el Comparador de Facturas — CORPHOTELS.</div>
  <div class="noprint"><button onclick="window.print()">Imprimir / Guardar PDF</button></div>
  <script>window.addEventListener('load',function(){setTimeout(function(){window.print();},300);});</script>
</body></html>`;
}
