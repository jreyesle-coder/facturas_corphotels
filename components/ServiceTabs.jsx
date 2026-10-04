'use client';
import { SERVICES } from '../lib/services';

// Pestañas de servicio. Muestra solo los servicios que tienen facturas cargadas.
export default function ServiceTabs({ invoices, value, onChange }) {
  const present = SERVICES.filter(s => (invoices || []).some(i => (i.serviceType || 'telefonia') === s.key));
  if (present.length === 0) return null;
  return (
    <div className="svc-tabs">
      {present.map(s => (
        <button key={s.key}
          className={'svc-tab' + (s.key === value ? ' active' : '')}
          onClick={() => onChange(s.key)}>
          <span className="svc-ico">{s.icon}</span> {s.label}
        </button>
      ))}
    </div>
  );
}

// Primer servicio presente (para el valor inicial).
export function firstService(invoices) {
  const s = SERVICES.find(s => (invoices || []).some(i => (i.serviceType || 'telefonia') === s.key));
  return s ? s.key : 'telefonia';
}
