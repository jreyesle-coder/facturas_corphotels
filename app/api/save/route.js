import { createClient as createAdminClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '../../../lib/supabase/server';
import { invoiceToRow } from '../../../lib/compare';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json' } });
}

export async function POST(req) {
  // 1) Verifica sesión y rol (solo tecnología puede escribir).
  const sb = createServerClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return json({ error: 'No autenticado.' }, 401);
  if (user.app_metadata?.role !== 'tecnologia') return json({ error: 'No autorizado: se requiere rol tecnología.' }, 403);

  // 2) Valida el cuerpo.
  let body;
  try { body = await req.json(); } catch { return json({ error: 'JSON inválido' }, 400); }
  const { invoices } = body || {};
  if (!Array.isArray(invoices) || !invoices.length) return json({ error: 'No hay facturas para guardar.' }, 400);

  // 3) Escribe con service_role (bypassa RLS; nunca se expone al navegador).
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !service) return json({ error: 'Falta configurar Supabase (URL o SERVICE_ROLE_KEY).' }, 500);

  const admin = createAdminClient(url, service, { auth: { persistSession: false } });
  const rows = invoices.map(invoiceToRow);
  const { error } = await admin.from('invoices').upsert(rows, { onConflict: 'id' });
  if (error) return json({ error: error.message }, 500);

  return json({ ok: true, count: rows.length });
}
