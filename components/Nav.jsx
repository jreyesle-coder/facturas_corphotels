'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '../lib/supabase/client';
import { canWrite, roleLabel, roleChipClass } from '../lib/roles';

export default function Nav({ email, role, configured }) {
  const path = usePathname();
  const router = useRouter();
  const [logoOk, setLogoOk] = useState(true);

  const tabs = [
    { href: '/', label: 'Comparación' },
    { href: '/historial', label: 'Historial' },
    { href: '/vencimientos', label: 'Vencimientos' },
  ];

  async function logout() {
    const sb = createClient();
    await sb.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <nav className="appnav">
      <div className="appnav-inner">
        <Link href="/" className="appnav-brand" title="Ir al inicio">
          {logoOk
            ? <img src="/logo-blanco.svg" alt="CORPHOTELS — Inicio" onError={() => setLogoOk(false)} />
            : 'CORPHOTELS'}
        </Link>
        <div className="appnav-tabs">
          {tabs.map(t => (
            <Link key={t.href} href={t.href}
              className={'tab' + ((t.href === '/' ? path === '/' : path.startsWith(t.href)) ? ' active' : '')}>
              {t.label}
            </Link>
          ))}
        </div>
        {canWrite(role) && (
          <Link href="/cargar" className={'tab-cta' + (path.startsWith('/cargar') ? ' active' : '')}>
            ⬆ Cargar factura
          </Link>
        )}
        {configured && email && (
          <div className="appnav-user">
            <span className="who">{email}</span>
            <span className={'role-chip ' + roleChipClass(role)}>{roleLabel(role)}</span>
            <button className="logout" onClick={logout}>Salir</button>
          </div>
        )}
      </div>
    </nav>
  );
}
