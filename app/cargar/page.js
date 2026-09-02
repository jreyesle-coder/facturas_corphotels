'use client';
import { useState, useRef } from 'react';
import Link from 'next/link';
import { pdfToLines } from '../../lib/pdf-browser';
import { parseInvoice } from '../../lib/parser';
import { RD } from '../../lib/compare';

export default function CargarPage() {
  const [passcode, setPasscode] = useState('');
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState(null);   // [{name, ok, inv?, reason?}]
  const [parsed, setParsed] = useState([]);        // facturas OK listas para guardar
  const [msg, setMsg] = useState(null);            // {type, text}
  const [over, setOver] = useState(false);
  const fileRef = useRef(null);

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
    // dedupe por id (última gana)
    const byId = {}; for (const v of ok) byId[v.id] = v;
    setResults(res); setParsed(Object.values(byId)); setBusy(false);
  }

  async function save() {
    if (!passcode) { setMsg({ type: 'err', text: 'Escribe la clave de carga.' }); return; }
    if (!parsed.length) { setMsg({ type: 'err', text: 'Primero carga PDFs válidos.' }); return; }
    setBusy(true); setMsg(null);
    try {
      const r = await fetch('/api/save', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ passcode, invoices: parsed }),
      });
      const data = await r.json();
      if (!r.ok) setMsg({ type: 'err', text: data.error || 'Error al guardar.' });
      else { setMsg({ type: 'ok', text: `Guardadas ${data.count} facturas en la nube. Ya están visibles en el dashboard.` }); setParsed([]); setResults(null); }
    } catch (e) { setMsg({ type: 'err', text: 'Error de red: ' + e.message }); }
    setBusy(false);
  }

  return (
    <div className="wrap">
      <div className="topbar">
        <div><h1>Cargar facturas</h1><span className="sub">Solo la persona autorizada</span></div>
        <Link className="nav-link" href="/">← Ver dashboard</Link>
      </div>
      <p className="lead">Los PDF se leen aquí en tu navegador; a la nube solo viaja la información ya extraída (ningún PDF se sube).</p>

      <div className="card-box">
        <div className="field">
          <label htmlFor="pc">Clave de carga</label>
          <input id="pc" type="password" value={passcode} onChange={e => setPasscode(e.target.value)} placeholder="••••••••" autoComplete="off" />
        </div>

        <div className={'dropzone' + (over ? ' over' : '')}
          onClick={() => fileRef.current?.click()}
          onDragEnter={e => { e.preventDefault(); setOver(true); }}
          onDragOver={e => { e.preventDefault(); setOver(true); }}
          onDragLeave={e => { e.preventDefault(); setOver(false); }}
          onDrop={e => { e.preventDefault(); setOver(false); readFiles(e.dataTransfer.files); }}>
          <div className="big">⬆ Arrastra aquí los PDF de las facturas</div>
          <div className="small">o haz clic para seleccionarlos · Claro y Altice · varios a la vez</div>
        </div>
        <input ref={fileRef} type="file" accept="application/pdf" multiple hidden
          onChange={e => { readFiles(e.target.files); e.target.value = ''; }} />

        {busy && <div className="busy"><span className="spinner" /> Procesando…</div>}

        {results && (
          <ul className="log">
            {results.filter(r => r.ok).map((r, i) => (
              <li key={'o' + i} className="ok">✓ {r.name} → {r.inv.provider} · cuenta {r.inv.account} · {r.inv.periodLabel} · {RD(r.inv.monthCharge)}</li>
            ))}
            {results.filter(r => !r.ok).map((r, i) => (
              <li key={'b' + i} className="bad">⚠ {r.name} → {r.reason}</li>
            ))}
          </ul>
        )}

        <div className="row">
          <button className="btn" onClick={save} disabled={busy || !parsed.length}>
            Guardar {parsed.length ? `(${parsed.length})` : ''} en la nube
          </button>
          {parsed.length > 0 && <span className="sub">{parsed.length} factura{parsed.length !== 1 ? 's' : ''} lista{parsed.length !== 1 ? 's' : ''} para guardar</span>}
        </div>

        {msg && <div className={'msg ' + (msg.type === 'ok' ? 'ok' : 'err')}>{msg.text}</div>}
      </div>

      <footer className="foot">Se ignoran automáticamente las Notas de Crédito y los duplicados. Volver a subir una factura la actualiza.</footer>
    </div>
  );
}
