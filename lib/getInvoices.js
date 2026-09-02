import { createClient } from './supabase/server';
import { rowToInvoice } from './compare';

// Lee las facturas desde Supabase con la sesión del usuario (RLS: solo autenticados).
export async function getInvoices() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!(url && key)) return { invoices: [], configured: false, error: null };
  try {
    const sb = createClient();
    const { data, error } = await sb.from('invoices').select('*');
    if (error) return { invoices: [], configured: true, error: error.message };
    return { invoices: (data || []).map(rowToInvoice), configured: true, error: null };
  } catch (e) {
    return { invoices: [], configured: true, error: e.message };
  }
}
