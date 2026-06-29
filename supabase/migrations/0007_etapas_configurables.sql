-- ════════════════════════════════════════════════════════════════════════
-- Etapas de caso configurables (reemplaza el enum fijo de "estado" para
-- el tablero Kanban y la vista de detalle; el flujo se define por workspace)
-- ════════════════════════════════════════════════════════════════════════

create table etapas (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  nombre text not null,
  color text not null default 'neutral' check (color in ('neutral','accent','warn','danger','success','purple')),
  es_terminal boolean not null default false,
  posicion int not null,
  created_at timestamptz not null default now()
);

create index etapas_workspace_id_idx on etapas(workspace_id);

alter table etapas enable row level security;

create policy etapas_select on etapas for select
  using (workspace_id = current_workspace_id());

create policy etapas_admin_write on etapas for all
  using (workspace_id = current_workspace_id() and is_admin())
  with check (workspace_id = current_workspace_id() and is_admin());

alter table casos add column etapa_id uuid references etapas(id);
create index casos_etapa_id_idx on casos(etapa_id);

-- Etapas por defecto para cada workspace existente, replicando el flujo anterior.
insert into etapas (workspace_id, nombre, color, es_terminal, posicion)
select id, v.nombre, v.color, v.es_terminal, v.posicion
from workspaces
cross join (values
  ('Nuevo', 'neutral', false, 1),
  ('Activo', 'accent', false, 2),
  ('En espera', 'warn', false, 3),
  ('Audiencia próxima', 'danger', false, 4),
  ('Resuelto', 'success', true, 5),
  ('Archivado', 'neutral', true, 6)
) as v(nombre, color, es_terminal, posicion);

-- Vincula cada caso existente a la etapa equivalente de su workspace.
update casos c
set etapa_id = e.id
from etapas e
where e.workspace_id = c.workspace_id
  and (
    (c.estado = 'nuevo' and e.nombre = 'Nuevo') or
    (c.estado = 'activo' and e.nombre = 'Activo') or
    (c.estado = 'en_espera' and e.nombre = 'En espera') or
    (c.estado = 'audiencia_proxima' and e.nombre = 'Audiencia próxima') or
    (c.estado = 'resuelto' and e.nombre = 'Resuelto') or
    (c.estado = 'archivado' and e.nombre = 'Archivado')
  );

-- Asigna automáticamente la primera etapa del workspace a los casos nuevos
-- que no especifiquen una (baja friccion al crear).
create function asignar_etapa_default() returns trigger as $$
begin
  if new.etapa_id is null then
    select id into new.etapa_id from etapas
    where workspace_id = new.workspace_id
    order by posicion asc
    limit 1;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger casos_etapa_default before insert on casos
  for each row execute function asignar_etapa_default();

-- Historial automático al mover un caso de etapa.
create function log_etapa_cambiada() returns trigger as $$
declare
  nombre_anterior text;
  nombre_nuevo text;
begin
  if new.etapa_id is distinct from old.etapa_id then
    select nombre into nombre_anterior from etapas where id = old.etapa_id;
    select nombre into nombre_nuevo from etapas where id = new.etapa_id;
    insert into historial (caso_id, user_id, accion, detalle)
    values (new.id, auth.uid(), 'etapa_cambiada', coalesce(nombre_anterior, '—') || ' → ' || coalesce(nombre_nuevo, '—'));
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger casos_log_etapa after update on casos
  for each row execute function log_etapa_cambiada();
