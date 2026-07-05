-- ── Campos de plan en workspaces ────────────────────────────────────
alter table public.workspaces
  add column if not exists plan_inicio    date,
  add column if not exists plan_monto     numeric(10,2) not null default 0;

-- ── Tabla de pagos por período ───────────────────────────────────────
create table public.suscripcion_pagos (
  id              uuid primary key default gen_random_uuid(),
  workspace_id    uuid not null references public.workspaces(id) on delete cascade,
  periodo_inicio  date not null,
  periodo_fin     date not null,
  monto           numeric(10,2) not null,
  estado          text not null default 'pendiente'
                    check (estado in ('pendiente', 'pagado', 'vencido')),
  fecha_pago      date,
  notas           text,
  created_at      timestamptz default now(),
  unique (workspace_id, periodo_inicio)
);

alter table public.suscripcion_pagos enable row level security;

-- Solo superadmin puede ver/modificar pagos
create policy "pagos_superadmin_all"
  on public.suscripcion_pagos for all using (is_superadmin());

-- ── RPC: activar plan de pago ────────────────────────────────────────
-- Cuando el admin asigna un plan pago, registra inicio y genera primer período
create or replace function public.admin_activar_plan(
  p_workspace_id uuid,
  p_plan         text,
  p_monto        numeric,
  p_inicio       date default current_date
) returns void language plpgsql security definer
set search_path = public as $$
declare
  v_fin date;
begin
  if not is_superadmin() then raise exception 'No autorizado'; end if;

  v_fin := (p_inicio + interval '1 month' - interval '1 day')::date;

  update workspaces
     set plan        = p_plan,
         plan_inicio = p_inicio,
         plan_monto  = p_monto
   where id = p_workspace_id;

  -- Insertar primer período si no existe
  insert into suscripcion_pagos (workspace_id, periodo_inicio, periodo_fin, monto)
  values (p_workspace_id, p_inicio, v_fin, p_monto)
  on conflict (workspace_id, periodo_inicio) do nothing;
end;
$$;

-- ── RPC: generar siguiente período ──────────────────────────────────
create or replace function public.admin_generar_periodo(p_workspace_id uuid)
returns void language plpgsql security definer
set search_path = public as $$
declare
  v_ultimo   date;
  v_inicio   date;
  v_fin      date;
  v_monto    numeric;
begin
  if not is_superadmin() then raise exception 'No autorizado'; end if;

  select max(periodo_inicio), w.plan_monto
    into v_ultimo, v_monto
    from suscripcion_pagos sp
    join workspaces w on w.id = sp.workspace_id
   where sp.workspace_id = p_workspace_id
   group by w.plan_monto;

  v_inicio := (v_ultimo + interval '1 month')::date;
  v_fin    := (v_inicio + interval '1 month' - interval '1 day')::date;

  insert into suscripcion_pagos (workspace_id, periodo_inicio, periodo_fin, monto)
  values (p_workspace_id, v_inicio, v_fin, v_monto)
  on conflict do nothing;
end;
$$;

-- ── RPC: marcar pago ─────────────────────────────────────────────────
create or replace function public.admin_registrar_pago(
  p_pago_id   uuid,
  p_fecha     date default current_date,
  p_notas     text default null
) returns void language plpgsql security definer
set search_path = public as $$
begin
  if not is_superadmin() then raise exception 'No autorizado'; end if;
  update suscripcion_pagos
     set estado     = 'pagado',
         fecha_pago = p_fecha,
         notas      = coalesce(p_notas, notas)
   where id = p_pago_id;
end;
$$;

-- ── RPC: resumen de facturación global ──────────────────────────────
create or replace function public.admin_billing_global()
returns json language sql stable security definer
set search_path = public as $$
  select case when is_superadmin() then json_build_object(
    'cobrado_mes',   (select coalesce(sum(monto),0) from suscripcion_pagos
                       where estado = 'pagado'
                         and date_trunc('month', fecha_pago) = date_trunc('month', current_date)),
    'pendiente_mes', (select coalesce(sum(monto),0) from suscripcion_pagos
                       where estado in ('pendiente','vencido')
                         and periodo_inicio <= current_date and periodo_fin >= current_date),
    'vencidos',      (select coalesce(sum(monto),0) from suscripcion_pagos
                       where estado = 'vencido'),
    'total_anio',    (select coalesce(sum(monto),0) from suscripcion_pagos
                       where estado = 'pagado'
                         and date_trunc('year', fecha_pago) = date_trunc('year', current_date))
  ) else null end
$$;

-- ── RPC: pagos de un workspace ───────────────────────────────────────
create or replace function public.admin_workspace_pagos(p_workspace_id uuid)
returns table(
  id             uuid,
  periodo_inicio date,
  periodo_fin    date,
  monto          numeric,
  estado         text,
  fecha_pago     date,
  notas          text
) language sql stable security definer
set search_path = public as $$
  select id, periodo_inicio, periodo_fin, monto, estado, fecha_pago, notas
    from suscripcion_pagos
   where workspace_id = p_workspace_id
     and is_superadmin()
   order by periodo_inicio desc;
$$;
