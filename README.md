# Comparador de Facturas Claro / Altice (web)

App Next.js que lee las facturas PDF de Claro y Altice, guarda el historial en
Supabase y las compara mes a mes. **Con login por usuario y roles.**

- **3 pestañas:** `Comparación` (mes actual vs. anterior), `Historial` (evolución de todos los meses) y `Cargar` (subir facturas).
- **Roles:**
  - **gerencia** → ve Comparación e Historial.
  - **tecnología** → además puede **cargar** las facturas.
- Los PDF se leen en el navegador (pdf.js); a la nube solo viaja la data extraída.
- Compara el **cargo del mes** (no el “Total a pagar”, que arrastra atrasos).
- Ignora automáticamente las Notas de Crédito y los duplicados.

## Puesta en marcha

### 1. Supabase
1. Crea un proyecto en https://supabase.com
2. **SQL Editor → New query**, pega [`supabase/schema.sql`](supabase/schema.sql) y **Run** (crea la tabla + RLS).
3. **Authentication → Users → Add user** (marca *Auto Confirm User*): crea los dos usuarios, p. ej. `gerencia@tuempresa.com` y `tecnologia@tuempresa.com`.
4. Vuelve al **SQL Editor** y corre los dos `update auth.users ...` del final de `schema.sql` (con los correos reales) para asignar los roles.
5. **Project Settings → API**: copia `URL`, `anon public` y `service_role`.

### 2. Variables de entorno
Copia `.env.local.example` a `.env.local`:

| Variable | De dónde | Notas |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → API | pública |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → API (anon) | pública |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → API (service_role) | **secreta**, solo servidor |

### 3. Local
```bash
npm install
npm run dev     # http://localhost:3000
```

### 4. Deploy en Vercel
1. Sube el proyecto a GitHub.
2. Vercel → **New Project** → importa el repo.
3. **Settings → Environment Variables**: agrega las 3 variables.
4. Deploy. Comparte la URL; cada quien entra con su usuario.

## Uso
- **gerencia** entra y ve *Comparación* e *Historial*.
- **tecnología** entra, va a *Cargar*, arrastra los PDF del mes, revisa el resumen y **Guarda en la nube**. Los dashboards quedan actualizados para todos.
- El próximo mes solo se sube lo nuevo; se compara con lo ya guardado.

## Seguridad
- Rutas protegidas por `middleware.js`; sin sesión → `/login`.
- `/cargar` y el endpoint `/api/save` exigen rol **tecnología** (verificado en el servidor).
- La `service_role` solo vive en el servidor; el navegador nunca la ve.
- RLS: la tabla `invoices` solo es legible por usuarios autenticados.

## Estructura
- `lib/parser.js` — parser de facturas (validado contra 19 PDFs reales).
- `lib/pdf-browser.js` — lectura de PDF en el navegador.
- `lib/compare.js` — comparación, formato y mapeo a/desde Supabase.
- `lib/supabase/*`, `lib/getUser.js`, `lib/getInvoices.js`, `middleware.js` — auth y datos.
- `app/(app)/page.js` + `components/DashboardComparacion.jsx` — Comparación.
- `app/(app)/historial/page.js` + `components/Historial.jsx` — Historial.
- `app/(app)/cargar/page.js` — Cargar (tecnología).
- `app/login/page.js` — login.
- `app/api/save/route.js` — guarda en Supabase (valida rol).
- `supabase/schema.sql` — tabla, RLS y asignación de roles.

## Revalidar el parser
```bash
npm run validate   # requiere los PDFs en la ruta del script
```
