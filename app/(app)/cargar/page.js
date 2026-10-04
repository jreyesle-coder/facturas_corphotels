'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { pdfToLines } from '../../../lib/pdf-browser';
import { parseInvoice } from '../../../lib/parser';
import { RD } from '../../../lib/compare';
import { SERVICES, serviceLabelOf, periodFromMonth } from '../../../lib/services';

export default function CargarPage() {
  const [mode, setMode] = useState('auto');
  return (
    <div className="wrap">
      <div className="pagehead">
        <h1>Cargar facturas</h1>
        <span className="sub">Solo tecnología</span>
      </div>

      <div className="mode-switch">
        <button className={'mode-btn' + (mode === 'auto' ? ' active' : '')} onClick={() => setMode('auto')}>📄 Lectura automática (PDF)</button>
        <button className={'mode-btn' + (mode === 'manual' ? ' active' : '')} onClick={() => setMode('manual')}>✍️ Captura manual</button>
      </div>

      {mode === 'auto' ? <AutoMode /> : <ManualMode />}
    </div>
  );
}

/* ---------------- Lectura automática (PDF) ---------------- */
function AutoMode() {
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState(null);
  const [parsed, setParsed] = useState([]);
  const [msg, setMsg] = useState(null);
  const [over, setOver] = useState(false);
  const fileRef = useRef(null);
  const router = useRouter();

  async function readFiles(fileList) {
    const files = Array.from(fileList).filter(f => /\.pdf$/i.test(f.name));
    if (!files.length) { setMsg({ type: 'err', text: 'No hay archivos PDF.' }); return; }
    setBusy(true); setMsg(null);
    const res = [], ok = [];
    for (const f of files) {
      try {
        const pages = await pdfToLines(await f.arrayBuffer());
        const r = parseInvoice(pages);
        if (r.ok) { res.push({ name: f.name, ok: true, inv: r.invoice }); ok.push(r.invoice); }
        else res.push({ name: f.name, ok: false, reason: r.reason });
      } catch (e) { res.push({ name: f.name, ok: false, reason: 'Error al leer el PDF: ' + e.message }); }
    }
    const byId = {}; for (const v of ok) byId[v.id] = v;
    setResults(res); setParsed(Object.values(byId)); setBusy(false);
  }

  async function save() {
    if (!parsed.length) { setMsg({ type: 'err', text: 'Primero carga PDFs válidos.' }); return; }
    setBusy(true); setMsg(null);
    try {
      const r = await fetch('/api/save', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ invoices: parsed }) });
      const data = await r.json();
      if (!r.ok) setMsg({ type: 'err', text: data.error || 'Error al guardar.' });
      else { setMsg({ type: 'ok', text: `Guardadas ${data.count} facturas en la nube.` }); setParsed([]); setResults(null); router.refresh(); }
    } catch (e) { setMsg({ type: 'err', text: 'Error de red: ' + e.message }); }
    setBusy(false);
  }

  return (
    <div className="card-box">
      <p className="lead">Lectores automáticos: <b>Claro</b>, <b>Altice</b> (telefonía) y <b>Edenorte</b> (electricidad). Otros proveedores: usa Captura manual (y envíame una factura de muestra para agregar su lector).</p>
      <div className={'dropzone' + (over ? ' over' : '')}
        onClick={() => fileRef.current?.click()}
        onDragEnter={e => { e.preventDefault(); setOver(true); }}
        onDragOver={e => { e.preventDefault(); setOver(true); }}
        onDragLeave={e => { e.preventDefault(); setOver(false); }}
        onDrop={e => { e.preventDefault(); setOver(false); readFiles(e.dataTransfer.files); }}>
        <div className="big">⬆ Arrastra aquí los PDF de las facturas</div>
        <div className="small">o haz clic para seleccionarlos · varios a la vez</div>
      </div>
      <input ref={fileRef} type="file" accept="application/pdf" multiple hidden onChange={e => { readFiles(e.target.files); e.target.value = ''; }} />

      {busy && <div className="busy"><span className="spinner" /> Procesando…</div>}

      {results && (
        <ul className="log">
          {results.filter(r => r.ok).map((r, i) => (
            <li key={'o' + i} className="ok">✓ {r.name} → {serviceLabelOf(r.inv.serviceType)} · {r.inv.provider} · cuenta {r.inv.account} · {r.inv.periodLabel} · {RD(r.inv.monthCharge)}{r.inv.dueDate ? ` · vence ${r.inv.dueDate}` : ''}</li>
          ))}
          {results.filter(r => !r.ok).map((r, i) => (<li key={'b' + i} className="bad">⚠ {r.name} → {r.reason}</li>))}
        </ul>
      )}

      <div className="row">
        <button className="btn" onClick={save} disabled={busy || !parsed.length}>Guardar {parsed.length ? `(${parsed.length})` : ''} en la nube</button>
      </div>
      {msg && <div className={'msg ' + (msg.type === 'ok' ? 'ok' : 'err')}>{msg.text}</div>}
    </div>
  );
}

