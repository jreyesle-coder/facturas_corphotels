# Gestión de Facturas de Servicios — CORPHOTELS

App Next.js para gestionar las facturas de **servicios recurrentes** de CORPHOTELS
(telefonía, electricidad, agua, aseo, internet…): compara cada factura con el mes
anterior, guarda el historial y controla las **fechas de vencimiento**.

- **Pestañas por servicio** (📞 Telefonía, ⚡ Electricidad, 💧 Agua, 🗑️ Aseo, 🌐 Internet, Otro).
- **Comparación** mes a mes por cuenta + **Historial** (tendencia) por servicio.
- **Vencimientos:** lista por fecha de pago con alertas (vencida / por vencer / al día) y marcar pagada.
- **Hallazgos** + **informe imprimible** (PDF) con las variaciones.
- **Login por roles:** `gerencia` (ve) y `tecnología` (ve + carga).
- Línea gráfica oficial CORPHOTELS (azul media noche #1A4072, rojo caribe #EB282E, Futura PT).

## Carga de datos (híbrido)
- **Lectura automática de PDF** (en el navegador; solo viaja la data extraída):
  - **Claro** y **Altice** (telefonía), **Edenorte** (electricidad).
  - Para agregar un proveedor nuevo (Edesur, Edeeste, CAASD, ayuntamiento…): envíame **una factura de muestra** y agrego su lector.
- **Captura manual** para cualquier servicio: formulario con servicio, proveedor, cuenta, mes, cargo del mes, total a pagar y vencimiento.

## Puesta en marcha

### 1. Supabase
1. **SQL Editor → New query**, pega [`supabase/schema.sql`](supabase/schema.sql) y **Run**.
   - Es **idempotente**: si ya tenías la versión anterior, agrega las columnas nuevas
     (`service_type`, `due_date`, `paid`, `entry_mode`) y migra los `id` existentes. **Vuélvelo a correr tras actualizar.**
2. **Authentication → Users**: crea los usuarios (Auto Confirm) y asigna roles con los `update auth.users …` del final del schema.
3. **Project Settings → API**: copia `URL`, `anon public` y `service_role`.

### 2. Variables de entorno (`.env.local` / Vercel)
| Variable | De dónde |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → API (anon) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → API (service_role) — **secreta** |

### 3. Local / Deploy
```bash
npm install && npm run dev   # http://localhost:3000
```
Deploy: push a GitHub → Vercel importa el repo → agrega las 3 variables → Deploy.
**Importante en Vercel:** deja **Deployment Protection = Disabled** (la app tiene su propio login).

## Estructura
- `lib/parser.js` — lectores de PDF (Claro, Altice, Edenorte). `lib/services.js` — catálogo de servicios.
- `lib/compare.js` — comparación/formato; `lib/findings.js` — hallazgos + informe.
- `components/` — DashboardComparacion, Historial, Vencimientos, ServiceTabs, Nav.
- `app/(app)/` — `/` Comparación, `/historial`, `/vencimientos`, `/cargar` (tecnología).
- `app/api/save` (upsert) y `app/api/mark-paid` (marcar pagada) — validan rol tecnología.
- `supabase/schema.sql` — tabla, RLS, migración y roles.
