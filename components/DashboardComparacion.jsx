'use client';
import { useState } from 'react';
import { RD, PCT, serviceLabel, buildAccounts, providerTotals, lineComparison } from '../lib/compare';
import { buildFindings, buildReportHtml } from '../lib/findings';

export default function DashboardComparacion({ invoices, configured, error }) {
  const accounts = buildAccounts(invoices || []);
  const comparables = accounts.filter(a => a.previous);
  const nuevas = accounts.filter(a => !a.previous);
  const providers = ['Claro', 'Altice'].filter(p => accounts.some(a => a.provider === p));

  return (
    <div className="wrap">
      <div className="pagehead">
        <h1>Comparación</h1>
        <span className="sub">Mes actual vs. mes anterior, por cuenta</span>
      </div>

      {!configured && <ConfigNotice />}
      {configured && error && <div className="notice"><b>Error leyendo datos:</b> {error}</div>}

      {accounts.length === 0 ? (
        <Empty />
      ) : (
        <>
          <Summary accounts={accounts} providers={providers} />
          {comparables.length > 0 && (
            <>
              <SectionTitle title="Detalle por cuenta" sub={`${comparables.length} cuenta${comparables.length !== 1 ? 's' : ''} con período anterior`} />
              {comparables.map(a => <AccountBlock key={a.key} a={a} />)}
            </>
          )}
          {nuevas.length > 0 && (
            <>
              <SectionTitle title="Cuentas sin comparación" sub="Solo tienen un período cargado hasta ahora" />
              {nuevas.map(a => <AccountBlock key={a.key} a={a} />)}
            </>
          )}

          <FindingsPanel accounts={accounts} />
        </>
      )}

      <footer className="foot">Se compara el <b>cargo del mes</b> (sin arrastrar atrasos). Cada cuenta contra su propio período anterior.</footer>
    </div>
  );
}

function ConfigNotice() {
  return <div className="notice"><b>Falta configurar Supabase.</b> Define las variables de entorno y crea los usuarios. Ver el README.</div>;
}
function Empty() {
  return <div className="empty"><h3>Aún no hay facturas cargadas</h3><p>Cuando tecnología suba las primeras facturas, aquí aparecerá la comparación.</p></div>;
}
function SectionTitle({ title, sub }) {
  return <div className="section-title"><h2>{title}</h2>{sub && <span>{sub}</span>}</div>;
}

function Summary({ accounts, providers }) {
  const cards = [];
  let grandCurr = 0, grandDelta = 0, anyDelta = false;
  for (const p of providers) {
    const t = providerTotals(accounts, p);
    grandCurr += t.curr; if (t.dAbs != null) { grandDelta += t.dAbs; anyDelta = true; }
    cards.push(<Card key={p} title={p} t={t} />);
  }
  if (providers.length > 1) {
    cards.push(<Card key="_grand" grand title="Total general" t={{
      count: accounts.length, curr: grandCurr, dAbs: anyDelta ? grandDelta : null,
      dPct: (anyDelta && (grandCurr - grandDelta)) ? grandDelta / (grandCurr - grandDelta) * 100 : null,
      withPrev: accounts.filter(a => a.previous).length, nuevas: accounts.filter(a => !a.previous).length,
    }} />);
  }
  return <div className="summary">{cards}</div>;
}

function Card({ title, t, grand }) {
  const dir = t.dAbs == null ? 'none' : (t.dAbs > 0.005 ? 'up' : (t.dAbs < -0.005 ? 'down' : 'same'));
  const arrow = dir === 'up' ? '▲' : dir === 'down' ? '▼' : '';
  const cls = 'card' + (grand ? ' card-grand' : '') + ' prov-' + title.toLowerCase().replace(/\s/g, '');
  return (
    <div className={cls}>
      <div className="card-title">{title}<span className="card-count">{t.count} cuenta{t.count !== 1 ? 's' : ''}</span></div>
      <div className="card-amount">{RD(t.curr)}</div>
      <div className="card-sub">cargo del mes (último período de cada cuenta)</div>
      {t.dAbs != null
        ? <div className={'card-delta ' + dir}>{arrow} {RD(Math.abs(t.dAbs))} ({PCT(t.dPct)}) vs. período anterior</div>
        : <div className="card-delta none">sin período anterior para comparar</div>}
      {t.nuevas ? <div className="card-note">{t.nuevas} cuenta{t.nuevas !== 1 ? 's' : ''} nueva{t.nuevas !== 1 ? 's' : ''} (sin comparación)</div> : null}
    </div>
  );
}

function DeltaCells({ prevV, curV }) {
  if (prevV == null || curV == null) return <><td className="num muted">—</td><td className="num muted">nuevo</td></>;
  const d = curV - prevV;
  const pct = prevV ? d / Math.abs(prevV) * 100 : null;
  const cls = Math.abs(d) < 0.005 ? 'same' : (d > 0 ? 'up' : 'down');
  const arrow = cls === 'up' ? '▲' : cls === 'down' ? '▼' : '=';
  return <><td className={'num ' + cls}>{(d > 0 ? '+' : '') + RD(d).replace('RD$ ', '')}</td><td className={'num ' + cls}>{arrow} {pct == null ? '—' : PCT(pct)}</td></>;
}

