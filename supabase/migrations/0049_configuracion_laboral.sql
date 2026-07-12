-- ════════════════════════════════════════════════════════════════════════
-- Valores legales que cambian con el tiempo (SBU) para la calculadora de
-- liquidación laboral. Una sola fila, compartida por TODOS los workspaces
-- (el SBU es un valor nacional, no algo que cada despacho deba definir por
-- su cuenta) — editable solo por el superadmin, visible para cualquier
-- usuario autenticado (necesitan leerlo para calcular).
-- ════════════════════════════════════════════════════════════════════════

create table configuracion_laboral (
  id boolean primary key default true check (id),
  sbu numeric(10,2) not null,
  actualizado_en timestamptz not null default now(),
  actualizado_por uuid references users(id)
);

insert into configuracion_laboral (id, sbu) values (true, 482.00);

alter table configuracion_laboral enable row level security;

create policy configuracion_laboral_select on configuracion_laboral for select
  using (true);

create policy configuracion_laboral_update on configuracion_laboral for update
  using (is_superadmin())
  with check (is_superadmin());
