'use client';
import { useState } from 'react';
import { RD, serviceLabel, buildAccounts } from '../lib/compare';

export default function Historial({ invoices, configured, error }) {
  const accounts = buildAccounts(invoices || []);

  // Evolución total por período (suma de cargo del mes de todas las cuentas con ese período).
  const byPeriod = {};
  for (const inv of invoices || []) {
    const k = inv.periodKey;
    (byPeriod[k] = byPeriod[k] || { key: k, label: inv.periodLabel, sortKey: inv.sortKey, total: 0, count: 0 });
    byPeriod[k].total += inv.monthCharge || 0; byPeriod[k].count++;
  }
  const periods = Object.values(byPeriod).sort((a, b) => a.sortKey - b.sortKey);
  const maxTotal = Math.max(...periods.map(p => p.total), 1);

  return (
    <div className="wrap">
      <div className="pagehead">
        <h1>Historial</h1>
        <span className="sub">Evolución de las facturas a lo largo del tiempo</span>
      </div>

      {!configured && <div className="notice"><b>Falta configurar Supabase.</b> Ver el README.</div>}
      {configured && error && <div className="notice"><b>Error leyendo datos:</b> {error}</div>}

      {accounts.length === 0 ? (
        <div className="empty"><h3>Aún no hay facturas cargadas</h3><p>El historial aparecerá cuando se carguen facturas.</p></div>
      ) : (
        <>
          {periods.length > 1 && (
            <div className="card-box">
              <h2 className="cb-title">Gasto total por período</h2>
              <div className="bars">
                {periods.map(p => (
                  <div className="bar-col" key={p.key} title={`${p.label}: ${RD(p.total)} (${p.count} cuenta${p.count !== 1 ? 's' : ''})`}>
                    <div className="bar-val">{RD(p.total).replace('RD$ ', '')}</div>
                    <div className="bar" style={{ height: Math.max(4, p.total / maxTotal * 130) + 'px' }} />
                    <div className="bar-lbl">{p.label}</div>
                  </div>
                ))}
              </div>
              <div className="detail-note">Suma del cargo del mes de todas las cuentas facturadas en cada período.</div>
            </div>
          )}

          <div className="section-title"><h2>Historial por cuenta</h2><span>{accounts.length} cuenta{accounts.length !== 1 ? 's' : ''}</span></div>
          {accounts.map(a => <HistoryBlock key={a.key} a={a} />)}
        </>
      )}
    </div>
  );
}

function HistoryBlock({ a }) {
  const [open, setOpen] = useState(false);
  const maxCharge = Math.max(...a.history.map(h => h.monthCharge || 0), 1);
  const cur = a.current;

  return (
    <div className={'acct status-' + a.status + (open ? ' open' : '')}>
      <button className="acct-head" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <div className="acct-id">
          <span className={'chip chip-' + a.provider.toLowerCase()}>{a.provider}</span>
          <span className="acct-num">Cuenta {a.account}</span>
          <span className="acct-svc">{serviceLabel(cur)}</span>
        </div>
        <div className="acct-fig">
          <span className="spark">
            {a.history.map((h, i) => <i key={i} style={{ height: Math.max(3, (h.monthCharge || 0) / maxCharge * 30) + 'px' }} title={h.periodLabel + ': ' + RD(h.monthCharge)} />)}
          </span>
          <span className="fig-cur">{a.history.length} período{a.history.length !== 1 ? 's' : ''} · último <b>{RD(cur.monthCharge)}</b></span>
          <span className="caret">▾</span>
        </div>
      </button>

      {open && (
        <div className="acct-detail">
          <table className="hist-table">
            <thead><tr><th>Período</th><th>Cargo del mes</th><th>Δ vs. anterior</th><th>Subtotal</th><th>Impuestos</th><th>Total a pagar</th></tr></thead>
            <tbody>
              {a.history.map((h, i) => {
                const p = i > 0 ? a.history[i - 1] : null;
                const d = p ? (h.monthCharge || 0) - (p.monthCharge || 0) : null;
                const cls = d == null ? '' : (Math.abs(d) < 0.005 ? 'same' : d > 0 ? 'up' : 'down');
                const imp = (h.itbis || 0) + (h.cdt || 0) + (h.isc || 0);
                return (
                  <tr key={i}>
                    <td>{h.periodLabel}</td>
                    <td>{RD(h.monthCharge)}</td>
                    <td className={cls}>{d == null ? '—' : (d > 0 ? '+' : '') + RD(d)}</td>
                    <td>{RD(h.subtotal)}</td>
                    <td>{RD(imp)}</td>
                    <td>{RD(h.totalToPay)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
