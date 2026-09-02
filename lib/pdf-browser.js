// Lectura de PDF en el navegador (pdf.js). Reconstruye líneas por posición,
// igual que la validación en Node → mismos resultados del parser.
let _pdfjs = null;
async function getPdfjs() {
  if (_pdfjs) return _pdfjs;
  const pdfjsLib = await import('pdfjs-dist/build/pdf');
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
  _pdfjs = pdfjsLib;
  return pdfjsLib;
}

export async function pdfToLines(arrayBuffer) {
  const pdfjsLib = await getPdfjs();
  const doc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const rows = [];
    for (const item of content.items) {
      if (!item.str) continue;
      const y = Math.round(item.transform[5]);
      const x = item.transform[4];
      let row = rows.find(r => Math.abs(r.y - y) <= 3);
      if (!row) { row = { y, items: [] }; rows.push(row); }
      row.items.push({ x, str: item.str });
    }
    rows.sort((a, b) => b.y - a.y);
    pages.push(rows.map(r => r.items.sort((a, b) => a.x - b.x).map(i => i.str).join(' ').replace(/\s+/g, ' ').trim()).filter(Boolean));
  }
  return pages;
}
