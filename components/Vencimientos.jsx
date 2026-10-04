'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RD, buildAccounts, serviceLabel } from '../lib/compare';
import { serviceLabelOf, serviceIconOf } from '../lib/services';

function daysUntil(iso) {
  if (!iso) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(iso + 'T00:00:00');
  return Math.round((d - today) / 86400000);
}
function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('es-DO', { day: '2-digit', month: 'short', year: 'numeric' });
}
function statusOf(inv) {
  if (inv.paid) return { key: 'paid', label: 'Pagada' };
  const du = daysUntil(inv.dueDate);
  if (du == null) return { key: 'nodate', label: 'Sin fecha' };
  if (du < 0) return { key: 'vencida', label: `Vencida hace ${Math.abs(du)} día${Math.abs(du) !== 1 ? 's' : ''}` };
  if (du <= 7) return { key: 'proxima', label: du === 0 ? 'Vence hoy' : `Vence en ${du} día${du !== 1 ? 's' : ''}` };
  return { key: 'aldia', label: `Vence en ${du} días` };
}

export default function Vencimientos({ invoices, configured, error, role }) {
  const router = useRouter();
  const [showPaid, setShowPaid] = useState(false);
  const [busyId, setBusyId] = useState(null);

  // Una fila por cuenta: su factura más reciente (la que toca pagar).
  const rows = buildAccounts(invoices || [])
    .map(a => a.current)
    .map(inv => ({ inv, st: statusOf(inv), du: daysUntil(inv.dueDate) }))
    .sort((a, b) => {
      const av = a.inv.dueDate || '9999', bv = b.inv.dueDate || '9999';
      return av.localeCompare(bv);
    });

  const visibles = rows.filter(r => showPaid || !r.inv.paid);
  const vencidas = rows.filter(r => r.st.key === 'vencida').length;
  const proximas = rows.filter(r => r.st.key === 'proxima').length;
  const totalPorPagar = rows.filter(r => !r.inv.paid).reduce((s, r) => s + (r.inv.totalToPay || r.inv.monthCharge || 0), 0);

  async function marcarPagada(inv, paid) {
    setBusyId(inv.id);
    try {
      const r = await fetch('/api/mark-paid', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: inv.id, paid }),
      });
      if (!r.ok) { const d = await r.json().catch(() => ({})); alert(d.error || 'No se pudo actualizar.'); }
      else router.refresh();
    } catch (e) { alert('Error de red: ' + e.message); }
    setBusyId(null);
  }

  return (
    <div className="wrap">
      <div className="pagehead">
        <h1>Vencimientos</h1>
        <span className="sub">Fechas de pago por cuenta — alerta de vencimientos</span>
      </div>

      {!configured && <div className="notice"><b>Falta configurar Supabase.</b> Ver el README.</div>}
      {configured && error && <div className="notice"><b>Error leyendo datos:</b> {error}</div>}

      {rows.length === 0 ? (
        <div className="empty"><h3>Sin facturas</h3><p>Cuando se carguen facturas, aquí verás sus vencimientos.</p></div>
      ) : (
        <>
          <div className="venc-kpis">
            <div className={'venc-kpi' + (vencidas ? ' bad' : '')}>
              <div className="k-num">{vencidas}</div><div className="k-lbl">vencida{vencidas !== 1 ? 's' : ''}</div>
            </div>
            <div className={'venc-kpi' + (proximas ? ' warn' : '')}>
              <div className="k-num">{proximas}</div><div className="k-lbl">por vencer (≤7 días)</div>
            </div>
            <div className="venc-kpi">
              <div className="k-num k-money">{RD(totalPorPagar)}</div><div className="k-lbl">total pendiente de pago</div>
            </div>
          </div>

          <div className="venc-toolbar">
            <label className="chkbox"><input type="checkbox" checked={showPaid} onChange={e => setShowPaid(e.target.checked)} /> Mostrar pagadas</label>
          </div>

          <div className="venc-list">
            {visibles.map(({ inv, st }) => (
              <div className={'venc-row st-' + st.key} key={inv.id}>
                <div className="venc-svc">
                  <span className="svc-ico" title={serviceLabelOf(inv.serviceType)}>{serviceIconOf(inv.serviceType)}</span>
                </div>
                <div className="venc-main">
                  <div className="venc-top">
                    <b>{inv.provider}</b> · Cuenta {inv.account}
                    <span className="venc-sub">{serviceLabelOf(inv.serviceType)} · {serviceLabel(inv)}</span>
                  </div>
                  <div className="venc-meta">{inv.periodLabel} · vence <b>{fmtDate(inv.dueDate)}</b></div>
                </div>
                <div className="venc-amt">
                  <div className="amt-main">{RD(inv.totalToPay || inv.monthCharge)}</div>
                  <div className="amt-sub">a pagar</div>
                </div>
                <div className="venc-estado">
                  <span className={'venc-badge b-' + st.key}>{st.label}</span>
                </div>
                {role === 'tecnologia' && (
                  <div className="venc-action">
                    {inv.paid
                      ? <button className="mini-btn" disabled={busyId === inv.id} onClick={() => marcarPagada(inv, false)}>Reabrir</button>
                      : <button className="mini-btn ok" disabled={busyId === inv.id} onClick={() => marcarPagada(inv, true)}>✓ Pagada</button>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      <footer className="foot">Se muestra la factura más reciente de cada cuenta. “Total a pagar” incluye balances/atrasos. Tecnología puede marcar una factura como pagada.</footer>
    </div>
  );
}
