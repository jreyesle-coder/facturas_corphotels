-- ============================================================================
-- Comparador de Facturas Claro/Altice — esquema Supabase (con autenticación)
-- Ejecuta en: Supabase → SQL Editor → New query → Run
-- ============================================================================

create table if not exists public.invoices (
  id           text primary key,          -- proveedor|cuenta|periodo (ej. Claro|806274086|2026-08)
  provider     text not null,             -- 'Claro' | 'Altice'
  account      text not null,
  client_name  text,
  invoice_no   text,
  period_key   text not null,             -- 'YYYY-MM'
  period_label text not null,             -- 'Ago 2026'
  invoice_date date,
  sort_key     integer not null,          -- año*100 + mes (para ordenar)
  balance_prev numeric,
  payments     numeric,
  adjustments  numeric,
  arrears      numeric,
  subtotal     numeric,
  itbis        numeric,
  cdt          numeric,
  isc          numeric,
  month_charge numeric,                   -- métrica principal de comparación
  total_to_pay numeric,
  line_items   jsonb not null default '[]'::jsonb,
  updated_at   timestamptz not null default now()
);

create index if not exists invoices_provider_account_idx on public.invoices (provider, account, sort_key);

-- Row Level Security: lectura solo para usuarios autenticados; escritura solo service_role.
alter table public.invoices enable row level security;

drop policy if exists "lectura autenticada" on public.invoices;
create policy "lectura autenticada"
  on public.invoices for select
  to authenticated
  using (true);

-- (No hay políticas de insert/update/delete: ni gerencia ni tecnología escriben con la anon key.
--  La carga la hace el servidor con la SERVICE_ROLE_KEY, tras validar el rol 'tecnologia'.)

-- ============================================================================
-- USUARIOS Y ROLES
-- 1) Crea los dos usuarios en: Authentication → Users → Add user
--    (con correo y clave; marca "Auto Confirm User").
--       ej.  gerencia@tuempresa.com     (rol gerencia)
--            tecnologia@tuempresa.com    (rol tecnologia)
--
-- 2) Asigna el rol en app_metadata (ejecuta esto cambiando los correos):
-- ============================================================================

update auth.users
   set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"tecnologia"}'::jsonb
 where email = 'tecnologia@tuempresa.com';

update auth.users
   set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"gerencia"}'::jsonb
 where email = 'gerencia@tuempresa.com';

-- Verifica:
-- select email, raw_app_meta_data->>'role' as rol from auth.users;
