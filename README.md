# Comparador de Facturas Claro / Altice (web)

App Next.js que lee las facturas PDF de Claro y Altice, guarda el historial en
Supabase y compara cada cuenta mes a mes. **Lectura pública por link**; la
**carga la hace solo la persona autorizada** (protegida por una clave).

- Los PDF se leen en el navegador (pdf.js); a la nube solo viaja la data extraída.
- La comparación usa el **cargo del mes** (no el “Total a pagar”, que arrastra atrasos).
- Ignora automáticamente las Notas de Crédito y los duplicados.

## Puesta en marcha

### 1. Supabase
1. Crea un proyecto en https://supabase.com
2. **SQL Editor → New query**, pega el contenido de [`supabase/schema.sql`](supabase/schema.sql) y **Run**.
3. **Project Settings → API**: copia `URL`, `anon public` y `service_role`.

### 2. Variables de entorno
Copia `.env.local.example` a `.env.local` y llena:

| Variable | De dónde | Notas |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → API | pública |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → API (anon) | pública, solo lectura |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → API (service_role) | **secreta**, solo servidor |
| `UPLOAD_PASSCODE` | la eliges tú | clave para poder cargar |

### 3. Local
```bash
npm install
npm run dev
```
- Dashboard: http://localhost:3000
- Cargar: http://localhost:3000/cargar

### 4. Deploy en Vercel
1. Sube este proyecto a GitHub.
2. En Vercel: **New Project** → importa el repo.
3. **Settings → Environment Variables**: agrega las 4 variables de arriba.
4. Deploy. Comparte la URL raíz para ver; usa `/cargar` + la clave para subir.

## Uso mensual
1. Entra a `/cargar`, escribe la clave.
2. Arrastra los PDF del mes (Claro y Altice). Se leen y se muestra un resumen.
3. **Guardar en la nube**. Listo: el dashboard queda actualizado para todos.
   El próximo mes solo subes lo nuevo; se compara con lo ya guardado.

## Estructura
- `lib/parser.js` — parser de facturas (validado contra 19 PDFs reales).
- `lib/pdf-browser.js` — lectura de PDF en el navegador.
- `lib/compare.js` — comparación, formato y mapeo a/desde Supabase.
- `app/page.js` + `components/Dashboard.jsx` — dashboard (lectura).
- `app/cargar/page.js` — carga (protegida).
- `app/api/save/route.js` — guarda en Supabase con service_role (valida la clave).
- `supabase/schema.sql` — tabla + RLS.

## Revalidar el parser
```bash
npm run validate   # requiere los PDFs en la ruta del script
```
