import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

// Refresca la sesión y protege rutas:
//  - páginas: requieren login (si no, → /login)
//  - /cargar: requiere rol 'tecnologia'
//  - /login: si ya hay sesión, → /
//  - /api/*: no redirige (cada route valida por su cuenta)
export async function middleware(request) {
  let response = NextResponse.next({ request });

  // Sin Supabase configurado no forzamos login (permite ver el aviso / modo dev).
  const configured = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (!configured) return response;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(list) {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;

  if (path.startsWith('/api')) return response;

  if (!user && path !== '/login') {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  if (user && path === '/login') {
    return NextResponse.redirect(new URL('/', request.url));
  }
  if (user && path.startsWith('/cargar') && user.app_metadata?.role !== 'tecnologia') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|pdf.worker.min.js).*)'],
};
