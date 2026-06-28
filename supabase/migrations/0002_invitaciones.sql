-- ════════════════════════════════════════════════════════════════════════
-- LegalCRM Ecuador — Invitaciones de usuarios al workspace
-- ════════════════════════════════════════════════════════════════════════

create table invitaciones (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  email text not null,
  es_admin boolean not null default false,
  token uuid not null default gen_random_uuid(),
  usado boolean not null default false,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days')
);
create unique index invitaciones_token_idx on invitaciones(token);
create index invitaciones_workspace_id_idx on invitaciones(workspace_id);

alter table invitaciones enable row level security;

create policy invitaciones_select_admin on invitaciones for select
  using (workspace_id = current_workspace_id() and is_admin());

create policy invitaciones_insert_admin on invitaciones for insert
  with check (workspace_id = current_workspace_id() and is_admin());

create policy invitaciones_delete_admin on invitaciones for delete
  using (workspace_id = current_workspace_id() and is_admin());

-- Lectura pública por token (security definer) — necesaria para que alguien
-- sin sesión / sin workspace todavía pueda ver a qué se le está invitando.
create function obtener_invitacion(p_token uuid)
returns table(workspace_id uuid, workspace_nombre text, email text, es_admin boolean, usado boolean, expires_at timestamptz) as $$
  select i.workspace_id, w.nombre, i.email, i.es_admin, i.usado, i.expires_at
  from invitaciones i
  join workspaces w on w.id = i.workspace_id
  where i.token = p_token
$$ language sql stable security definer set search_path = public;

-- Acepta la invitación: crea la fila en users con el workspace/rol indicados.
create function aceptar_invitacion(p_token uuid, p_nombre text)
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

  insert into users (id, workspace_id, nombre, email, es_admin)
  values (auth.uid(), v_inv.workspace_id, p_nombre, auth.email(), v_inv.es_admin);

  update invitaciones set usado = true where id = v_inv.id;

  return v_inv.workspace_id;
end;
$$ language plpgsql security definer set search_path = public;
