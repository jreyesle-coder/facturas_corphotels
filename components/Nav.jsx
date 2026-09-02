'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '../lib/supabase/client';

export default function Nav({ email, role, configured }) {
  const path = usePathname();
  const router = useRouter();

  const tabs = [
    { href: '/', label: 'Comparación' },
    { href: '/historial', label: 'Historial' },
  ];
  if (role === 'tecnologia') tabs.push({ href: '/cargar', label: 'Cargar' });

  async function logout() {
    const sb = createClient();
    await sb.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <nav className="appnav">
      <div className="appnav-inner">
        <div className="appnav-brand">Facturas Claro/Altice</div>
        <div className="appnav-tabs">
          {tabs.map(t => (
            <Link key={t.href} href={t.href}
              className={'tab' + ((t.href === '/' ? path === '/' : path.startsWith(t.href)) ? ' active' : '')}>
              {t.label}
            </Link>
          ))}
        </div>
        {configured && email && (
          <div className="appnav-user">
            <span className="who">{email}</span>
            <span className={'role-chip ' + (role === 'tecnologia' ? 'tech' : 'ger')}>{role === 'tecnologia' ? 'Tecnología' : 'Gerencia'}</span>
            <button className="logout" onClick={logout}>Salir</button>
          </div>
        )}
      </div>
    </nav>
  );
}
