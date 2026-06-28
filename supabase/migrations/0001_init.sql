-- ════════════════════════════════════════════════════════════════════════
-- LegalCRM Ecuador — Migración inicial (Fase 1)
-- Tablas + RLS + triggers de historial + función de registro
-- Ejecutar completo en: Supabase Dashboard → SQL Editor → New query
-- ════════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ───────────────────────────────────────────────────────────────────────
-- TABLAS
-- ───────────────────────────────────────────────────────────────────────

create table workspaces (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  plan text not null default 'free',
  created_at timestamptz not null default now()
);

create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  nombre text not null,
  email text not null,
  es_admin boolean not null default false,
  created_at timestamptz not null default now()
);
create index users_workspace_id_idx on users(workspace_id);

create table casos (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  titulo text not null,
  materia text check (materia in ('civil','laboral','familia','penal','mercantil','otro')),
  estado text not null default 'nuevo' check (estado in ('nuevo','activo','en_espera','audiencia_proxima','resuelto','archivado')),
  numero_causa text,
  juzgado text,
  fecha_inicio date,
  nota_interna text,
  created_by uuid not null references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index casos_workspace_id_idx on casos(workspace_id);

create table caso_personas (
  id uuid primary key default gen_random_uuid(),
  caso_id uuid not null references casos(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  nombre_externo text,
  email_externo text,
  rol text not null check (rol in ('abogado','cliente','otro')),
  created_at timestamptz not null default now(),
  constraint caso_personas_persona_check check (user_id is not null or nombre_externo is not null)
);
create index caso_personas_caso_id_idx on caso_personas(caso_id);
create index caso_personas_user_id_idx on caso_personas(user_id);

create table documentos (
  id uuid primary key default gen_random_uuid(),
  caso_id uuid not null references casos(id) on delete cascade,
  nombre text not null,
  drive_file_id text,
  drive_url text,
  visibilidad text not null default 'privado' check (visibilidad in ('privado','compartido')),
  subido_por uuid not null references users(id),
  created_at timestamptz not null default now()
);
create index documentos_caso_id_idx on documentos(caso_id);

create table plazos (
  id uuid primary key default gen_random_uuid(),
  caso_id uuid not null references casos(id) on delete cascade,
  titulo text not null,
  descripcion text,
  fecha date not null,
  tipo text not null default 'plazo' check (tipo in ('audiencia','plazo','otro')),
  alertado boolean not null default false,
  created_at timestamptz not null default now()
);
create index plazos_caso_id_idx on plazos(caso_id);
create index plazos_fecha_idx on plazos(fecha);

create table historial (
  id uuid primary key default gen_random_uuid(),
  caso_id uuid not null references casos(id) on delete cascade,
  user_id uuid references users(id),
  accion text not null,
  detalle text,
  created_at timestamptz not null default now()
);
create index historial_caso_id_idx on historial(caso_id);

create table clientes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  nombre text not null,
  tipo text not null check (tipo in ('persona_natural','empresa')),
  email text,
  telefono text,
  estado text not null default 'activo' check (estado in ('activo','inactivo','potencial')),
  etiquetas text[] not null default '{}',
  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index clientes_workspace_id_idx on clientes(workspace_id);

create table cliente_notas (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id) on delete cascade,
  user_id uuid references users(id),
  contenido text not null,
  created_at timestamptz not null default now()
);
create index cliente_notas_cliente_id_idx on cliente_notas(cliente_id);

-- ───────────────────────────────────────────────────────────────────────
-- updated_at automático
-- ───────────────────────────────────────────────────────────────────────

create function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger casos_set_updated_at before update on casos
  for each row execute function set_updated_at();

create trigger clientes_set_updated_at before update on clientes
  for each row execute function set_updated_at();

-- ───────────────────────────────────────────────────────────────────────
-- FUNCIONES HELPER (security definer — evitan recursión en RLS)
-- ───────────────────────────────────────────────────────────────────────

create function current_workspace_id() returns uuid as $$
  select workspace_id from users where id = auth.uid()
$$ language sql stable security definer set search_path = public;

create function is_admin() returns boolean as $$
  select coalesce((select es_admin from users where id = auth.uid()), false)
$$ language sql stable security definer set search_path = public;

create function is_lawyer_on_caso(p_caso_id uuid) returns boolean as $$
  select exists (
    select 1 from caso_personas
    where caso_id = p_caso_id and user_id = auth.uid() and rol = 'abogado'
  )
$$ language sql stable security definer set search_path = public;

create function is_client_on_caso(p_caso_id uuid) returns boolean as $$
  select exists (
    select 1 from caso_personas
    where caso_id = p_caso_id and user_id = auth.uid() and rol = 'cliente'
  )
$$ language sql stable security definer set search_path = public;

create function can_view_caso(p_caso_id uuid) returns boolean as $$
  select is_admin() or is_lawyer_on_caso(p_caso_id) or is_client_on_caso(p_caso_id)
$$ language sql stable security definer set search_path = public;

-- "Personal del estudio": admin, o abogado en al menos un caso del workspace
create function is_staff() returns boolean as $$
  select is_admin() or exists (
    select 1 from caso_personas cp
    join casos c on c.id = cp.caso_id
    where cp.user_id = auth.uid() and cp.rol = 'abogado' and c.workspace_id = current_workspace_id()
  )
$$ language sql stable security definer set search_path = public;

-- ───────────────────────────────────────────────────────────────────────
-- RLS — activar en todas las tablas
-- ───────────────────────────────────────────────────────────────────────

alter table workspaces enable row level security;
alter table users enable row level security;
alter table casos enable row level security;
alter table caso_personas enable row level security;
alter table documentos enable row level security;
alter table plazos enable row level security;
alter table historial enable row level security;
alter table clientes enable row level security;
alter table cliente_notas enable row level security;

-- workspaces: solo el propio workspace
create policy workspaces_select on workspaces for select
  using (id = current_workspace_id());

-- users: visibles dentro del mismo workspace
create policy users_select on users for select
  using (workspace_id = current_workspace_id());

create policy users_update_self_or_admin on users for update
  using (id = auth.uid() or (is_admin() and workspace_id = current_workspace_id()));

create policy users_delete_admin on users for delete
  using (is_admin() and workspace_id = current_workspace_id() and id <> auth.uid());

-- casos: visibilidad según rol (admin: todos, abogado/cliente: solo asignados)
create policy casos_select on casos for select
  using (workspace_id = current_workspace_id() and can_view_caso(id));

create policy casos_insert_admin on casos for insert
  with check (workspace_id = current_workspace_id() and is_admin());

create policy casos_update on casos for update
  using (workspace_id = current_workspace_id() and (is_admin() or is_lawyer_on_caso(id)));

create policy casos_delete_admin on casos for delete
  using (workspace_id = current_workspace_id() and is_admin());

-- caso_personas: visible para quien ve el caso; gestionado por admin/abogado asignado
create policy caso_personas_select on caso_personas for select
  using (can_view_caso(caso_id));

create policy caso_personas_insert on caso_personas for insert
  with check (is_admin() or is_lawyer_on_caso(caso_id));

create policy caso_personas_update on caso_personas for update
  using (is_admin() or is_lawyer_on_caso(caso_id));

create policy caso_personas_delete on caso_personas for delete
  using (is_admin() or is_lawyer_on_caso(caso_id));

-- documentos: privados solo admin/abogado; compartidos también el cliente del caso
create policy documentos_select on documentos for select
  using (
    is_admin()
    or is_lawyer_on_caso(caso_id)
    or (visibilidad = 'compartido' and is_client_on_caso(caso_id))
  );

create policy documentos_insert on documentos for insert
  with check (is_admin() or is_lawyer_on_caso(caso_id) or is_client_on_caso(caso_id));

create policy documentos_update on documentos for update
  using (is_admin() or is_lawyer_on_caso(caso_id));

create policy documentos_delete on documentos for delete
  using (is_admin() or is_lawyer_on_caso(caso_id));

-- plazos: visibles para quien ve el caso; editables solo por admin/abogado
create policy plazos_select on plazos for select
  using (can_view_caso(caso_id));

create policy plazos_insert on plazos for insert
  with check (is_admin() or is_lawyer_on_caso(caso_id));

create policy plazos_update on plazos for update
  using (is_admin() or is_lawyer_on_caso(caso_id));

create policy plazos_delete on plazos for delete
  using (is_admin() or is_lawyer_on_caso(caso_id));

-- historial: solo lectura para quien ve el caso; las inserciones las hacen triggers (security definer)
create policy historial_select on historial for select
  using (can_view_caso(caso_id));

-- clientes: solo personal del estudio (admin o abogados del workspace)
create policy clientes_select on clientes for select
  using (workspace_id = current_workspace_id() and is_staff());

create policy clientes_insert on clientes for insert
  with check (workspace_id = current_workspace_id() and is_staff());

create policy clientes_update on clientes for update
  using (workspace_id = current_workspace_id() and is_staff());

create policy clientes_delete on clientes for delete
  using (workspace_id = current_workspace_id() and is_admin());

-- cliente_notas: mismo criterio que clientes
create policy cliente_notas_select on cliente_notas for select
  using (exists (select 1 from clientes c where c.id = cliente_id and is_staff()));

create policy cliente_notas_insert on cliente_notas for insert
  with check (exists (select 1 from clientes c where c.id = cliente_id and is_staff()));

-- ───────────────────────────────────────────────────────────────────────
-- HISTORIAL AUTOMÁTICO (triggers — corren como owner, bypass RLS)
-- ───────────────────────────────────────────────────────────────────────

create function log_caso_creado() returns trigger as $$
begin
  insert into historial (caso_id, user_id, accion, detalle)
  values (new.id, auth.uid(), 'caso_creado', 'Caso creado: ' || new.titulo);
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger casos_log_creado after insert on casos
  for each row execute function log_caso_creado();

create function log_caso_estado_cambiado() returns trigger as $$
begin
  if new.estado is distinct from old.estado then
    insert into historial (caso_id, user_id, accion, detalle)
    values (new.id, auth.uid(), 'estado_cambiado', old.estado || ' → ' || new.estado);
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger casos_log_estado after update on casos
  for each row execute function log_caso_estado_cambiado();

create function log_persona_asignada() returns trigger as $$
begin
  insert into historial (caso_id, user_id, accion, detalle)
  values (new.caso_id, auth.uid(), 'persona_asignada',
    coalesce((select nombre from users where id = new.user_id), new.nombre_externo) || ' (' || new.rol || ')');
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger caso_personas_log after insert on caso_personas
  for each row execute function log_persona_asignada();

create function log_documento_subido() returns trigger as $$
begin
  insert into historial (caso_id, user_id, accion, detalle)
  values (new.caso_id, auth.uid(), 'documento_subido', new.nombre);
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger documentos_log after insert on documentos
  for each row execute function log_documento_subido();

create function log_plazo_agregado() returns trigger as $$
begin
  insert into historial (caso_id, user_id, accion, detalle)
  values (new.caso_id, auth.uid(), 'plazo_agregado', new.titulo || ' — ' || new.fecha);
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger plazos_log after insert on plazos
  for each row execute function log_plazo_agregado();

create function log_nota_guardada() returns trigger as $$
begin
  if new.nota_interna is distinct from old.nota_interna then
    insert into historial (caso_id, user_id, accion, detalle)
    values (new.id, auth.uid(), 'nota_guardada', null);
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger casos_log_nota after update on casos
  for each row execute function log_nota_guardada();

-- ───────────────────────────────────────────────────────────────────────
-- REGISTRO: crea workspace + usuario admin en una sola transacción
-- Se llama desde el frontend justo después de supabase.auth.signUp()
-- ───────────────────────────────────────────────────────────────────────

create function registrar_workspace(p_nombre_workspace text, p_nombre_usuario text)
returns uuid as $$
declare
  v_workspace_id uuid;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;
  if exists (select 1 from users where id = auth.uid()) then
    raise exception 'El usuario ya pertenece a un workspace';
  end if;

  insert into workspaces (nombre) values (p_nombre_workspace) returning id into v_workspace_id;

  insert into users (id, workspace_id, nombre, email, es_admin)
  values (auth.uid(), v_workspace_id, p_nombre_usuario, auth.email(), true);

  return v_workspace_id;
end;
$$ language plpgsql security definer set search_path = public;
