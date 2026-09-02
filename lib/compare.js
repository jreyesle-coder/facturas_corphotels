// Lógica de comparación y formato, compartida por el dashboard.

export const RD = n => (n == null ? '—' : (n < 0 ? '-' : '') + 'RD$ ' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
export const PCT = n => (n == null ? '—' : (n > 0 ? '+' : '') + n.toFixed(1) + '%');
export const norm = s => (s || '').toLowerCase().replace(/\s+/g, ' ').trim();

export function serviceLabel(inv) {
  if (!inv) return '';
  if (inv.provider === 'Claro') {
    const r = (inv.lineItems || []).find(li => /^Renta/i.test(li.label));
    return r ? r.label : ((inv.lineItems && inv.lineItems[0]) ? inv.lineItems[0].label : inv.account);
  }
  const cats = (inv.lineItems || []).filter(li => !/otros cargos/i.test(li.label)).map(li => li.label);
  return cats.length ? cats.join(', ') : 'Servicios Altice';
}

export function statusOf(dAbs, hasPrev) {
  if (!hasPrev) return 'new';
  return Math.abs(dAbs) < 0.005 ? 'same' : (dAbs > 0 ? 'up' : 'down');
}

export function buildAccounts(invoices) {
  const groups = {};
  for (const inv of invoices) {
    const k = inv.provider + '|' + inv.account;
    (groups[k] = groups[k] || []).push(inv);
  }
  const accounts = [];
  for (const k in groups) {
    const history = groups[k].slice().sort((a, b) => a.sortKey - b.sortKey);
    const current = history[history.length - 1];
    const previous = history.length > 1 ? history[history.length - 2] : null;
    const dAbs = previous ? (current.monthCharge || 0) - (previous.monthCharge || 0) : null;
    const dPct = (previous && previous.monthCharge) ? (dAbs / Math.abs(previous.monthCharge)) * 100 : null;
    accounts.push({ key: k, provider: current.provider, account: current.account, history, current, previous, dAbs, dPct, status: statusOf(dAbs, !!previous) });
  }
  accounts.sort((a, b) => a.provider.localeCompare(b.provider) || a.account.localeCompare(b.account));
  return accounts;
}

export function providerTotals(accounts, provider) {
  const list = accounts.filter(a => a.provider === provider);
  let curr = 0, prevComparable = 0, currComparable = 0, withPrev = 0, nuevas = 0;
  for (const a of list) {
    if (a.current) curr += a.current.monthCharge || 0;
    if (a.previous) { prevComparable += a.previous.monthCharge || 0; currComparable += a.current.monthCharge || 0; withPrev++; }
    else nuevas++;
  }
  const dAbs = withPrev ? currComparable - prevComparable : null;
  const dPct = (withPrev && prevComparable) ? dAbs / prevComparable * 100 : null;
  return { count: list.length, curr, dAbs, dPct, withPrev, nuevas };
}

export function lineComparison(cur, prev) {
  const map = {};
  (prev ? prev.lineItems : []).forEach(li => { map[norm(li.label)] = { label: li.label, prev: li.amount, cur: null }; });
  (cur ? cur.lineItems : []).forEach(li => { const k = norm(li.label); (map[k] = map[k] || { label: li.label, prev: null, cur: null }).cur = li.amount; map[k].label = li.label; });
  return Object.values(map);
}

// Fila -> objeto de factura (Supabase snake_case -> camelCase del parser)
export function rowToInvoice(r) {
  return {
    id: r.id, provider: r.provider, account: r.account, clientName: r.client_name, invoiceNo: r.invoice_no,
    periodKey: r.period_key, periodLabel: r.period_label, invoiceDate: r.invoice_date, sortKey: r.sort_key,
    balancePrev: num(r.balance_prev), payments: num(r.payments), adjustments: num(r.adjustments), arrears: num(r.arrears),
    subtotal: num(r.subtotal), itbis: num(r.itbis), cdt: num(r.cdt), isc: num(r.isc),
    monthCharge: num(r.month_charge), totalToPay: num(r.total_to_pay),
    lineItems: Array.isArray(r.line_items) ? r.line_items : [],
  };
}
// objeto de factura -> fila Supabase
export function invoiceToRow(v) {
  return {
    id: v.id, provider: v.provider, account: v.account, client_name: v.clientName, invoice_no: v.invoiceNo,
    period_key: v.periodKey, period_label: v.periodLabel, invoice_date: v.invoiceDate, sort_key: v.sortKey,
    balance_prev: v.balancePrev, payments: v.payments, adjustments: v.adjustments, arrears: v.arrears,
    subtotal: v.subtotal, itbis: v.itbis, cdt: v.cdt, isc: v.isc,
    month_charge: v.monthCharge, total_to_pay: v.totalToPay, line_items: v.lineItems || [],
  };
}
function num(x) { return x == null ? null : Number(x); }
