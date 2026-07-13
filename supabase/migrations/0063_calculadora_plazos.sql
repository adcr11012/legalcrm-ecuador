-- ════════════════════════════════════════════════════════════════════════
-- Calculadora de plazos procesales (COGEP): cuenta días hábiles desde una
-- fecha de notificación, excluyendo fines de semana, feriados nacionales
-- y (opcionalmente) los períodos de vacancia judicial.
--
-- feriados_ecuador: tabla global editable por superadmin (mismo patrón que
-- configuracion_laboral/SBU) — los feriados se trasladan por decreto cada
-- año (Ley de recuperación de feriados), no son una fecha fija indefinida.
-- ════════════════════════════════════════════════════════════════════════

create table if not exists feriados_ecuador (
  id             uuid primary key default gen_random_uuid(),
  fecha          date not null unique,
  nombre         text not null,
  verificado     boolean not null default false,
  actualizado_en timestamptz not null default now(),
  actualizado_por uuid references users(id)
);

alter table feriados_ecuador enable row level security;

create policy feriados_ecuador_select on feriados_ecuador for select
  using (true);

create policy feriados_ecuador_admin_write on feriados_ecuador for all
  using (is_superadmin())
  with check (is_superadmin());

-- Calendario 2026 sembrado a partir de fuentes públicas (Viceministerio de
-- Turismo / prensa nacional) — marcado como NO verificado. Un superadmin
-- debe confirmarlo o corregirlo desde /admin/plazos antes de confiar en él
-- para cómputo de términos reales.
insert into feriados_ecuador (fecha, nombre, verificado) values
  ('2026-01-01', 'Año Nuevo', false),
  ('2026-01-02', 'Año Nuevo (traslado)', false),
  ('2026-02-16', 'Carnaval', false),
  ('2026-02-17', 'Carnaval', false),
  ('2026-04-03', 'Viernes Santo', false),
  ('2026-04-30', 'Día no laborable (Decreto Ejecutivo 354, puente)', false),
  ('2026-05-01', 'Día del Trabajo', false),
  ('2026-05-25', 'Batalla de Pichincha (traslado)', false),
  ('2026-08-10', 'Primer Grito de la Independencia', false),
  ('2026-10-09', 'Independencia de Guayaquil', false),
  ('2026-11-02', 'Día de los Difuntos', false),
  ('2026-11-03', 'Independencia de Cuenca', false),
  ('2026-12-25', 'Navidad', false)
on conflict (fecha) do nothing;

-- ── RPCs de gestión (superadmin) ─────────────────────────────────────
create or replace function admin_upsert_feriado(p_fecha date, p_nombre text, p_verificado boolean)
returns void as $$
begin
  if not is_superadmin() then
    raise exception 'No autorizado';
  end if;
  insert into feriados_ecuador (fecha, nombre, verificado, actualizado_por)
  values (p_fecha, p_nombre, p_verificado, auth.uid())
  on conflict (fecha) do update
    set nombre = excluded.nombre, verificado = excluded.verificado,
        actualizado_en = now(), actualizado_por = auth.uid();
end;
$$ language plpgsql security definer set search_path = public;

create or replace function admin_eliminar_feriado(p_id uuid)
returns void as $$
begin
  if not is_superadmin() then
    raise exception 'No autorizado';
  end if;
  delete from feriados_ecuador where id = p_id;
end;
$$ language plpgsql security definer set search_path = public;
