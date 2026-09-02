// Copia el worker de pdf.js a /public para servirlo como /pdf.worker.min.js
import fs from 'node:fs';
import path from 'node:path';

const src = path.resolve('node_modules/pdfjs-dist/build/pdf.worker.min.js');
const dest = path.resolve('public/pdf.worker.min.js');
try {
  fs.copyFileSync(src, dest);
  console.log('pdf worker copiado -> public/pdf.worker.min.js');
} catch (e) {
  console.warn('No se pudo copiar el worker de pdf.js:', e.message);
}
