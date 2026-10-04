import { createClient as createAdminClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '../../../lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json' } });
}

export async function POST(req) {
  const sb = createServerClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return json({ error: 'No autenticado.' }, 401);
  if (user.app_metadata?.role !== 'tecnologia') return json({ error: 'No autorizado: se requiere rol tecnología.' }, 403);

  let body;
  try { body = await req.json(); } catch { return json({ error: 'JSON inválido' }, 400); }
  const { id, paid } = body || {};
  if (!id) return json({ error: 'Falta el id de la factura.' }, 400);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !service) return json({ error: 'Falta configurar Supabase.' }, 500);

  const admin = createAdminClient(url, service, { auth: { persistSession: false } });
  const { error } = await admin.from('invoices').update({ paid: !!paid }).eq('id', id);
  if (error) return json({ error: error.message }, 500);
  return json({ ok: true });
}
