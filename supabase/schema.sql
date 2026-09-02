-- ============================================================================
-- Comparador de Facturas Claro/Altice — esquema Supabase
-- Ejecuta esto en: Supabase → SQL Editor → New query → Run
-- ============================================================================

create table if not exists public.invoices (
  id           text primary key,          -- proveedor|cuenta|periodo  (ej. Claro|806274086|2026-08)
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

-- Row Level Security: lectura pública, escritura solo por service_role (bypassa RLS).
alter table public.invoices enable row level security;

drop policy if exists "lectura publica" on public.invoices;
create policy "lectura publica"
  on public.invoices for select
  to anon, authenticated
  using (true);

-- (No se crean políticas de insert/update/delete: con la anon key NO se puede escribir.
--  La carga se hace desde el servidor con la SERVICE_ROLE_KEY, que ignora RLS.)
