-- ════════════════════════════════════════════════════════════════════════
-- LegalCRM Ecuador — Creación y completitud de casos
-- ════════════════════════════════════════════════════════════════════════

-- Ampliar el catálogo de materias.
alter table casos drop constraint if exists casos_materia_check;
alter table casos add constraint casos_materia_check check (materia in (
  'civil','mercantil','laboral','familia','penal','transito','inquilinato',
  'contencioso_administrativo','contencioso_tributario','constitucional','asesoria','otro'
));

-- Campos de creación rápida.
alter table casos add column tipo_accion text;
alter table casos add column cliente_id uuid references clientes(id);
create index casos_cliente_id_idx on casos(cliente_id);

-- Partes del proceso.
alter table casos add column es_contencioso boolean not null default true;
alter table casos add column rol_cliente text;
alter table casos add column contraparte_nombre text;
alter table casos add column contraparte_cedula text;
alter table casos add column contraparte_abogado text;

-- Datos judiciales.
alter table casos add column demanda_presentada boolean not null default false;
alter table casos add column fecha_citacion date;
alter table casos add column cuantia numeric;

-- Instancia procesal.
alter table casos add column instancia_actual text not null default 'primera_instancia';

-- Honorarios.
alter table casos add column honorarios_tipo text;
alter table casos add column honorarios_monto numeric;
alter table casos add column honorarios_forma_pago text;
alter table casos add column honorarios_notas text;

-- Baja friccion: cualquier miembro del workspace (admin o abogado invitado)
-- puede crear casos, no solo el admin.
drop policy if exists casos_insert_admin on casos;
create policy casos_insert_staff on casos for insert
  with check (workspace_id = current_workspace_id());

-- Historial automático al avanzar de instancia.
create function log_instancia_cambiada() returns trigger as $$
begin
  if new.instancia_actual is distinct from old.instancia_actual then
    insert into historial (caso_id, user_id, accion, detalle)
    values (new.id, auth.uid(), 'instancia_cambiada', old.instancia_actual || ' → ' || new.instancia_actual);
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger casos_log_instancia after update on casos
  for each row execute function log_instancia_cambiada();
