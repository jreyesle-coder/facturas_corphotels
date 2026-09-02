// Revalida el parser portado contra los PDFs reales (fuera del repo).
import { createRequire } from 'node:module';
import { parseInvoice } from '../lib/parser.js';
import fs from 'node:fs';
import path from 'node:path';
const require = createRequire(import.meta.url);
const pdfjs = require('pdfjs-dist/legacy/build/pdf.js');
pdfjs.GlobalWorkerOptions.workerSrc = require.resolve('pdfjs-dist/legacy/build/pdf.worker.js');
const getDocument = pdfjs.getDocument;

const BASE = 'C:/Users/usuario/AppData/Local/Temp/facturas_extract';

async function pdfToLines(buf) {
  const doc = await getDocument({ data: new Uint8Array(buf), useSystemFonts: true }).promise;
  const pages = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const content = await (await doc.getPage(p)).getTextContent();
    const rows = [];
    for (const it of content.items) {
      if (!it.str) continue;
      const y = Math.round(it.transform[5]), x = it.transform[4];
      let r = rows.find(r => Math.abs(r.y - y) <= 3);
      if (!r) { r = { y, items: [] }; rows.push(r); }
      r.items.push({ x, str: it.str });
    }
    rows.sort((a, b) => b.y - a.y);
    pages.push(rows.map(r => r.items.sort((a, b) => a.x - b.x).map(i => i.str).join(' ').replace(/\s+/g, ' ').trim()).filter(Boolean));
  }
  return pages;
}

const fmt = n => n == null ? '—' : n.toLocaleString('en-US', { minimumFractionDigits: 2 }).padStart(11);
let okCount = 0, bad = 0;
for (const mes of ['julio', 'agosto']) {
  for (const f of fs.readdirSync(path.join(BASE, mes))) {
    if (!f.toLowerCase().endsWith('.pdf')) continue;
    const res = parseInvoice(await pdfToLines(fs.readFileSync(path.join(BASE, mes, f))));
    if (!res.ok) { console.log('SKIP', f, '→', res.reason); continue; }
    const v = res.invoice;
    const calc = (v.subtotal||0)+(v.itbis||0)+(v.cdt||0)+(v.isc||0);
    const ok = Math.abs(calc - (v.monthCharge||0)) < 0.05;
    if (ok) okCount++; else bad++;
    console.log((ok?'OK ':'!! '), v.provider.padEnd(6), v.account.padEnd(10), v.periodLabel.padEnd(9), 'mes=', fmt(v.monthCharge), 'pagar=', fmt(v.totalToPay), 'items=', v.lineItems.length);
  }
}
console.log(`\nCuadran: ${okCount}  ·  descuadres: ${bad}`);
