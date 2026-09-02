import { createClient } from '@supabase/supabase-js';
import Dashboard from '../components/Dashboard';
import { rowToInvoice } from '../lib/compare';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const configured = !!(url && key);
  let invoices = [], error = null;

  if (configured) {
    try {
      const sb = createClient(url, key, { auth: { persistSession: false } });
      const { data, error: e } = await sb.from('invoices').select('*');
      if (e) error = e.message;
      else invoices = (data || []).map(rowToInvoice);
    } catch (e) { error = e.message; }
  }

  return <Dashboard invoices={invoices} configured={configured} error={error} />;
}