/* ---------------- Captura manual ---------------- */
function ManualMode() {
  const [f, setF] = useState({ serviceType: 'electricidad', provider: '', account: '', mes: '', monto: '', totalPagar: '', vencimiento: '' });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const router = useRouter();
  const set = (k, v) => setF(s => ({ ...s, [k]: v }));

  async function save() {
    setMsg(null);
    if (!f.provider.trim() || !f.account.trim() || !f.mes || !f.monto) {
      setMsg({ type: 'err', text: 'Completa proveedor, cuenta, mes y cargo del mes.' }); return;
    }
    const period = periodFromMonth(f.mes);
    if (!period) { setMsg({ type: 'err', text: 'Mes inválido.' }); return; }
    const inv = {
      id: `${f.serviceType}|${f.provider.trim()}|${f.account.trim()}|${period.periodKey}`,
      serviceType: f.serviceType, provider: f.provider.trim(), account: f.account.trim(),
      clientName: null, invoiceNo: null,
      periodKey: period.periodKey, periodLabel: period.periodLabel, invoiceDate: period.invoiceDate, sortKey: period.sortKey,
      dueDate: f.vencimiento || null, paid: false, entryMode: 'manual',
      balancePrev: null, payments: null, adjustments: null, arrears: null,
      subtotal: null, itbis: null, cdt: null, isc: null,
      monthCharge: Number(f.monto), totalToPay: f.totalPagar ? Number(f.totalPagar) : Number(f.monto),
      lineItems: [],
    };
    setBusy(true);
    try {
      const r = await fetch('/api/save', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ invoices: [inv] }) });
      const data = await r.json();
      if (!r.ok) setMsg({ type: 'err', text: data.error || 'Error al guardar.' });
      else {
        setMsg({ type: 'ok', text: `Guardada: ${serviceLabelOf(f.serviceType)} · ${f.provider} · ${period.periodLabel} · ${RD(inv.monthCharge)}.` });
        setF({ ...f, account: '', mes: '', monto: '', totalPagar: '', vencimiento: '' });
        router.refresh();
      }
    } catch (e) { setMsg({ type: 'err', text: 'Error de red: ' + e.message }); }
    setBusy(false);
  }

  return (
    <div className="card-box">
      <p className="lead">Registra cualquier servicio a mano. Se compara igual mes a mes y aparece en Vencimientos.</p>
      <div className="form-grid">
        <div className="field">
          <label>Servicio</label>
          <select value={f.serviceType} onChange={e => set('serviceType', e.target.value)}>
            {SERVICES.map(s => <option key={s.key} value={s.key}>{s.icon} {s.label}</option>)}
          </select>
        </div>
        <div className="field"><label>Proveedor</label><input value={f.provider} onChange={e => set('provider', e.target.value)} placeholder="Ej. CAASD, Ayuntamiento…" /></div>
        <div className="field"><label>Cuenta / Contrato</label><input value={f.account} onChange={e => set('account', e.target.value)} placeholder="N° de cuenta" /></div>
        <div className="field"><label>Mes de la factura</label><input type="month" value={f.mes} onChange={e => set('mes', e.target.value)} /></div>
        <div className="field"><label>Cargo del mes (RD$)</label><input type="number" step="0.01" value={f.monto} onChange={e => set('monto', e.target.value)} placeholder="0.00" /></div>
        <div className="field"><label>Total a pagar (RD$) — opcional</label><input type="number" step="0.01" value={f.totalPagar} onChange={e => set('totalPagar', e.target.value)} placeholder="si incluye atrasos" /></div>
        <div className="field"><label>Fecha de vencimiento</label><input type="date" value={f.vencimiento} onChange={e => set('vencimiento', e.target.value)} /></div>
      </div>
      <div className="row"><button className="btn" onClick={save} disabled={busy}>{busy ? 'Guardando…' : 'Guardar factura'}</button></div>
      {msg && <div className={'msg ' + (msg.type === 'ok' ? 'ok' : 'err')}>{msg.text}</div>}
    </div>
  );
}