function AccountBlock({ a }) {
  const [open, setOpen] = useState(false);
  const cur = a.current, prev = a.previous;
  const badge = a.status === 'up' ? <span className="badge up">▲ subió</span>
    : a.status === 'down' ? <span className="badge down">▼ bajó</span>
    : a.status === 'same' ? <span className="badge same">= igual</span>
    : <span className="badge new">nueva</span>;
  const lines = lineComparison(cur, prev);

  return (
    <div className={'acct status-' + a.status + (open ? ' open' : '')}>
      <button className="acct-head" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <div className="acct-id">
          <span className={'chip chip-' + a.provider.toLowerCase()}>{a.provider}</span>
          <span className="acct-num">Cuenta {a.account}</span>
          <span className="acct-svc">{serviceLabel(cur)}</span>
        </div>
        <div className="acct-fig">
          {prev && <span className="fig-prev">{prev.periodLabel}: {RD(prev.monthCharge)}</span>}
          <span className="fig-cur">{cur.periodLabel}: <b>{RD(cur.monthCharge)}</b></span>
          {a.dAbs != null && <span className={'fig-delta ' + a.status}>{(a.dAbs > 0 ? '+' : '') + RD(a.dAbs)} ({PCT(a.dPct)})</span>}
          {badge}
          <span className="caret">▾</span>
        </div>
      </button>

      {open && (
        <div className="acct-detail">
          <table className="detail-table">
            <thead><tr>
              <th>Concepto</th><th className="num">{prev ? prev.periodLabel : '—'}</th>
              <th className="num">{cur.periodLabel}</th><th className="num">Δ RD$</th><th className="num">Δ %</th>
            </tr></thead>
            <tbody>
              {lines.map((r, i) => (
                <tr key={i}>
                  <td>{r.label}</td>
                  <td className="num">{r.prev == null ? '—' : RD(r.prev)}</td>
                  <td className="num">{r.cur == null ? '—' : RD(r.cur)}</td>
                  <DeltaCells prevV={r.prev} curV={r.cur} />
                </tr>
              ))}
              <tr className="sep"><td>Subtotal (base)</td><td className="num">{prev ? RD(prev.subtotal) : '—'}</td><td className="num">{RD(cur.subtotal)}</td><DeltaCells prevV={prev ? prev.subtotal : null} curV={cur.subtotal} /></tr>
              <TaxRow lbl="ITBIS (18%)" k="itbis" prev={prev} cur={cur} />
              <TaxRow lbl="CDT (2%)" k="cdt" prev={prev} cur={cur} />
              <TaxRow lbl="ISC (10%)" k="isc" prev={prev} cur={cur} />
              <tr className="total"><td>Total del mes</td><td className="num">{prev ? RD(prev.monthCharge) : '—'}</td><td className="num">{RD(cur.monthCharge)}</td><DeltaCells prevV={prev ? prev.monthCharge : null} curV={cur.monthCharge} /></tr>
            </tbody>
          </table>
          <div className="detail-foot">
            <InfoPair label="Balance anterior" prevV={prev ? prev.balancePrev : null} curV={cur.balancePrev} />
            <InfoPair label="Atraso / balance al corte" prevV={prev ? prev.arrears : null} curV={cur.arrears} />
            <InfoPair label="Total a pagar (incluye atrasos)" prevV={prev ? prev.totalToPay : null} curV={cur.totalToPay} />
            <div className="detail-note">La comparación usa el <b>cargo del mes</b>. El historial completo está en la pestaña “Historial”.</div>
          </div>
        </div>
      )}
    </div>
  );
}

function FindingsPanel({ accounts }) {
  const f = buildFindings(accounts);

  function imprimir() {
    const w = window.open('', '_blank');
    if (!w) { alert('Habilita las ventanas emergentes para generar el informe.'); return; }
    w.document.open();
    w.document.write(buildReportHtml(f));
    w.document.close();
  }

  const Group = ({ title, items, cls }) => items.length ? (
    <div className="fnd-group">
      <div className={'fnd-group-title ' + cls}>{title} <span>({items.length})</span></div>
      <ul>{items.map((i, k) => <li key={k}>{i.text}</li>)}</ul>
    </div>
  ) : null;

  return (
    <>
      <div className="section-title fnd-head">
        <h2>Hallazgos</h2>
        <span>Resumen automático de las variaciones</span>
        <button className="btn btn-report" onClick={imprimir}>🖨 Generar informe</button>
      </div>
      <div className="findings">
        <div className="fnd-summary">{f.summaryText}</div>
        <Group title="Subieron" items={f.subieron} cls="up" />
        <Group title="Bajaron" items={f.bajaron} cls="down" />
        <Group title="Sin cambio" items={f.iguales} cls="same" />
        <Group title="Cuentas nuevas (sin comparación)" items={f.nuevas} cls="new" />
        <div className="detail-note">Los hallazgos se generan a partir del desglose por línea de cada factura. El botón “Generar informe” abre una versión imprimible (o para guardar en PDF).</div>
      </div>
    </>
  );
}

function TaxRow({ lbl, k, prev, cur }) {
  return <tr className="tax"><td>{lbl}</td><td className="num">{prev ? RD(prev[k]) : '—'}</td><td className="num">{RD(cur[k])}</td><DeltaCells prevV={prev ? prev[k] : null} curV={cur[k]} /></tr>;
}
function InfoPair({ label, prevV, curV }) {
  return <div className="ip"><span className="ip-l">{label}</span><span className="ip-v">{prevV != null ? RD(prevV) + ' → ' : ''}<b>{RD(curV)}</b></span></div>;
}
