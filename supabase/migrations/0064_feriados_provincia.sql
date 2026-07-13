-- ════════════════════════════════════════════════════════════════════════
-- Algunos feriados son locales (cantonización, fundación de ciudad,
-- provincialización) y solo afectan a una provincia específica, no a todo
-- el país. Se agrega provincia nullable: null = feriado nacional (afecta a
-- todas), un valor = feriado local de esa sola provincia.
-- ════════════════════════════════════════════════════════════════════════

alter table feriados_ecuador add column if not exists provincia text;

-- El unique(fecha) original impedía que coexistan, por ejemplo, un feriado
-- nacional y uno local de otra provincia en la misma fecha, o dos feriados
-- locales de provincias distintas el mismo día. Se reemplaza por un índice
-- único sobre (fecha, provincia) — usando coalesce porque NULL no se
-- compara como igual a sí mismo en un unique constraint normal.
alter table feriados_ecuador drop constraint if exists feriados_ecuador_fecha_key;
drop index if exists feriados_ecuador_fecha_provincia_idx;
create unique index feriados_ecuador_fecha_provincia_idx
  on feriados_ecuador (fecha, coalesce(provincia, ''));

create or replace function admin_upsert_feriado(
  p_fecha date,
  p_nombre text,
  p_verificado boolean,
  p_provincia text default null
)
returns void as $$
begin
  if not is_superadmin() then
    raise exception 'No autorizado';
  end if;
  insert into feriados_ecuador (fecha, nombre, verificado, provincia, actualizado_por)
  values (p_fecha, p_nombre, p_verificado, p_provincia, auth.uid())
  on conflict (fecha, coalesce(provincia, '')) do update
    set nombre = excluded.nombre, verificado = excluded.verificado,
        provincia = excluded.provincia, actualizado_en = now(), actualizado_por = auth.uid();
end;
$$ language plpgsql security definer set search_path = public;
