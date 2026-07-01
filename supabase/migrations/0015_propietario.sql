-- ── Protección del usuario propietario ────────────────────────────────────
-- El primer usuario que crea el workspace es el propietario.
-- Su rol no puede cambiarse y no puede ser eliminado.

-- 1. Agregar columna es_propietario
alter table users add column if not exists es_propietario boolean not null default false;

-- 2. Marcar como propietario al primer admin de cada workspace (el que registró el workspace)
--    Usamos el usuario con created_at más antiguo dentro de cada workspace que sea administrador
update users u
set es_propietario = true
where u.rol = 'administrador'
  and u.created_at = (
    select min(u2.created_at)
    from users u2
    where u2.workspace_id = u.workspace_id
  );

-- 3. Trigger que impide cambiar rol o eliminar al propietario
create or replace function proteger_propietario()
returns trigger as $$
begin
  if OLD.es_propietario = true then
    if TG_OP = 'DELETE' then
      raise exception 'No se puede eliminar al propietario del workspace.';
    end if;
    if NEW.rol <> OLD.rol then
      raise exception 'No se puede cambiar el rol del propietario del workspace.';
    end if;
    if NEW.es_propietario = false then
      raise exception 'No se puede quitar el estado de propietario.';
    end if;
  end if;
  return NEW;
end;
$$ language plpgsql;

drop trigger if exists tg_proteger_propietario on users;
create trigger tg_proteger_propietario
  before update or delete on users
  for each row execute function proteger_propietario();

-- 4. Actualizar registrar_workspace para marcar al fundador como propietario
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

  insert into users (id, workspace_id, nombre, email, rol, es_propietario)
  values (auth.uid(), v_workspace_id, p_nombre_usuario, auth.email(), 'administrador', true);

  return v_workspace_id;
end;
$$ language plpgsql security definer set search_path = public;
