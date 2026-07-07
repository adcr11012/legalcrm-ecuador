-- ════════════════════════════════════════════════════════════════════════
-- Grupos de usuarios (equipos): permiten agrupar abogados/asistentes
-- para asignar casos a un equipo completo en lugar de persona por persona.
-- ════════════════════════════════════════════════════════════════════════

create table grupos (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  nombre text not null,
  created_at timestamptz not null default now()
);

create index grupos_workspace_id_idx on grupos(workspace_id);

alter table grupos enable row level security;

create policy grupos_select on grupos for select
  using (workspace_id = current_workspace_id());

create policy grupos_admin_write on grupos for all
  using (workspace_id = current_workspace_id() and is_admin())
  with check (workspace_id = current_workspace_id() and is_admin());

create table grupo_usuarios (
  grupo_id uuid not null references grupos(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  primary key (grupo_id, user_id)
);

alter table grupo_usuarios enable row level security;

create policy grupo_usuarios_select on grupo_usuarios for select
  using (exists (select 1 from grupos g where g.id = grupo_id and g.workspace_id = current_workspace_id()));

create policy grupo_usuarios_admin_write on grupo_usuarios for all
  using (exists (select 1 from grupos g where g.id = grupo_id and g.workspace_id = current_workspace_id() and is_admin()))
  with check (exists (select 1 from grupos g where g.id = grupo_id and g.workspace_id = current_workspace_id() and is_admin()));
