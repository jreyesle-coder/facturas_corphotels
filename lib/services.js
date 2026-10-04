// Catálogo de tipos de servicio. Agregar uno nuevo es añadir una línea.
export const SERVICES = [
  { key: 'telefonia', label: 'Telefonía', icon: '📞' },
  { key: 'electricidad', label: 'Electricidad', icon: '⚡' },
  { key: 'agua', label: 'Agua', icon: '💧' },
  { key: 'aseo', label: 'Aseo / Basura', icon: '🗑️' },
  { key: 'internet', label: 'Internet', icon: '🌐' },
  { key: 'otro', label: 'Otro', icon: '📄' },
];

export function serviceLabelOf(key) {
  const s = SERVICES.find(s => s.key === key);
  return s ? s.label : (key || 'Servicio');
}
export function serviceIconOf(key) {
  const s = SERVICES.find(s => s.key === key);
  return s ? s.icon : '📄';
}

const MES_ABBR = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

// Construye el período a partir de 'YYYY-MM' (input type=month).
export function periodFromMonth(ym) {
  const m = /^(\d{4})-(\d{2})$/.exec(ym || '');
  if (!m) return null;
  const year = parseInt(m[1], 10), month = parseInt(m[2], 10);
  if (month < 1 || month > 12) return null;
  return {
    periodKey: `${year}-${String(month).padStart(2, '0')}`,
    periodLabel: `${MES_ABBR[month]} ${year}`,
    invoiceDate: `${year}-${String(month).padStart(2, '0')}-01`,
    sortKey: year * 100 + month,
  };
}
