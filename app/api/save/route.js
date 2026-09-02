import { createClient } from '@supabase/supabase-js';
import { invoiceToRow } from '../../../lib/compare';

export const runtime = 'nodejs';

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json' } });
}

export async function POST(req) {
  let body;
  try { body = await req.json(); } catch { return json({ error: 'JSON inválido' }, 400); }
  const { passcode, invoices } = body || {};

  if (!process.env.UPLOAD_PASSCODE) return json({ error: 'Falta configurar UPLOAD_PASSCODE en el servidor.' }, 500);
  if (passcode !== process.env.UPLOAD_PASSCODE) return json({ error: 'Clave de carga incorrecta.' }, 401);
  if (!Array.isArray(invoices) || !invoices.length) return json({ error: 'No hay facturas para guardar.' }, 400);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !service) return json({ error: 'Falta configurar Supabase (URL o SERVICE_ROLE_KEY).' }, 500);

  const sb = createClient(url, service, { auth: { persistSession: false } });
  const rows = invoices.map(invoiceToRow);
  const { error } = await sb.from('invoices').upsert(rows, { onConflict: 'id' });
  if (error) return json({ error: error.message }, 500);

  return json({ ok: true, count: rows.length });
}
