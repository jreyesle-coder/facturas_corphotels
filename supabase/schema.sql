-- ============================================================================
-- Comparador de Facturas CORPHOTELS — esquema Supabase (multi-servicio)
-- Ejecuta en: Supabase → SQL Editor → New query → Run
-- Es idempotente: puedes correrlo de nuevo sin romper nada.
-- ============================================================================

create table if not exists public.invoices (
  id           text primary key,          -- servicio|proveedor|cuenta|periodo
  service_type text not null default 'telefonia',  -- telefonia|electricidad|agua|aseo|internet|otro
  provider     text not null,
  account      text not null,
  client_name  text,
  invoice_no   text,
  period_key   text not null,             -- 'YYYY-MM'
  period_label text not null,             -- 'Ago 2026'
  invoice_date date,
  sort_key     integer not null,          -- año*100 + mes
  due_date     date,                       -- fecha de vencimiento (para alertas)
  paid         boolean not null default false,
  entry_mode   text not null default 'auto',  -- 'auto' (PDF) | 'manual'
  balance_prev numeric,
  payments     numeric,
  adjustments  numeric,
  arrears      numeric,
  subtotal     numeric,
  itbis        numeric,
  cdt          numeric,
  isc          numeric,
  month_charge numeric,
  total_to_pay numeric,
  line_items   jsonb not null default '[]'::jsonb,
  updated_at   timestamptz not null default now()
);

-- Columnas nuevas si la tabla ya existía (migración de la versión telefonía).
alter table public.invoices add column if not exists service_type text not null default 'telefonia';
alter table public.invoices add column if not exists due_date   date;
alter table public.invoices add column if not exists paid       boolean not null default false;
alter table public.invoices add column if not exists entry_mode text not null default 'auto';

-- Re-ID de filas viejas (id de 3 partes -> 4 partes con el prefijo del servicio).
update public.invoices
   set id = 'telefonia|' || id
 where id not like '%|%|%|%';   -- las viejas tienen solo 2 barras

create index if not exists invoices_service_idx on public.invoices (service_type, provider, account, sort_key);
create index if not exists invoices_due_idx on public.invoices (due_date);

-- RLS: lectura solo autenticados; escritura solo service_role (vía /api).
alter table public.invoices enable row level security;
drop policy if exists "lectura autenticada" on public.invoices;
create policy "lectura autenticada"
  on public.invoices for select to authenticated using (true);

-- ============================================================================
-- USUARIOS Y ROLES (si no lo has hecho)
-- Authentication → Users → Add user (Auto Confirm), luego:
--   update auth.users set raw_app_meta_data = coalesce(raw_app_meta_data,'{}'::jsonb) || '{"role":"tecnologia"}'::jsonb where email='...';
--   update auth.users set raw_app_meta_data = coalesce(raw_app_meta_data,'{}'::jsonb) || '{"role":"gerencia"}'::jsonb   where email='...';
-- ============================================================================
