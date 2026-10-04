// Parser de facturas Claro / Altice (RD). Puro: recibe `pages`
// (array de páginas; cada página = array de líneas de texto por posición)
// y devuelve un objeto normalizado. Validado contra 19 PDFs reales jul/ago 2026.

const MESES = { ene:1, feb:2, mar:3, abr:4, may:5, jun:6, jul:7, ago:8, sep:9, oct:10, nov:11, dic:12 };
const MES_LARGO = { enero:1, febrero:2, marzo:3, abril:4, mayo:5, junio:6, julio:7, agosto:8, septiembre:9, setiembre:9, octubre:10, noviembre:11, diciembre:12 };
const MES_ABBR = ['','Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

const MONEY = /-?\$?\s*(?:\d{1,3}(?:,\d{3})+|\d+)\.\d{2}\s*(?:CR)?/i;
const MONEY_G = new RegExp(MONEY.source, 'ig');

export function parseAmount(tok) {
  if (tok == null) return null;
  let t = String(tok).trim();
  const neg = /CR/i.test(t) || /^-/.test(t);
  t = t.replace(/,/g, '').replace(/CR/ig, '').replace(/\$/g, '').replace(/[^0-9.]/g, '');
  if (t === '') return null;
  const n = parseFloat(t);
  if (isNaN(n)) return null;
  return neg ? -Math.abs(n) : n;
}
function moneys(line) {
  const out = []; const m = line.match(MONEY_G);
  if (m) for (const t of m) out.push(parseAmount(t));
  return out;
}
function labeled(lines, labelRe, pick) {
  for (const ln of lines) {
    const m = ln.match(labelRe);
    if (!m) continue;
    const rest = ln.slice(m.index + m[0].length);
    const found = moneys(rest);
    if (found.length) return pick === 'last' ? found[found.length - 1] : found[0];
    const inMatch = moneys(m[0]);
    if (inMatch.length) return pick === 'last' ? inMatch[inMatch.length - 1] : inMatch[0];
  }
  return null;
}
const flat = pages => pages.reduce((a, p) => a.concat(p), []);

export function detectProvider(pages) {
  const txt = flat(pages).join('\n');
  if (/Altice Dominicana/i.test(txt)) return 'Altice';
  if (/Dominicana de Tel[eé]fonos/i.test(txt) || /claro\.com\.do/i.test(txt)) return 'Claro';
  if (/Edenorte/i.test(txt)) return 'Edenorte';
  if (/Edesur/i.test(txt)) return 'Edesur';
  if (/Edeeste|EDE Este/i.test(txt)) return 'Edeeste';
  return null;
}
function isCreditNote(pages) { return /Nota de Cr[eé]dito/i.test(flat(pages).join('\n')); }

function mkPeriod(year, month) {
  return {
    periodKey: year + '-' + String(month).padStart(2, '0'),
    periodLabel: MES_ABBR[month] + ' ' + year,
    invoiceDate: year + '-' + String(month).padStart(2, '0') + '-01',
    sortKey: year * 100 + month,
  };
}

// Fecha en español -> 'YYYY-MM-DD'. mes puede ser nombre largo o abreviado.
function spanishDateISO(mesTxt, day, year) {
  const mes = MES_LARGO[String(mesTxt).toLowerCase()] || MESES[String(mesTxt).slice(0, 3).toLowerCase()];
  if (!mes) return null;
  return `${year}-${String(mes).padStart(2, '0')}-${String(parseInt(day, 10)).padStart(2, '0')}`;
}

function parseClaro(pages) {
  const p1 = pages[0] || [], all = flat(pages);
  const account = (all.find(l => /^Cuenta:/i.test(l)) || '').replace(/Cuenta:\s*/i, '').trim().split(/\s/)[0] || null;
  const clientName = (all.find(l => /Nombre\/Raz[oó]n Social:/i.test(l)) || '').replace(/.*Nombre\/Raz[oó]n Social:\s*/i, '').trim() || null;
  let period = null;
  const fm = all.map(l => l.match(/Fecha de Factura:\s*([A-Za-zÁÉÍÓÚáéíóúñ]+)\s+(\d{1,2})\s*,?\s*(\d{4})/i)).find(Boolean);
  if (fm) { const mes = MES_LARGO[fm[1].toLowerCase()] || MESES[fm[1].slice(0,3).toLowerCase()]; if (mes) period = mkPeriod(parseInt(fm[3],10), mes); }
  const invoiceNo = (all.find(l => /Factura No\.:/i.test(l)) || '').replace(/.*Factura No\.:\s*/i, '').trim() || null;

  // Vencimiento: "Fecha Límite de Pago Septiembre 27, 2026"
  const dm = all.map(l => l.match(/Fecha L[ií]mite de Pago\s+([A-Za-zÁÉÍÓÚáéíóúñ]+)\s+(\d{1,2})\s*,?\s*(\d{4})/i)).find(Boolean);
  const dueDate = dm ? spanishDateISO(dm[1], dm[2], dm[3]) : null;

  const balancePrev = labeled(p1, /Balance anterior/i);
  const payments = labeled(p1, /Pago recibido/i);
  const adjustments = labeled(p1, /Ajustes/i);
  const arrears = labeled(p1, /Atraso/i);
  const subtotal = labeled(p1, /Subtotal/i);
  const itbis = labeled(p1, /ITBIS\s*-\s*18%/i);
  const cdt = labeled(p1, /CDT\s*-\s*2%/i);
  const isc = labeled(p1, /ISC\s*-\s*10%/i);
  const monthCharge = labeled(p1, /Total del Mes/i);
  const totalToPay = labeled(p1, /Total por Pagar/i);

  const lineItems = [];
  const start = p1.findIndex(l => /Factura del Mes/i.test(l));
  const end = p1.findIndex((l, i) => i > start && /^Subtotal/i.test(l));
  if (start >= 0 && end > start) {
    for (let i = start + 1; i < end; i++) {
      const ln = p1[i];
      if (/%/.test(ln)) continue;
      const vals = moneys(ln); if (!vals.length) continue;
      const label = ln.slice(0, ln.search(MONEY)).replace(/\s+/g, ' ').trim();
      if (!label) continue;
      lineItems.push({ label, qty: null, amount: vals[0] });
    }
  }
  return normalize({ serviceType:'telefonia', provider:'Claro', account, clientName, period, invoiceNo, dueDate, balancePrev, payments, adjustments, arrears, subtotal, itbis, cdt, isc, monthCharge, totalToPay, lineItems });
}

function parseAltice(pages) {
  const p1 = pages[0] || [], all = flat(pages);
  const account = ((all.find(l => /Cuenta:\s*\d/i.test(l)) || '').match(/Cuenta:\s*(\d+)/i) || [])[1] || null;
  let period = null;
  const cm = all.map(l => l.match(/Fecha Corte:\s*(\d{1,2})-([A-Za-z]{3,})-(\d{4})/i)).find(Boolean)
    || all.map(l => l.match(/Fecha Emisi[oó]n Factura:\s*(\d{1,2})-([A-Za-z]{3,})-(\d{4})/i)).find(Boolean);
  if (cm) { const mes = MESES[cm[2].slice(0,3).toLowerCase()]; if (mes) period = mkPeriod(parseInt(cm[3],10), mes); }
  const invoiceNo = ((all.find(l => /Factura No\.:/i.test(l)) || '').match(/Factura No\.:\s*(\S+)/i) || [])[1] || null;
  const clientName = (all.find(l => /CORPORACION|RAZ[OÓ]N/i.test(l)) || '').trim() || null;

  // Vencimiento: "Pagar antes de:" seguido de una línea "12 de Agosto 2026"
  const dd = all.map(l => l.match(/^(\d{1,2})\s+de\s+([A-Za-zÁÉÍÓÚáéíóúñ]+)\s+(\d{4})$/i)).find(Boolean);
  const dueDate = dd ? spanishDateISO(dd[2], dd[1], dd[3]) : null;

  const balancePrev = labeled(p1, /Balance previo/i);
  const payments = labeled(p1, /Pagos realizados/i);
  const arrears = labeled(p1, /Total balance pendiente al corte/i);
  const subtotal = labeled(p1, /Subtotal cargos del mes/i);
  const itbis = labeled(p1, /ITBIS\s*\(18%/i, 'last');
  const cdt = labeled(p1, /CDT\s*\(2%/i, 'last');
  const isc = labeled(p1, /ISC\s*\(10%/i, 'last');
  const monthCharge = labeled(p1, /^Total cargos del mes/i);
  const totalToPay = labeled(p1, /Total a pagar/i, 'last');

  const lineItems = [];
  const start = p1.findIndex(l => /Cargos mes actual/i.test(l));
  const end = p1.findIndex((l, i) => i > start && /Subtotal cargos del mes/i.test(l));
  if (start >= 0 && end > start) {
    for (let i = start + 1; i < end; i++) {
      const m = p1[i].match(/^(.+?)\s+(\d+)\s+(-?\$?\s*(?:\d{1,3}(?:,\d{3})+|\d+)\.\d{2}(?:CR)?)\s*$/i);
      if (m) lineItems.push({ label: m[1].trim(), qty: parseInt(m[2],10), amount: parseAmount(m[3]) });
    }
  }
  return normalize({ serviceType:'telefonia', provider:'Altice', account, clientName, period, invoiceNo, dueDate, balancePrev, payments, adjustments:null, arrears, subtotal, itbis, cdt, isc, monthCharge, totalToPay, lineItems });
}

// ---------- ELECTRICIDAD (EDE: Edenorte / Edesur / Edeeste) ----------
function parseEDE(pages, provider) {
  const all = flat(pages);
  const txt = all.join('\n');
  const grab = re => { const m = txt.match(re); return m ? m[1] : null; };

  const account = grab(/CONTRATO\s*:\s*\*?(\d+)/i) || grab(/Ref\.?\s*Pago\.*\s*:?\s*(\d+)/i) || grab(/SUMINISTRO No\.*\s*:?\s*(\d+)/i);
  const invoiceNo = grab(/No\.?\s*Factura\.*\s*:?\s*(\w+)/i);
  const clientName = (grab(/NOMBRE O RAZON SOCIAL\s*:?\s*([^,\n]+)/i) || '').trim() || null;

  let period = null;
  const em = txt.match(/FECHA EMISION\.*\s*:?\s*(\d{2})\/(\d{2})\/(\d{4})/i);
  if (em) period = mkPeriod(parseInt(em[3], 10), parseInt(em[2], 10));

  let dueDate = null;
  const dv = txt.match(/PAGUE ANTES DE\s*(\d{2})\/(\d{2})\/(\d{4})/i);
  if (dv) dueDate = `${dv[3]}-${dv[2]}-${dv[1]}`;

  const monthCharge = parseAmount(grab(/FACTURADO MES\s+\S+\s*RD\$\s*(-?[\d.,]+)/i));
  const totalToPay = parseAmount(grab(/VALOR TOTAL A PAGAR\.*\s*:?\s*RD\$\s*(-?[\d.,]+)/i));
  const arrears = parseAmount(grab(/BALANCE PENDIENTE\.*\s*:?\s*RD\$\s*(-?[\d.,]+)/i));
  const sinSub = parseAmount(grab(/IMPORTE SIN SUBSIDIO EN RD\$\s*RD\$\s*(-?[\d.,]+)/i));
  const subsidio = parseAmount(grab(/IMPORTE SUBSIDIADO EN RD\$\s*RD\$\s*(-?[\d.,]+)/i));

  const lineItems = [];
  if (sinSub != null) lineItems.push({ label: 'Importe sin subsidio', qty: null, amount: sinSub });
  if (subsidio != null) lineItems.push({ label: 'Subsidio', qty: null, amount: subsidio });

  return normalize({
    serviceType: 'electricidad', provider, account, clientName, period, invoiceNo, dueDate,
    balancePrev: arrears, payments: null, adjustments: subsidio, arrears,
    subtotal: sinSub, itbis: null, cdt: null, isc: null, monthCharge, totalToPay, lineItems,
  });
}

function normalize(o) {
  if (!o.account || !o.period) return { _incomplete: true };
  const serviceType = o.serviceType || 'telefonia';
  return {
    id: serviceType + '|' + o.provider + '|' + o.account + '|' + o.period.periodKey,
    serviceType, entryMode: 'auto', dueDate: o.dueDate || null, paid: false,
    provider: o.provider, account: o.account, clientName: o.clientName || null, invoiceNo: o.invoiceNo || null,
    periodKey: o.period.periodKey, periodLabel: o.period.periodLabel, invoiceDate: o.period.invoiceDate, sortKey: o.period.sortKey,
    balancePrev: o.balancePrev, payments: o.payments, adjustments: o.adjustments, arrears: o.arrears,
    subtotal: o.subtotal, itbis: o.itbis, cdt: o.cdt, isc: o.isc, monthCharge: o.monthCharge, totalToPay: o.totalToPay,
    lineItems: o.lineItems || [],
  };
}

const EDE = ['Edenorte', 'Edesur', 'Edeeste'];

export function parseInvoice(pages) {
  const provider = detectProvider(pages);
  if (!provider) return { ok: false, reason: 'Proveedor no reconocido. Usa Captura manual para este servicio.' };
  if (provider === 'Claro' && isCreditNote(pages)) return { ok: false, reason: 'Nota de Crédito (no es factura).' };
  let inv;
  if (provider === 'Claro') inv = parseClaro(pages);
  else if (provider === 'Altice') inv = parseAltice(pages);
  else if (EDE.includes(provider)) inv = parseEDE(pages, provider);
  else return { ok: false, reason: 'Proveedor no soportado aún: ' + provider };
  if (inv._incomplete) return { ok: false, reason: 'Factura ' + provider + ' con layout no reconocido (falta cuenta o fecha).' };
  return { ok: true, invoice: inv };
}
