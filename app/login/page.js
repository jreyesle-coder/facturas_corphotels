'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [logoOk, setLogoOk] = useState(true);
  const router = useRouter();

  const configured = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      const sb = createClient();
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) { setErr('Correo o clave incorrectos.'); setBusy(false); return; }
      router.push('/'); router.refresh();
    } catch (e) { setErr('Error: ' + e.message); setBusy(false); }
  }

  return (
    <div className="login-wrap">
      <div className={'login-logo' + (logoOk ? '' : ' text')}>
        {logoOk
          ? <img src="/corphotels-blanco.png" alt="CORPHOTELS" onError={() => setLogoOk(false)} />
          : 'CORPHOTELS'}
      </div>
      <form className="login-box" onSubmit={submit}>
        <h1>Comparador de Facturas</h1>
        <p className="sub">Claro · Altice</p>
        {!configured && <div className="msg err">Falta configurar Supabase (variables de entorno). Ver README.</div>}
        <div className="field">
          <label htmlFor="email">Correo</label>
          <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="username" required />
        </div>
        <div className="field">
          <label htmlFor="pw">Clave</label>
          <input id="pw" type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" required />
        </div>
        {err && <div className="msg err">{err}</div>}
        <button className="btn" type="submit" disabled={busy || !configured}>{busy ? 'Entrando…' : 'Entrar'}</button>
      </form>
    </div>
  );
}
