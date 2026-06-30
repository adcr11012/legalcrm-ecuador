-- ════════════════════════════════════════════════════════════════════════
-- TSADOQ — Sistema de roles: administrador / master / limitado
-- + last_seen_at para visibilidad de actividad
-- ════════════════════════════════════════════════════════════════════════

-- ── 1. Columna rol en users ──────────────────────────────────────────────
alter table users
  add column rol text not null default 'master'
    check (rol in ('administrador', 'master', 'limitado'));

alter table users
  add column last_seen_at timestamptz;

-- ── 2. Migrar datos existentes ───────────────────────────────────────────
update users set rol = 'administrador' where es_admin = true;
update users set rol = 'master'        where es_admin = false;

-- ── 3. Eliminar columna es_admin de users ────────────────────────────────
alter table users drop column es_admin;

-- ── 4. Columna rol en invitaciones ───────────────────────────────────────
alter table invitaciones
  add column rol text not null default 'master'
    check (rol in ('administrador', 'master', 'limitado'));

update invitaciones set rol = 'administrador' where es_admin = true;
update invitaciones set rol = 'master'        where es_admin = false;

alter table invitaciones drop column es_admin;

-- ── 5. Actualizar funciones helper ───────────────────────────────────────
create or replace function is_admin() returns boolean as $$
  select coalesce((select rol = 'administrador' from users where id = auth.uid()), false)
$$ language sql stable security definer set search_path = public;

create or replace function is_master() returns boolean as $$
  select coalesce((select rol in ('administrador','master') from users where id = auth.uid()), false)
$$ language sql stable security definer set search_path = public;

-- can_view_caso: master/admin ven todos; limitado solo los asignados
create or replace function can_view_caso(p_caso_id uuid) returns boolean as $$
  select is_master()
      or is_lawyer_on_caso(p_caso_id)
      or is_client_on_caso(p_caso_id)
$$ language sql stable security definer set search_path = public;

-- is_staff: cualquier miembro del workspace (para acceso a clientes)
create or replace function is_staff() returns boolean as $$
  select current_workspace_id() is not null
$$ language sql stable security definer set search_path = public;

-- ── 6. Actualizar policies de casos ──────────────────────────────────────
-- Crear casos: cualquier miembro del workspace
drop policy casos_insert_admin on casos;
create policy casos_insert on casos for insert
  with check (workspace_id = current_workspace_id());

-- Editar casos: admin, master, o abogado asignado al caso
drop policy casos_update on casos;
create policy casos_update on casos for update
  using (workspace_id = current_workspace_id()
    and (is_master() or is_lawyer_on_caso(id)));

-- ── 7. Actualizar registrar_workspace ────────────────────────────────────
create or replace function registrar_workspace(p_nombre_workspace text, p_nombre_usuario text)
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

  insert into users (id, workspace_id, nombre, email, rol)
  values (auth.uid(), v_workspace_id, p_nombre_usuario, auth.email(), 'administrador');

  return v_workspace_id;
end;
$$ language plpgsql security definer set search_path = public;

-- ── 8. Actualizar obtener_invitacion ─────────────────────────────────────
create or replace function obtener_invitacion(p_token uuid)
returns table(
  workspace_id uuid,
  workspace_nombre text,
  email text,
  rol text,
  usado boolean,
  expires_at timestamptz
) as $$
  select i.workspace_id, w.nombre, i.email, i.rol, i.usado, i.expires_at
  from invitaciones i
  join workspaces w on w.id = i.workspace_id
  where i.token = p_token
$$ language sql stable security definer set search_path = public;

-- ── 9. Actualizar aceptar_invitacion ─────────────────────────────────────
create or replace function aceptar_invitacion(p_token uuid, p_nombre text)
returns uuid as $$
declare
  v_inv invitaciones;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;

  select * into v_inv from invitaciones where token = p_token for update;

  if v_inv is null then
    raise exception 'Invitación no válida';
  end if;
  if v_inv.usado then
    raise exception 'Esta invitación ya fue utilizada';
  end if;
  if v_inv.expires_at < now() then
    raise exception 'Esta invitación expiró';
  end if;
  if exists (select 1 from users where id = auth.uid()) then
    raise exception 'Ya perteneces a un workspace';
  end if;

  insert into users (id, workspace_id, nombre, email, rol)
  values (auth.uid(), v_inv.workspace_id, p_nombre, auth.email(), v_inv.rol);

  update invitaciones set usado = true where id = v_inv.id;

  return v_inv.workspace_id;
end;
$$ language plpgsql security definer set search_path = public;
