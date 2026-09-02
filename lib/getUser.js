import { createClient } from './supabase/server';

// Devuelve el usuario y su rol (desde app_metadata, seteado por SQL).
// Rol por defecto: 'gerencia' (menos privilegio).
export async function getUserRole() {
  const configured = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (!configured) return { user: null, role: null, configured: false };
  try {
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    return { user, role: user?.app_metadata?.role || 'gerencia', configured: true };
  } catch {
    return { user: null, role: null, configured: true };
  }
}
